# 📘 FinOps – Spécification Technique d’Évolution
## Introduction des Domaines Direct / Indirect (Modèle Unifié par Quantity)

---

# 1️⃣ Contexte Initial (Avant Évolution)

Le module FinOps existant repose sur :

- Une table `fact_consumption`
- Une hiérarchie stricte :

```
Domaine → Famille → Produit → Consumption
```

- Le coût est calculé dynamiquement via la Pricing View :

```
cost = quantity × unit_price
```

Limitation actuelle :
- Tous les domaines supposent l’existence de familles et produits.
- Impossible de modéliser des domaines sans granularité produit.
- Impossible de représenter une allocation indirecte basée sur un poids.

---

# 2️⃣ Objectif de l’Évolution

Permettre la gestion de :

- Domaines DIRECTS (consommation réelle)
- Domaines INDIRECTS (quantity abstraite = poids / coefficient)

Sans :
- Ajouter de nouvelles fact tables
- Stocker de coût en base
- Casser les Materialized Views existantes

Principe fondamental conservé :

```
cost = quantity × unit_price
```

---

# 3️⃣ Nouvelle Vision Conceptuelle

## Domaine DIRECT

- quantity = consommation mesurée (CPU, GB, etc.)
- hiérarchie complète Domaine → Famille → Produit

## Domaine INDIRECT

- quantity = poids normalisé (coefficient)
- pas de famille
- pas de produit
- hiérarchie Domaine → Applications

Dans les deux cas :

```
cost = quantity × unit_price
```

---

# 4️⃣ Modifications du Modèle de Données

## 4.1 dim_domain – Ajouts

| Champ | Type | Description |
|--------|------|------------|
| domain_mode | ENUM('DIRECT','INDIRECT') | Type de domaine |
| indirect_method_key | VARCHAR | Clé technique du calcul |
| indirect_label | VARCHAR | Libellé affichable |

---

## 4.2 fact_consumption – Évolution

### Colonnes existantes (inchangées)

- period_month
- domain_id
- family_id
- product_id
- application_id
- quantity
- run_id

### Modifications

| Champ | Type | Description |
|--------|------|------------|
| family_id | NULLABLE | Peut être NULL pour INDIRECT |
| product_id | NULLABLE | Peut être NULL pour INDIRECT |
| consumption_type | ENUM('DIRECT','INDIRECT') |
| consumption_metric | VARCHAR | Ex: CPU, OPEN_WEIGHT |

Aucune nouvelle table créée.

---

# 5️⃣ Logique Batch – Nouvelle Version

## 5.1 Domaines DIRECTS

Inchangé :
- Calcul consommation réelle
- Insertion dans fact_consumption
- family_id et product_id renseignés

---

## 5.2 Domaines INDIRECTS

### Étape 1 – Calcul du poids

Exemples :
- OPEN_WEIGHT
- SERVER_COUNT
- Coefficient externe

### Étape 2 – Normalisation

```
coefficient = weight / SUM(weight)
```

### Étape 3 – Insertion

Insertion dans fact_consumption :

- domain_id = NETWORK
- family_id = NULL
- product_id = NULL
- quantity = coefficient
- consumption_type = 'INDIRECT'
- consumption_metric = 'OPEN_WEIGHT'

Aucun coût calculé.

---

# 6️⃣ Adaptation de la Hiérarchie

Hiérarchie flexible :

DIRECT :
```
Domaine
  → Familles
    → Produits
```

INDIRECT :
```
Domaine
  → Applications
```

Agrégations :

- Par domaine : inchangé
- Par famille : WHERE family_id IS NOT NULL

---

# 7️⃣ Impact sur Materialized Views

## 7.1 MVs Domaine

Aucun changement :

```
GROUP BY domain_id
```

Fonctionne pour DIRECT et INDIRECT.

## 7.2 MVs Famille

Ajouter condition :

```
WHERE family_id IS NOT NULL
```

---

# 8️⃣ Impact API

## 8.1 Calcul coût

Toujours :

```
cost = quantity × unit_price
```

L’API reste identique.

## 8.2 Nouveaux champs DTO

```
domainMode
consumptionMetric
```

---

# 9️⃣ Impact UI

## Domaine DIRECT

- Vue familles
- Vue produits

## Domaine INDIRECT

- Pas de familles
- Tableau applications
- Affichage :
  - quantity (coefficient)
  - cost
  - indirect_label

Badge visuel :
- Direct
- Indirect

---

# 🔟 Idempotence

Batch :
```
DELETE FROM fact_consumption WHERE period_month = :period AND domain_id = :domain;
```
Puis rebuild complet.

---

# 1️⃣1️⃣ Compatibilité Pricing View

DIRECT :
- unit_price = prix unitaire réel

INDIRECT :
- unit_price = montant global à répartir

Aucune modification structurelle nécessaire.

---

# 1️⃣2️⃣ Avantages de cette Évolution

- Modèle unifié
- Pas de duplication de tables
- Pas de stockage de coût
- Simplification de l’architecture
- Maintien des performances
- Faible impact sur l’existant

---

# 1️⃣3️⃣ Résumé Final

Cette évolution transforme les domaines INDIRECTS en producteurs de quantity abstraite.

Le modèle FinOps devient homogène :

```
cost = quantity × unit_price
```

Hiérarchie souple :
- Famille/Produit facultatifs
- Domaine toujours obligatoire

Aucune rupture majeure du modèle existant.
Architecture simplifiée et robuste.
