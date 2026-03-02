# Process d’implémentation du module FinOps (V1 cible) — Guide de travail (Data Contract → MVs → API → UI)

> Objectif : vous guider **pas à pas** (toi + dev) pour passer du POC à une implémentation industrialisée :  
> **raw → facts/dimensions (Postgre) → materialized views “serving” → APIs → dashboards/drill-down**.  
> Le focus de ce document : **comment raisonner**, avec **petits exemples de résultats attendus** (pas de code).

---

## 0) Pré-requis et cadre de la séance (30–60 min)

### 0.1 Ce que vous devez avoir sous la main
- La liste des **domaines** à livrer en V1 (ex : `Open`, `Kubernetes`, `Réseau (indirect)`)
- La liste des **produits** et leur rattachement : `Produit → Famille → Domaine` (et les cas “Produit directement sous Domaine” pour l’indirect)
- Les **règles de calcul** (même grossières) : direct vs indirect, présence d’environnement, etc.
- Le périmètre UI V1 : **dashboard global + drill-down Domaine + drill-down Application** (défini plus bas)

### 0.2 Rappel des règles d’or (à coller en haut du tableau Jira)
1) **Les faits portent la granularité maximale utile.**  
2) Les **MVs servent l’UI** : elles retirent des dimensions inutiles, sans casser le calcul.
3) Si on veut la **pricing view à la volée**, alors on **ne perd jamais `product_id`** avant la multiplication.
4) Un **drill-down = 1 filtre parent + 1 dimension de plus** (ou un group-by différent).
5) On crée des MVs par **familles de requêtes**, pas “une MV par widget”.

---

## 1) Étape 1 — Fixer le périmètre fonctionnel V1 (1h)

### 1.1 Les écrans / vues V1 (minimum vital)
**A. Dashboard global (mois M + pricing view PV)**
- A1. Répartition des **coûts par domaine** (bar/pie)
- A2. **Top applications** (liste scrollable)
- A3. **Historique du coût total** (courbe 6–12 mois)

**B. Vue Domaine (D, mois M + PV)**
- B1. Coût total du domaine
- B2. Applications du domaine (top / liste)
- B3. Si applicable : **répartition par environnement** (env list)
- B4. Si applicable : **familles** du domaine + drill-down produits

**C. Vue Application (A, mois M + PV)**
- C1. Coût total de l’application
- C2. Répartition par **domaine**
- C3. Drill-down : **domaine → environnement (si dispo) → produits**
- C4. Écran “détails ligne” (option V1) : un produit et ses metadata (si dispo)

> Résultat attendu : une liste “officielle” des vues, validée et stable pour le sprint.

### 1.2 Comment raisonner sur une vue (template de question)
Pour chaque widget / vue, écrire :
- **Metric** : coût ? conso ? poids ?
- **Filtres** : month ? domain ? app ? env ?
- **Group-by final** : par domaine ? par app ? par mois ? par env ? par produit ?
- **Nécessaire au pricing** : ai-je besoin de `product_id` ? (si coût à la volée : oui)

**Mini-exemple :**  
Widget A1 “répartition coûts par domaine”  
- Metric : **coût**
- Filtres : `month = M`, `pricing_view = PV`
- Group-by final : `domain`
- Pricing : oui → garder `product_id` au moins jusqu’au join pricing

---

## 2) Étape 2 — Définir le Data Contract (Postgre DataMart) (0.5–1 jour)

### 2.1 Le principe “fait / dimensions” à garder en tête
- **Fact = événements de consommation** (quantité / poids) au grain le plus fin utile
- **Dimensions = référentiels** (domaines, familles, produits, applications, périodes, pricing views…)
- **Les MVs ne remplacent pas la fact** : elles la “compressent” pour servir l’UI

### 2.2 Grain recommandé de la fact (V1)
**`fact_consumption`** (données normalisées mensuelles)  
Grain mental :
- `month`
- `app_id`
- `product_id`
- `environment_key` *(nullable)*
- `quantity` *(ou “weight” si indirect)*

> Si demain vous ajoutez “cluster” ou “server”, vous ne cassez pas tout :  
> vous ajoutez un pivot (ex `granularity_label/granularity_value`) OU une table de détails (voir §7).

### 2.3 Comment traiter “direct” vs “indirect” sans casser le modèle
- **Direct** : `quantity` = nb d’UO consommées pour un produit
- **Indirect** : `quantity` = **poids / coefficient** (une quantité “abstraite”)
  - le domaine indirect peut être modélisé comme un **produit unique** rattaché directement au domaine
  - ainsi, tout reste : `quantity × unit_price`

**Mini-exemple de résultat attendu (pas de code)**

`dim_domain`
| domain_id | name        | mode      |
|----------|-------------|-----------|
| D_OPEN   | Open        | DIRECT    |
| D_NET    | Réseau      | INDIRECT  |

`dim_product`
| product_id | name                 | domain_id | family_id |
|-----------|----------------------|----------|----------|
| P_VM_DISK | Disque VM            | D_OPEN   | F_VM     |
| P_VM_CPU  | CPU VM               | D_OPEN   | F_VM     |
| P_NET_BUD | Budget Réseau (UO*)  | D_NET    | NULL     |

`fact_consumption` (mois 2026-03)
| month   | app_id | product_id | env  | quantity |
|---------|--------|------------|------|----------|
| 2026-03 | APP_A  | P_VM_DISK   | PROD | 120      |
| 2026-03 | APP_A  | P_VM_CPU    | PROD | 40       |
| 2026-03 | APP_A  | P_NET_BUD   | NULL | 0.12     |

*(P_NET_BUD = produit “abstrait” du domaine indirect, quantity = poids/coef)*

### 2.4 Ce que vous “verrouillez” dans le contrat V1
- Identifiants : `app_id`, `product_id`, `domain_id`, `family_id`
- Gestion du temps : `month` (mensuel)
- Pricing view : tables de prix séparées (pas de coût matérialisé en V1 active)
- Environnement : **nullable** + règles d’affichage côté UI (“si vide, ne pas montrer l’onglet env”)

> Résultat attendu : une page “Data Contract V1” stable, signée par vous deux.

---

## 3) Étape 3 — Définir la stratégie de “serving” (MVs) (0.5–1 jour)

### 3.1 La question clé : “où on agrège ?”
Une MV est un **agrégat au bon grain** pour un écran.
La règle :
- On **retire** des dimensions (ex : enlever `app_id` pour une vue Domaine)
- On **garde `product_id`** si on veut calculer le coût à la volée via pricing view
- On conserve `month` si on veut l’historique

### 3.2 Construire une MV : méthode reproductible
Pour une vue donnée :
1) Écrire le **group-by final** de l’écran
2) Lister les **filtres**
3) Ajouter les dimensions **obligatoires** (pricing → `product_id`)
4) Supprimer toutes les dimensions inutiles
5) La MV = **SUM(quantity)** à ce grain

**Exemple guidé (vue A1 : coûts par domaine)**  
- group-by final : `domain`
- filtres : `month`, `PV`
- pricing : oui → garder `product_id`
- dimensions utiles : `month, domain_id, product_id`
- MV cible : `mv_conso_domain_product_month (month, domain_id, product_id, qty)`

### 3.3 Liste des MVs “minimum V1” (exemple concret)
> Les noms sont indicatifs : gardez une convention simple et stable.

1) **MV-DOMAIN (serve dashboard + vue domaine)**
- **Nom** : `mv_conso_domain_product_month`
- **Grain** : `(month, domain_id, product_id, environment_key?)`
- **Sert** :
  - Dashboard : coûts par domaine
  - Vue Domaine : coût + env breakdown + familles (via dim_product)

2) **MV-APP (serve vue application + top apps)**
- **Nom** : `mv_conso_app_product_month`
- **Grain** : `(month, app_id, product_id, environment_key?)`
- **Sert** :
  - Top applications
  - Vue Application : domaines / env / produits

3) **MV-TOTAL (serve courbe coût total)**
- **Nom** : `mv_conso_total_product_month`
- **Grain** : `(month, product_id)`
- **Sert** :
  - Historique du coût total global

> Résultat attendu : 3 MVs suffisent pour la V1 si vous acceptez que certaines pages calculent “à partir d’une MV” et non d’une MV dédiée.

---

## 4) Étape 4 — Définir le “contrat API” attendu par le Front (0.5 jour)

### 4.1 Principe : une API = une “vue fonctionnelle”
Éviter “une API par widget” au début.  
Préférer : **une API par écran**, qui renvoie plusieurs blocs (charts) d’un coup.

### 4.2 Paramètres standards (à généraliser)
- `month` (ou `from/to` pour historique)
- `pricingViewId`
- `domainId` (optionnel)
- `appId` (optionnel)
- `env` (optionnel)
- pagination / top N (optionnel)

### 4.3 Exemple de structures de réponse (sans coller au code)
#### A) Dashboard global
**GET** `/finops/dashboard?month=2026-03&pricingViewId=PV_2026Q1`

Réponse (exemple) :
```json
{
  "month": "2026-03",
  "pricingViewId": "PV_2026Q1",
  "totals": { "totalCost": 128340.42, "currency": "EUR" },
  "costByDomain": [
    { "domainId": "D_OPEN", "domainName": "Open", "cost": 72340.12, "share": 0.56 },
    { "domainId": "D_K8S",  "domainName": "Kubernetes", "cost": 38120.30, "share": 0.30 },
    { "domainId": "D_NET",  "domainName": "Réseau", "cost": 17879.99, "share": 0.14 }
  ],
  "topApplications": [
    { "appId": "APP_A", "appName": "Application A", "cost": 15420.00, "share": 0.12 },
    { "appId": "APP_B", "appName": "Application B", "cost": 13210.50, "share": 0.10 }
  ],
  "totalCostHistory": [
    { "month": "2025-10", "cost": 111000.00 },
    { "month": "2025-11", "cost": 114200.00 },
    { "month": "2025-12", "cost": 120800.00 },
    { "month": "2026-01", "cost": 121900.00 },
    { "month": "2026-02", "cost": 125300.00 },
    { "month": "2026-03", "cost": 128340.42 }
  ]
}
```

#### B) Vue Domaine
**GET** `/finops/domains/{domainId}?month=2026-03&pricingViewId=PV_2026Q1`

Réponse (exemple) :
```json
{
  "domainId": "D_OPEN",
  "domainName": "Open",
  "month": "2026-03",
  "pricingViewId": "PV_2026Q1",
  "totals": { "domainCost": 72340.12 },
  "costByFamily": [
    { "familyId": "F_VM", "familyName": "VM", "cost": 50200.00 },
    { "familyId": "F_DB", "familyName": "Bases", "cost": 22140.12 }
  ],
  "costByEnvironment": [
    { "env": "PROD", "cost": 61200.10 },
    { "env": "HORS_PROD", "cost": 11140.02 }
  ],
  "topApplications": [
    { "appId": "APP_A", "appName": "Application A", "cost": 15420.00 },
    { "appId": "APP_C", "appName": "Application C", "cost": 12010.00 }
  ]
}
```

#### C) Vue Application
**GET** `/finops/apps/{appId}?month=2026-03&pricingViewId=PV_2026Q1`

Réponse (exemple) :
```json
{
  "appId": "APP_A",
  "appName": "Application A",
  "month": "2026-03",
  "pricingViewId": "PV_2026Q1",
  "totals": { "appCost": 15420.00 },
  "costByDomain": [
    { "domainId": "D_OPEN", "domainName": "Open", "cost": 9800.00 },
    { "domainId": "D_NET", "domainName": "Réseau", "cost": 5620.00 }
  ],
  "domains": [
    {
      "domainId": "D_OPEN",
      "domainName": "Open",
      "cost": 9800.00,
      "environments": [
        {
          "env": "PROD",
          "cost": 8200.00,
          "products": [
            { "productId": "P_VM_DISK", "productName": "Disque VM", "quantity": 120, "cost": 4800.00 },
            { "productId": "P_VM_CPU",  "productName": "CPU VM",    "quantity": 40,  "cost": 3400.00 }
          ]
        },
        { "env": "HORS_PROD", "cost": 1600.00, "products": [ /* ... */ ] }
      ]
    }
  ]
}
```

> Résultat attendu : un front peut construire les widgets sans “intelligence lourde”.  
> Le back renvoie des blocs prêts à afficher (liste/valeurs), avec des IDs pour drill-down.

---

## 5) Étape 5 — Plan de construction (ordre recommandé) (2–5 jours)

### 5.1 Ordre simple, efficace
1) **Data contract** (tables + conventions + règles direct/indirect)
2) **Ingestion minimale** : un domaine direct + un domaine indirect (même en mock) → `fact_consumption`
3) Construire **MV-APP** et **MV-DOMAIN**
4) Construire **pricing view** (fact_pricing) + requêtes de multiplication à la volée
5) Exposer **3 endpoints** : dashboard / domain / app
6) Front : 1 page dashboard + 2 pages drill-down (peu de charts au début)

### 5.2 Critère de fin de V1 technique
- Dashboard affiche des valeurs cohérentes
- Drill-down fonctionne avec PV sélectionnée
- Un domaine indirect apparaît comme un domaine normal (produit abstrait)
- Environnement : affiché seulement si data présente

---

## 6) Étape 6 — Comment ajouter une nouvelle fonctionnalité (la “recette”)

Quand un PO/FinOps demande un nouveau widget / drill-down :
1) **Décrire l’écran** : métrique + filtres + group-by final
2) Vérifier si une **MV existante** peut répondre :
   - si oui : ajouter une requête / endpoint
   - si non : créer une MV “serving” en retirant une dimension inutile
3) Toujours vérifier : **`product_id` conservé ?** (si PV à la volée)
4) Ajouter la route API (ou enrichir la réponse d’un écran)
5) Ajouter le widget front (réutilisable)

**Mini-exemple :** “Je veux coût par environnement dans le dashboard global”  
- group-by final : env
- filtres : month + PV
- dimensions nécessaires : month + env + product_id  
→ soit déjà couvert par `mv_conso_domain_product_month` (si env dedans)  
→ sinon, créer `mv_conso_env_product_month`.

---

## 7) Bonus — Ajouter un niveau plus fin (serveurs / clusters / déploiements) sans casser la V1

### 7.1 Règle : ne surcharge pas la fact principale si ce détail est rare
- Garder `fact_consumption` stable (grain “mensuel app×product×env”)
- Créer une table **de détails** liée à une ligne de consommation (ou au couple app×product×env×month)

**Exemple de résultat attendu :**
`fact_consumption_detail`
| detail_id | month | app_id | product_id | env | item_type | item_label | quantity |
|----------|-------|--------|------------|-----|----------|------------|----------|
| ...      | 2026-03 | APP_A | P_VM_CPU  | PROD | SERVER   | srv-001    | 10       |
| ...      | 2026-03 | APP_A | P_VM_CPU  | PROD | SERVER   | srv-002    | 30       |

> UI : visible uniquement en “détail produit” ou recherche ciblée.  
> Pas besoin de MV au début.

### 7.2 Freeze (périodes figées) et détails
- Si une période est figée : l’UI montre **la version figée** (règle simple)
- Pour les détails :
  - soit on conserve le même identifiant de consommation (recommandé : stabilité)
  - soit on copie en “fact_cost_detail” au moment du freeze (si vous matérialisez des coûts figés)

Décision V1 conseillée : **garder les détails côté consommation** et les afficher en lecture seule pendant les périodes figées.

---

## 8) Checklist de fin de séance (à faire demain)

- [ ] Liste validée des vues V1 (Dashboard, Domaine, Application)
- [ ] Data contract “V1” validé (facts + dims + règles direct/indirect + env nullable)
- [ ] Convention de noms (tables, ids, enum env)
- [ ] Liste des 3 MVs minimum V1 avec grain exact et usage UI
- [ ] Contrat API : 3 endpoints + structure JSON type
- [ ] Backlog technique : ingestion CMDB → fact + pricing view + refresh MVs

---

## Annexe — “Mini-mémo” à relire avant chaque MV
- Est-ce que je calcule un **coût** avec une pricing view variable ?  
  → oui : **garder product_id**
- Est-ce que cet écran a besoin de `app_id` ?  
  → non : l’enlever
- Est-ce que cet écran a besoin d’`environment` ?  
  → seulement si on filtre/groupe/affiche dessus
- Est-ce que cet écran est un drill-down ?  
  → filtre parent + dimension en plus
