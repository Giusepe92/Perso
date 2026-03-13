2.1 Dimensions
dim_domain
domain_id (PK)

domain_code (unique, stable)

domain_name

domain_description (nullable)

is_active (bool)

ìs_indirect (bool)

created_at, updated_at

dim_family
family_id (PK)

domain_id (FK -> dim_domain)

family_code (unique dans un domaine)

family_name

family_description (nullable)

created_at, updated_at

Note : un domaine peut avoir 0 famille.

dim_product
product_id (PK)

product_code (unique stable)

product_name

product_description (nullable)

domain_id (FK -> dim_domain) — obligatoire

family_id (FK -> dim_family) — nullable

created_at, updated_at

Règle : ne jamais supprimer un produit utilisé dans des facts, on le désactive.

dim_environment
product_id (PK)

environment_code (unique stable)

environment_name

environment_description (nullable)

created_at, updated_at

2.2 Pricing Views (visions budgétaires)
pricing_view (les visions budgétaires)
pricing_view_id (PK) UUID

pricing_view_code (unique) (exemple : PV_Q1_2026)

name (exemple : Budget 2026 / Q1)

created_by, updated_at

pricing_view_line (les prix unitaires des produits par vision budgétaire)
pricing_view_id (FK -> pricing_view)

product_id (FK -> dim_product)

unit_price (numeric) (exemple 1.2) ( 0 si pas de prix )

currency (ex: EUR)

created_at

PK (pricing_view_id, product_id)

pricing_calendar (les mois disponibles)
month (YYYY-MM-01) (PK)

pricing_view_id (FK -> pricing_view)

is_frozen (bool) (par défaut false en attendant l'implémentation du freeze)

frozen_at (nullable)

frozen_by (nullable)

But : associer mois → pricing view (réalité) et gérer la notion de mois figé.

2.3 Facts
fact_consumption_monthly ✅ (Fact de consommation)
Grain : (month, application_id, product_id, environment?, resource?)

fact_id (PK)

month (YYYY-MM-01)

application_id. 

product_id (FK)

domain_id (FK) — dénormalisé

family_id (FK, nullable) — dénormalisé

environment (nullable)

quantity (numeric)

resource (nullable) (exemple : sv0125484 = le nom du serveur)

metadata (jsonb, nullable) ( avec: info - phrase explicative coef dispo utilisé=5, consommation open utilisée = 1500/25000 // ingestion_source= gozen/API Gitlab/ ... etc )

created_at, updated_at

Le fait d’avoir domain_id/family_id dans la fact simplifie le drill-down (pas d’erreur de WHERE domain_id = ...).

2.4 Batch Runs / Admin / Audit
etl_run (les exécution d'un batch)
run_id (PK)

job_name (NIGHTLY_FINOPS_RECALCULATE ou TRIGGERED_FINOPS_RECALCULATE)

trigger_type (SCHEDULED | MANUAL )

triggered_by (batch, ou user-id)

status (FAILED, SUCCESS, TIMEOUT)

period (month of calculation : exemple : 2026-01)

started_at, ended_at, duration_ms

summary (jsonb)

etl_run_step (les exécutions des étapes d'un batch)
run_id (FK)

step_key (DIMENSIONS_UPSERT, OPEN_DOMAIN_ETL_STEP, INDIRECT_OPEN_BASED_WEIGHT, REFRESH_MVS, ...)

status (FAILED, SUCCESS, TIMEOUT)

started_at, ended_at, duration_ms

metrics (jsonb)

PK (run_id, step_key)
