# Rosetta FinOps — Data Contract & Materialized Views (V2 / Confluence)

> **Objectif** : définir **le contrat de données PostgreSQL (Data Mart FinOps)** et la **liste complète des Materialized Views** nécessaires pour :
- les **dashboards** (répartition, tops, drill-down),
- l’**historique 12–24 mois** performant,
- la gestion **Hot Month** (mois courant calculé à la volée) + **Cold History** (mois passés pré-calculés),
- les domaines **directs** (UO/quantités) et **indirects** (poids/coefficient),
- la compatibilité avec **pricing views** (visions budgétaires) + **périodes figées** (freeze) si activées.

---

## 1) Principes de modélisation

### 1.1 Grain “source of truth”
- Le **grain pivot** reste la **consommation mensuelle** par application et par produit :
  - `month` + `application_id` + `product_id` (+ `environment` optionnel, + `resource` optionnel)
  - `quantity` = UO consommées (direct) **ou** poids/coefficient (indirect)
- Le **coût** se calcule par :
  - **Réel (par mois)** : `quantity * unit_price(pricing_view du mois)`
  - **Simulation (what-if)** : `quantity * unit_price(pricing_view choisie)`

### 1.2 Hot Month / Cold History (évolution future)
- **Mois courant** (“Hot Month”) : calcul à la volée (les quantités bougent au fil de l’eau).
- **Mois passés** (“Cold History”) : pré-calcul nightly en MV (stable + très rapide).

### 1.3 Domaines directs vs indirects
- **Direct** : on a des UO par produit (quantité) ; le prix vient des pricing views.
- **Indirect** : on n’a pas de mesure fine ; on calcule un **poids** (quantité abstraite) par application.
  - Modélisé comme un “produit” spécial rattaché au domaine (sans famille), dont l’UO est “abstraite”.
  - Le prix unitaire vient également des pricing views (ligne dédiée pour ce produit indirect).

### 1.4 Environnement / granularité additionnelle
- `environment` est **optionnel** et peut varier selon les domaines.
- On le traite comme une **dimension légère** (string), sans DIM dédiée.
- Les vues “par environnement” ne s’appliquent que si la donnée est présente.

---

## 2) Data Contract — Schéma PostgreSQL (Data Mart FinOps)

> **Convention** : schéma `finops_dm` (Data Mart). Les tables “raw” restent côté Mongo (landing zone).

### 2.1 Dimensions

#### `dim_domain`
- `domain_id` (PK)
- `domain_code` (unique, stable)
- `domain_name`
- `domain_description` (nullable)
- `is_active` (bool)
- `ìs_indirect` (bool)
- `created_at`, `updated_at`

#### `dim_family`
- `family_id` (PK)
- `domain_id` (FK -> dim_domain)
- `family_code` (unique dans un domaine)
- `family_name`
- `family_description` (nullable)
- `created_at`, `updated_at`

> Note : un domaine peut avoir **0 famille**.

#### `dim_product`
- `product_id` (PK)
- `product_code` (unique stable)
- `product_name`
- `product_description` (nullable)
- `domain_id` (FK -> dim_domain) — **obligatoire**
- `family_id` (FK -> dim_family) — **nullable**
- `created_at`, `updated_at`


> Règle : **ne jamais supprimer** un produit utilisé dans des facts, on le **désactive**.

### 2.2 Pricing Views (visions budgétaires)

#### `pricing_view` (les visions budgétaires)
- `pricing_view_id` (PK) UUID
- `pricing_view_code` (unique) (exemple : PV_Q1_2026)
- `name` (exemple : Budget 2026 / Q1)
- `created_by`, `updated_at`

#### `pricing_view_line` (les prix unitaires des produits par vision budgétaire)
- `pricing_view_id` (FK -> pricing_view)
- `product_id` (FK -> dim_product)
- `unit_price` (numeric) (exemple 1.2) ( 0 si pas de prix )
- `currency` (ex: EUR) 
- `created_at`
- **PK** (`pricing_view_id`, `product_id`)

#### `pricing_calendar` (les mois disponibles)
- `month` (YYYY-MM-01) (PK)
- `pricing_view_id` (FK -> pricing_view)
- `is_frozen` (bool)  (par défaut false en attendant l'implémentation du freeze)
- `frozen_at` (nullable)
- `frozen_by` (nullable)

> But : associer **mois → pricing view** (réalité) et gérer la notion de mois figé.

### 2.3 Facts

#### `fact_consumption_monthly` ✅  (Fact de consommation : grain= domain x application x produit x mois x environnement)
Grain : **(month, application_id, product_id, environment?)**

- `fact_id` (PK)
- `month` (YYYY-MM-01)
- `application_id`
- `product_id` (FK)
- `domain_id` (FK) — **dénormalisé**
- `family_id` (FK, nullable) — **dénormalisé**
- `environment` (nullable)
- `quantity` (numeric)
- `resource`  (nullable)  (exemple : sv0125484 = le nom du serveur)
- `metadata` (jsonb, nullable) ( avec: info - phrase explicative `coef dispo utilisé=5, consommation open utilisée = 1500/25000` // ingestion_source= `gozen/API Gitlab/ ... etc` )
- `created_at`, `updated_at`

> Le fait d’avoir `domain_id`/`family_id` dans la fact simplifie le drill-down (pas d’erreur de `WHERE domain_id = ...`).


### 2.4 Batch Runs / Admin / Audit

#### `etl_run` (les exécution d'un batch) 
- `run_id` (PK)
- `job_name` (NIGHTLY_FINOPS_RECALCULATE ou TRIGGERED_FINOPS_RECALCULATE)
- `trigger_type` (`SCHEDULED` | `MANUAL` )
- `triggered_by` (batch, ou user-id)
- `status` (FAILED, SUCCESS, TIMEOUT)
- `period` (month of calculation : exemple : 2026-01)
- `started_at`, `ended_at`, `duration_ms`
- `summary` (jsonb)

#### `etl_run_step` (les exécutions des étapes d'un batch) 
- `run_id` (FK)
- `step_key` (DIMENSIONS_UPSERT, OPEN_DOMAIN_ETL_STEP, INDIRECT_OPEN_BASED_WEIGHT, REFRESH_MVS, ...)
- `status` (FAILED, SUCCESS, TIMEOUT)
- `started_at`, `ended_at`, `duration_ms`
- `metrics` (jsonb)  
- **PK** (`run_id`, `step_key`)

---

## 3) Materialized Views — Liste complète

> Schéma `finops_mv`. Chaque MV correspond à une **vue UI** ou un **widget**.

### Lot A — Serving base (drill-down)

**MV-A1** `mv_conso_app_product_month`
- Group by: `month, application_id, domain_id, family_id, product_id, environment`
- Mesure: `sum(quantity) as qty`

**MV-A2** `mv_conso_domain_app_month`
- Group by: `month, domain_id, application_id`
- Mesure: `sum(quantity) as qty`

**MV-A3** `mv_conso_domain_family_month`
- Group by: `month, domain_id, family_id`
- Mesure: `sum(quantity) as qty`

**MV-A4** `mv_conso_domain_product_month`
- Group by: `month, domain_id, product_id`
- Mesure: `sum(quantity) as qty`

**MV-A5** `mv_conso_app_domain_month`
- Group by: `month, application_id, domain_id`
- Mesure: `sum(quantity) as qty`

**MV-A6** `mv_conso_app_domain_env_month` (si env)
- Group by: `month, application_id, domain_id, environment`
- Mesure: `sum(quantity) as qty`

### Lot B — Cold History Costs (mois passés)
> Règle : `month < current_month`.

**MV-B1** `mv_cost_total_month_hist` → `month, total_cost`

**MV-B2** `mv_cost_domain_month_hist` → `month, domain_id, cost`

**MV-B3** `mv_cost_app_month_hist` → `month, application_id, cost`

**MV-B4** `mv_cost_domain_app_month_hist` → `month, domain_id, application_id, cost`

### Lot C — Hot Month Costs (à la volée)
- Pas de MV dédiée : calcul via MV-A* + join `pricing_view_line` avec `pricing_view_id` paramétré.

### Lot D — Variations MoM (optionnel)
**MV-D1** `mv_cost_domain_mom_hist`

**MV-D2** `mv_cost_app_mom_hist`

---

## 4) Refresh / Orchestration nightly

1. Ingestion → `fact_consumption_monthly`
2. Upsert dims (no delete)
3. Update `pricing_calendar`
4. Refresh MV-A*
5. Refresh MV-B* (cold history)
6. Refresh MV-D* (si activé)

Notes :
- Refresh `CONCURRENTLY` si possible.
- Produits : désactivation, jamais suppression.

---

## 5) Mapping UI (raccourci)

- Dashboard global :
  - Courbe total = `mv_cost_total_month_hist` + hot month (UNION ALL)
  - Répartition domaines (mois courant) = hot month sur `mv_conso_app_domain_month`
  - Top apps = hot month sur `mv_conso_domain_app_month`

- Vue Domaine : apps/familles/produits = MV-A2/A3/A4 + pricing join
- Vue Application : domaines/env/produits = MV-A5/A6/A1 + pricing join

---

## 6) Couverture use cases
- Direct & Indirect unifiés
- Pricing views (réel par mois) + simulation
- Historique performant (cold) + mois courant (hot)
- Drill-down : Domaine → App → (Env) → Produits
- Journal batch runs

