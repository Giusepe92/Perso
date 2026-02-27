# 📘 FinOps – Spécification Technique  
## Logique Directe / Indirecte (Allocation par Coefficients)

---

# 1. 🎯 Objectif de l’évolution

Introduire un modèle unifié permettant de gérer :

- Domaines DIRECTS (basés sur consommation × pricing view)
- Domaines INDIRECTS (basés sur pool de coût + coefficient d’allocation)

Cette évolution permet :

- Support des allocations inter-domaines (ex: Réseau basé sur Open)
- Support de coefficients externes (autres bases)
- Traçabilité complète des méthodes d’allocation
- Maintien de la performance et du modèle existant

---

# 2. Concepts Clés

## Domaine DIRECT
Source : fact_consumption  
Coût calculé dynamiquement :  
cost = quantity × unit_price (pricing view)

## Domaine INDIRECT
Source : pool de coût global  
Allocation via coefficient  

allocated_cost_app = pool_cost_domain × coefficient_app

---

# 3. Modèle de Données

## 3.1 dim_domain

Ajouter :

- domain_mode : ENUM('DIRECT','INDIRECT')
- indirect_label : VARCHAR
- indirect_method_key : VARCHAR

---

## 3.2 fact_coefficients

| Champ | Type |
|-------|------|
| period_month | VARCHAR |
| coefficient_key | VARCHAR |
| application_id | VARCHAR |
| weight_value | NUMERIC |
| coefficient | NUMERIC |
| label | VARCHAR |
| metadata | JSONB |
| run_id | VARCHAR |

Index :
(period_month, coefficient_key, application_id)

---

## 3.3 fact_indirect_pool

| Champ | Type |
|-------|------|
| period_month | VARCHAR |
| domain_id | VARCHAR |
| pool_cost_eur | NUMERIC |
| source_pricing_view_id | VARCHAR |
| run_id | VARCHAR |

Index :
(period_month, domain_id)

---

## 3.4 fact_indirect_coeff

| Champ | Type |
|-------|------|
| period_month | VARCHAR |
| domain_id | VARCHAR |
| application_id | VARCHAR |
| weight_value | NUMERIC |
| coefficient | NUMERIC |
| allocated_cost_eur | NUMERIC |
| method_key | VARCHAR |
| metadata | JSONB |
| run_id | VARCHAR |

Index :
(period_month, domain_id, application_id)

---

# 4. Logique Batch

## Stage 1 – Direct Domains

Calcul fact_consumption (inchangé)

## Stage 2 – Coefficient Producers

### Coefficient basé sur Open
1. Calcul poids Open par application
2. coefficient = weight / SUM(weight)
3. Insert fact_coefficients (coefficient_key='OPEN_WEIGHT')

### Coefficient externe
1. Lecture base externe
2. Insert fact_coefficients (coefficient_key='EXTERNAL_X')

---

## Stage 3 – Indirect Allocation

Pour chaque domaine INDIRECT :

1. Lire pool coût domaine
2. Lire coefficients correspondants
3. allocated_cost = pool_cost × coefficient
4. Insert fact_indirect_pool & fact_indirect_coeff

---

## Idempotence

DELETE FROM fact_coefficients WHERE period_month = :period;  
DELETE FROM fact_indirect_pool WHERE period_month = :period;  
DELETE FROM fact_indirect_coeff WHERE period_month = :period;

Puis rebuild complet.

---

# 5. Materialized Views

## Direct
Aucun changement

## Indirect

CREATE MATERIALIZED VIEW mv_indirect_domain_month AS
SELECT period_month, domain_id, SUM(pool_cost_eur) AS total_pool
FROM fact_indirect_pool
GROUP BY period_month, domain_id;

CREATE MATERIALIZED VIEW mv_indirect_app_domain_month AS
SELECT period_month, domain_id, application_id,
SUM(allocated_cost_eur) AS total_allocated
FROM fact_indirect_coeff
GROUP BY period_month, domain_id, application_id;

---

# 6. Impact API

total_cost = direct_cost(pricingView) + indirect_allocated_cost

Ajout champ :
domainMode: DIRECT | INDIRECT

Endpoint optionnel :
GET /finops/domains/{id}/allocation-details

---

# 7. Impact UI

Domaine DIRECT :
- familles + produits

Domaine INDIRECT :
- pool total
- méthode
- tableau apps (allocated_cost, coefficient, weight)
- badge Direct / Indirect

---

# 8. Pricing View

Direct dépend de pricingView  
Indirect snapshoté au batch  
Reprocess nécessaire pour recalcul indirect

---

# 9. Résumé

Ajout :
- Store coefficients
- Tables allocation indirecte
- Orchestration ordonnée
- 2 MVs légères
- Adaptation API/UI simple

Architecture robuste, traçable et scalable.
