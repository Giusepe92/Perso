# Rosetta FinOps — Drill-Down Guide (Driven by Example)

> Objectif : expliquer clairement la logique du drill-down  
> (fonctionnel → requêtes → impact sur les Materialized Views)  
> Document pédagogique à partager avec l’équipe.

---

# 1. Le principe du Drill-Down (version simple)

Un **drill-down** =

1. On part d’une vue globale  
2. On clique sur un élément  
3. On descend à un niveau plus détaillé  
4. On garde toujours le filtre parent

Formule mentale :

Drill-down = WHERE (parent) + GROUP BY (niveau enfant)

---

# 2. Exemple 1 — Dashboard → Domaine → Application → Produit

## Niveau 0 — Dashboard global

Affichage :

Open         72k €  
Kubernetes   38k €  
Réseau       17k €  

### Logique fonctionnelle

- Filtre : month = 2026-03
- Pricing view = PV_2026Q1
- Group by = domain

### Requête conceptuelle

SELECT domain, SUM(quantity * unit_price)
WHERE month = M AND pricing_view = PV
GROUP BY domain

### Materialized View utilisée

MV_CONSO_DOMAIN_PRODUCT_MONTH

Grain :
(month, domain_id, product_id)

Pourquoi on garde product_id ?  
Parce que le pricing view s’applique à la volée.

---

## Niveau 1 — Clique sur "Open"

Affichage :

Application A   15k €  
Application B   12k €  
Application C   8k €  

### Logique

- Filtre parent : domain = Open
- Filtre global : month = M
- Group by = application

### Requête conceptuelle

SELECT app, SUM(quantity * unit_price)
WHERE month = M
AND domain = Open
GROUP BY app

### MV utilisée

MV_CONSO_APP_PRODUCT_MONTH

Grain :
(month, app_id, product_id)

Pourquoi ?  
Parce qu’on veut pouvoir descendre encore au produit.

---

## Niveau 2 — Clique sur Application A

Affichage :

PROD       8k €  
HORS_PROD  7k €  

### Logique

- Filtre parent :
  domain = Open
  app = A
- Group by = environment

### Requête conceptuelle

SELECT env, SUM(quantity * unit_price)
WHERE month = M
AND domain = Open
AND app = A
GROUP BY env

### MV utilisée

MV_CONSO_APP_PRODUCT_MONTH
(si env est dans le grain)

Grain :
(month, app_id, product_id, environment_key)

---

## Niveau 3 — Clique sur PROD

Affichage :

Disque VM   4.8k €  
CPU VM      3.4k €  

### Logique

- Filtre parent :
  domain = Open
  app = A
  env = PROD
- Group by = product

### Requête conceptuelle

SELECT product, quantity, quantity * unit_price
WHERE month = M
AND domain = Open
AND app = A
AND env = PROD

Pas besoin de nouvelle MV :
on exploite le grain existant.

---

# 3. Exemple 2 — Historique global

Affichage :

Oct   111k €  
Nov   114k €  
Dec   120k €  
Jan   121k €  
Feb   125k €  
Mar   128k €  

### Logique

- Filtre : pricing_view = PV
- Group by : month

### MV utilisée

MV_CONSO_TOTAL_PRODUCT_MONTH

Grain :
(month, product_id)

On garde product_id pour appliquer pricing view dynamiquement.

---

# 4. Exemple 3 — Vue Domaine avec familles

Vue Domaine Open :

Famille VM    50k €  
Famille DB    22k €  

### Logique

- Filtre parent : domain = Open
- Group by : family

### Requête conceptuelle

SELECT family, SUM(quantity * unit_price)
WHERE month = M
AND domain = Open
GROUP BY family

### MV utilisée

MV_CONSO_DOMAIN_PRODUCT_MONTH

On joint dim_product pour récupérer family_id.

---

# 5. Comment raisonner pour chaque nouveau drill-down

Étape 1 — Décrire l’écran
- Quelle métrique ? (coût ? conso ?)
- Quels filtres ?
- Quel group-by final ?

Étape 2 — Vérifier le filtre parent
Toujours conserver les niveaux supérieurs.

Étape 3 — Vérifier si product_id est nécessaire
Si pricing view dynamique → oui.

Étape 4 — Choisir la MV adaptée
On choisit la MV dont le grain contient :
- les filtres
- le group-by final
- product_id (si coût dynamique)

Si aucune MV ne correspond :
→ créer une nouvelle MV "serving"

---

# 6. Ce qu’il faut retenir

1. Le drill-down n’est qu’un enchaînement logique de filtres.
2. Chaque niveau garde le filtre parent.
3. Les MVs servent à pré-agréger au bon grain.
4. On ne supprime jamais une dimension nécessaire aux niveaux inférieurs.
5. Le coût reste toujours :
   quantity × unit_price

---

# 7. Résumé visuel

Niveau 0 :
GROUP BY domain

Niveau 1 :
WHERE domain = X
GROUP BY app

Niveau 2 :
WHERE domain = X AND app = Y
GROUP BY env

Niveau 3 :
WHERE domain = X AND app = Y AND env = Z
GROUP BY product

Drill-down = WHERE parent + GROUP BY enfant

---

Fin du guide.
