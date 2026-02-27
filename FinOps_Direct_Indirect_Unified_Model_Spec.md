# 📘 FinOps – Spécification Technique  
## Évolution : Unification Direct / Indirect via Quantity Abstraite

---

# 1. 🎯 Objectif de l’évolution

Adapter le modèle FinOps existant pour supporter les domaines INDIRECTS sans introduire de nouvelle table d’allocation ni stockage de coût.

Principe clé :

> Toute donnée produite par le batch est une **quantity**.  
> Le coût est toujours appliqué dynamiquement via la Pricing View.

Ainsi :

- Domaine DIRECT → quantity = consommation réelle
- Domaine INDIRECT → quantity = poids / coefficient

Dans les deux cas :

cost = quantity × unit_price

---

# 2. 🧱 État Initial (Avant évolution)

Modèle existant :

### fact_consumption

| Champ | Description |
|-------|------------|
| period_month | Mois |
| domain_id | Domaine |
| product_id | Produit |
| application_id | Application |
| quantity | Consommation |
| run_id | Batch run |

### Pricing View

Applique :

cost = quantity × unit_price

---

# 3. 🆕 Nouvelle Approche Conceptuelle

Unification :

- Le batch produit uniquement des quantities.
- Il ne produit jamais de coût.
- Indirect = quantity abstraite.

---

# 4. 🗄 Modifications de Modèle

## 4.1 dim_domain

Ajouter :

- domain_mode : ENUM('DIRECT','INDIRECT')
- indirect_method_key : VARCHAR
- indirect_label : VARCHAR

But :
- Adapter l’affichage UI
- Documenter la méthode

---

## 4.2 fact_consumption – Ajout de colonnes

Ajouter :

| Champ | Type | Description |
|-------|------|------------|
| consumption_type | ENUM('DIRECT','INDIRECT') | Type de quantity |
| consumption_metric | VARCHAR | Ex: CPU, OPEN_WEIGHT |

Aucune nouvelle table créée.

---

# 5. ⚙️ Logique Batch – Nouvelle Version

## 5.1 Domaines DIRECT

Inchangé :
- Calcul consommation réelle
- Insert fact_consumption

---

## 5.2 Domaines INDIRECT

### Étape 1 – Calcul poids

Exemple :
- OPEN_WEIGHT par application
- SERVER_COUNT
- Coefficient externe

### Étape 2 – Normalisation

coefficient = weight / SUM(weight)

### Étape 3 – Insertion

Insert dans fact_consumption :

- domain_id = NETWORK
- quantity = coefficient
- consumption_type = 'INDIRECT'
- consumption_metric = 'OPEN_WEIGHT'

Aucun coût calculé ici.

---

# 6. 💰 Pricing View

Aucun changement structurel.

Pour domaine INDIRECT :

- unit_price représente le montant global à répartir.

Exemple :

Si NETWORK a un coût global de 100 000 € :

APP_A → quantity = 0.45  
cost = 0.45 × 100 000 = 45 000 €

---

# 7. 🗂 Impact Materialized Views

Aucun changement majeur.

Les MVs existantes continuent d’agréger quantity.

Le coût reste calculé dynamiquement côté API.

---

# 8. 🌐 Impact API

Aucun nouvel endpoint nécessaire.

Modification :

- Lorsque domain_mode = INDIRECT
- L’API applique pricing view normalement

Ajout DTO :

domainMode: DIRECT | INDIRECT  
consumptionMetric: string

---

# 9. 🖥 Impact UI

## Domaine DIRECT
- Vue produits/familles classique

## Domaine INDIRECT
- Pas de produits
- Tableau applications
- Affichage :
  - quantity (coefficient)
  - cost calculé
  - label méthode

Badge :
- Direct
- Indirect

---

# 10. 🔁 Idempotence & Reprocess

Batch supprime les lignes du mois pour le domaine concerné puis rebuild.

Aucune logique spéciale nécessaire.

---

# 11. 🚀 Avantages

- Pas de nouvelle fact table
- Pas de duplication de logique
- Pas de stockage de coût
- Pricing view reste centrale
- Architecture simplifiée
- Évolution minimale du modèle

---

# 12. 🏁 Résumé Final

Cette évolution transforme les coefficients indirects en quantités abstraites.

Le système reste basé sur une règle unique :

cost = quantity × unit_price

Ce design :

- Unifie Direct et Indirect
- Réduit la complexité
- Préserve la cohérence du modèle existant
- Simplifie maintenance et évolutions futures
