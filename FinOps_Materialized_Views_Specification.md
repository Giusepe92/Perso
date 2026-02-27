# 📊 FinOps Module – Materialized Views Specification

## 🎯 Objectif

Ce document décrit les **Materialized Views PostgreSQL** nécessaires pour supporter les écrans du module FinOps :

- Dashboard Principal
- Vue par Domaine
- Vue par Famille
- Vue par Application
- Vue Classements (Top & Variations)
- Vue Historique & Évolution

Hypothèse de modèle de données simplifié :

### Table de faits
`fact_releve`
- period_month (DATE)
- application_id (UUID)
- product_id (UUID)
- family_id (UUID)
- domain_id (UUID)
- total_cost (NUMERIC)
- usage_quantity (NUMERIC)

---

# 1️⃣ Materialized Views Socle

## MV1 – Coût mensuel par Domaine
**Nom :** `mv_cost_domain_month`
**Utilisé par :**
- Dashboard (Top Domaines)
- Vue Domaine
- Historique Domaine

```sql
CREATE MATERIALIZED VIEW mv_cost_domain_month AS
SELECT
    period_month,
    domain_id,
    SUM(total_cost) AS total_cost,
    COUNT(DISTINCT application_id) AS applications_count
FROM fact_releve
GROUP BY period_month, domain_id;
```

---

## MV2 – Coût mensuel par Famille
**Nom :** `mv_cost_family_month`
**Utilisé par :**
- Vue Famille
- Dashboard (Top Familles)
- Historique Famille

```sql
CREATE MATERIALIZED VIEW mv_cost_family_month AS
SELECT
    period_month,
    domain_id,
    family_id,
    SUM(total_cost) AS total_cost,
    COUNT(DISTINCT application_id) AS applications_count
FROM fact_releve
GROUP BY period_month, domain_id, family_id;
```

---

## MV3 – Coût mensuel par Application
**Nom :** `mv_cost_application_month`
**Utilisé par :**
- Vue Application
- Dashboard (Top Applications)
- Classements

```sql
CREATE MATERIALIZED VIEW mv_cost_application_month AS
SELECT
    period_month,
    application_id,
    SUM(total_cost) AS total_cost
FROM fact_releve
GROUP BY period_month, application_id;
```

---

# 2️⃣ Materialized Views Drill-down

## MV4 – Répartition Application par Domaine

```sql
CREATE MATERIALIZED VIEW mv_cost_app_domain_month AS
SELECT
    period_month,
    application_id,
    domain_id,
    SUM(total_cost) AS total_cost
FROM fact_releve
GROUP BY period_month, application_id, domain_id;
```

Utilisé par : Vue Application (répartition par domaine)

---

## MV5 – Répartition Application par Famille

```sql
CREATE MATERIALIZED VIEW mv_cost_app_family_month AS
SELECT
    period_month,
    application_id,
    domain_id,
    family_id,
    SUM(total_cost) AS total_cost
FROM fact_releve
GROUP BY period_month, application_id, domain_id, family_id;
```

Utilisé par : Vue Application (répartition par famille)

---

## MV6 – Répartition Application par Produit

```sql
CREATE MATERIALIZED VIEW mv_cost_app_product_month AS
SELECT
    period_month,
    application_id,
    domain_id,
    family_id,
    product_id,
    SUM(total_cost) AS total_cost,
    SUM(usage_quantity) AS total_usage
FROM fact_releve
GROUP BY period_month, application_id, domain_id, family_id, product_id;
```

Utilisé par : Vue Application (stacked bar + table détaillée)

---

# 3️⃣ Materialized Views Classements

## MV7 – Classement Applications

```sql
CREATE MATERIALIZED VIEW mv_rank_app_month AS
SELECT
    period_month,
    application_id,
    total_cost,
    RANK() OVER (PARTITION BY period_month ORDER BY total_cost DESC) AS rank_cost
FROM mv_cost_application_month;
```

Utilisé par :
- Top Applications par coût
- Top Croissance / Réduction

---

## MV8 – Variations Anormales

```sql
CREATE MATERIALIZED VIEW mv_anomalies_month AS
SELECT
    period_month,
    application_id,
    total_cost,
    total_cost - LAG(total_cost) OVER (
        PARTITION BY application_id ORDER BY period_month
    ) AS delta_abs
FROM mv_cost_application_month;
```

Filtrage dans l'API :
`WHERE ABS(delta_abs) > seuil`

---

# 4️⃣ Historique & Comparaison

## MV9 – Historique Consolidé Domaine

```sql
CREATE MATERIALIZED VIEW mv_history_domain AS
SELECT
    domain_id,
    period_month,
    total_cost,
    SUM(total_cost) OVER (
        PARTITION BY domain_id
        ORDER BY period_month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cost
FROM mv_cost_domain_month;
```

Utilisé par :
- Courbe multi-séries
- Comparaison N-1
- Analyse cumulée annuelle

---

# 🔄 Stratégie de Refresh

Exécuté nightly après batch :

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_domain_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_family_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_application_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_app_domain_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_app_family_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_app_product_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_rank_app_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_anomalies_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_history_domain;
```

⚠️ Chaque MV doit avoir un index unique pour supporter CONCURRENTLY.

Exemple :

```sql
CREATE UNIQUE INDEX idx_mv_domain_month
ON mv_cost_domain_month (period_month, domain_id);
```

---

# 📦 Complexité Globale

- MV Socle : faible
- Classements : moyenne
- Historique cumulatif : moyenne
- Mise en place complète estimée : 4 à 7 jours

---

# 🏗 Recommandation

Commencer par MV1 à MV6.
Ajouter Classements & Anomalies si nécessaire.
Historique avancé en phase 2.
