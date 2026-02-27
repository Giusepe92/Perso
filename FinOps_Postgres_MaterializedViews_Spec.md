# 🗄 FinOps – Spécification PostgreSQL Materialized Views (Consommation)

## 1. 🎯 Objectif

Cette page décrit les **Materialized Views PostgreSQL** nécessaires pour alimenter le module FinOps avec :

- Une **navigation fluide** dans Backstage (Dashboard, Domaine, Famille, Application, Classements, Historique)
- Des requêtes performantes basées sur des **agrégats de consommation**
- Un modèle compatible avec la **Vision Budgétaire** (*Pricing View*) :  
  ✅ les MVs portent uniquement sur la **consommation** (quantités), le coût est calculé ensuite via jointure avec les prix.

---

## 2. Hypothèses & principes

### 2.1 Table de faits (consommation)
Table source : `fact_consumption`

Hypothèse de colonnes minimales :

- `period_month` (VARCHAR `YYYY-MM` ou DATE ramené au 1er jour du mois)
- `application_id`
- `product_id`
- `quantity` (NUMERIC)
- (optionnel) `source_domain` (open/private/public/native)

> Famille & domaine peuvent être déduits via référentiel produit.  
Pour simplifier les MVs, on suppose l’existence d’une dimension produit ou d’une projection.

### 2.2 Dimensions
Deux approches compatibles (la MV reste identique) :

- **Option retenue (recommandée)** : tables de dimensions
  - `dim_product(product_id, family_id, domain_id, product_name, ...)`
  - `dim_family(family_id, domain_id, family_name, ...)`
  - `dim_domain(domain_id, domain_name, ...)`

Les MVs jointent `fact_consumption` → `dim_product` pour obtenir `family_id` et `domain_id`.

### 2.3 Règles
- Les MVs sont **mensuelles**
- Les MVs stockent `total_quantity` (pas de coût)
- `CONCURRENTLY` est utilisé pour limiter l’indisponibilité lors du refresh (nécessite un index unique)

---

## 3. Liste des Materialized Views (groupées par objectif)

# LOT A – Socle “Navigation & KPI”

## MV-A1 – Consommation mensuelle par Domaine
**Nom :** `mv_consumption_domain_month`  
**But :** KPI par domaine, top domaines, historique domaine  
**Utilisée par :** Dashboard, Vue Domaine, Historique

```sql
CREATE MATERIALIZED VIEW mv_consumption_domain_month AS
SELECT
  fc.period_month,
  dp.domain_id,
  SUM(fc.quantity) AS total_quantity,
  COUNT(DISTINCT fc.application_id) AS applications_count
FROM fact_consumption fc
JOIN dim_product dp ON dp.product_id = fc.product_id
GROUP BY fc.period_month, dp.domain_id;
```

---

## MV-A2 – Consommation mensuelle par Famille
**Nom :** `mv_consumption_family_month`  
**But :** KPI familles dans un domaine, top familles, drill-down domaine→famille  
**Utilisée par :** Dashboard, Vue Famille, Vue Domaine

```sql
CREATE MATERIALIZED VIEW mv_consumption_family_month AS
SELECT
  fc.period_month,
  dp.domain_id,
  dp.family_id,
  SUM(fc.quantity) AS total_quantity,
  COUNT(DISTINCT fc.application_id) AS applications_count
FROM fact_consumption fc
JOIN dim_product dp ON dp.product_id = fc.product_id
GROUP BY fc.period_month, dp.domain_id, dp.family_id;
```

---

## MV-A3 – Consommation mensuelle par Application
**Nom :** `mv_consumption_application_month`  
**But :** KPI apps, top apps, historique application  
**Utilisée par :** Dashboard, Vue Application, Classements

```sql
CREATE MATERIALIZED VIEW mv_consumption_application_month AS
SELECT
  fc.period_month,
  fc.application_id,
  SUM(fc.quantity) AS total_quantity
FROM fact_consumption fc
GROUP BY fc.period_month, fc.application_id;
```

---

# LOT B – Drill-down “Répartition & détails”

## MV-B1 – Consommation mensuelle par Application × Domaine
**Nom :** `mv_consumption_app_domain_month`  
**But :** répartition domaine d’une app, drill-down domaine→apps  
**Utilisée par :** Vue Application, Vue Domaine

```sql
CREATE MATERIALIZED VIEW mv_consumption_app_domain_month AS
SELECT
  fc.period_month,
  fc.application_id,
  dp.domain_id,
  SUM(fc.quantity) AS total_quantity
FROM fact_consumption fc
JOIN dim_product dp ON dp.product_id = fc.product_id
GROUP BY fc.period_month, fc.application_id, dp.domain_id;
```

---

## MV-B2 – Consommation mensuelle par Application × Famille
**Nom :** `mv_consumption_app_family_month`  
**But :** répartition famille d’une app, drill-down famille→apps  
**Utilisée par :** Vue Application, Vue Famille

```sql
CREATE MATERIALIZED VIEW mv_consumption_app_family_month AS
SELECT
  fc.period_month,
  fc.application_id,
  dp.domain_id,
  dp.family_id,
  SUM(fc.quantity) AS total_quantity
FROM fact_consumption fc
JOIN dim_product dp ON dp.product_id = fc.product_id
GROUP BY fc.period_month, fc.application_id, dp.domain_id, dp.family_id;
```

---

## MV-B3 – Consommation mensuelle par Application × Produit
**Nom :** `mv_consumption_app_product_month`  
**But :** table détaillée produits d’une app + base du calcul coût (pricing view)  
**Utilisée par :** Vue Application (détails), API (pricing join)

```sql
CREATE MATERIALIZED VIEW mv_consumption_app_product_month AS
SELECT
  fc.period_month,
  fc.application_id,
  dp.domain_id,
  dp.family_id,
  fc.product_id,
  SUM(fc.quantity) AS total_quantity
FROM fact_consumption fc
JOIN dim_product dp ON dp.product_id = fc.product_id
GROUP BY fc.period_month, fc.application_id, dp.domain_id, dp.family_id, fc.product_id;
```

---

# LOT C – Support “Classements & variations” (consommation)

> Ces MVs préparent les classements et variations à partir de la consommation.  
Les classements coût seront obtenus via pricing join côté API (ou requête SQL côté API).

## MV-C1 – Ranking Applications (par consommation)
**Nom :** `mv_rank_consumption_app_month`  
**But :** top apps consommation, variations d’un mois à l’autre (volume)  
**Utilisée par :** Vue Classements (volume), Admin/Monitoring

```sql
CREATE MATERIALIZED VIEW mv_rank_consumption_app_month AS
SELECT
  period_month,
  application_id,
  total_quantity,
  RANK() OVER (PARTITION BY period_month ORDER BY total_quantity DESC) AS rank_quantity
FROM mv_consumption_application_month;
```

---

## MV-C2 – Variations Applications (delta consommation)
**Nom :** `mv_consumption_app_variation_month`  
**But :** détecter pics/chutes de consommation (avant conversion en coût)  
**Utilisée par :** Vue Variations/Anomalies

```sql
CREATE MATERIALIZED VIEW mv_consumption_app_variation_month AS
SELECT
  period_month,
  application_id,
  total_quantity,
  total_quantity - LAG(total_quantity) OVER (PARTITION BY application_id ORDER BY period_month) AS delta_abs
FROM mv_consumption_application_month;
```

---

# LOT D – Historique (consommation)

## MV-D1 – Historique cumulatif Domaine (consommation)
**Nom :** `mv_history_consumption_domain`  
**But :** courbe cumulée / YTD sur consommation  
**Utilisée par :** Vue Historique

```sql
CREATE MATERIALIZED VIEW mv_history_consumption_domain AS
SELECT
  domain_id,
  period_month,
  total_quantity,
  SUM(total_quantity) OVER (
    PARTITION BY domain_id
    ORDER BY period_month
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_quantity
FROM mv_consumption_domain_month;
```

---

## 4. Index requis (CONCURRENTLY)

Pour utiliser `REFRESH MATERIALIZED VIEW CONCURRENTLY`, chaque MV doit posséder un index unique.

Exemples :

```sql
CREATE UNIQUE INDEX ux_mv_consumption_domain_month
  ON mv_consumption_domain_month (period_month, domain_id);

CREATE UNIQUE INDEX ux_mv_consumption_family_month
  ON mv_consumption_family_month (period_month, domain_id, family_id);

CREATE UNIQUE INDEX ux_mv_consumption_application_month
  ON mv_consumption_application_month (period_month, application_id);

CREATE UNIQUE INDEX ux_mv_consumption_app_product_month
  ON mv_consumption_app_product_month (period_month, application_id, product_id);
```

---

## 5. Stratégie de refresh (nightly)

### 5.1 Ordre de refresh (recommandé)
1) Socle
- `mv_consumption_domain_month`
- `mv_consumption_family_month`
- `mv_consumption_application_month`

2) Drill-down
- `mv_consumption_app_domain_month`
- `mv_consumption_app_family_month`
- `mv_consumption_app_product_month`

3) Classements / variations
- `mv_rank_consumption_app_month`
- `mv_consumption_app_variation_month`

4) Historique
- `mv_history_consumption_domain`

### 5.2 Script type
Exécuté à la fin du batch :

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_domain_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_family_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_application_month;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_app_domain_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_app_family_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_app_product_month;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_rank_consumption_app_month;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consumption_app_variation_month;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_history_consumption_domain;
```

---

## 6. Résumé

Ces Materialized Views constituent le socle “performance” du module FinOps :

- Elles agrègent la **consommation mensuelle** selon les axes UI (domaine, famille, app, produit).
- Elles permettent une navigation Backstage fluide (dashboard + drill-down + historique).
- Elles restent compatibles avec la **Vision Budgétaire**, car le coût est calculé dynamiquement ensuite via `pricing_line` côté API.

Les lots proposés (A→D) permettent une implémentation incrémentale :  
1) LOT A (socle)  
2) LOT B (drill-down)  
3) LOT C (classements)  
4) LOT D (historique)
