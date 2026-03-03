# Rosetta FinOps — V1 UI (3 pages) + Endpoints + Materialized Views (Bible)

> Objectif : livrer **3 pages** (Dashboard, Domaine, Application) avec une UX drill-down simple, des endpoints stables, et un socle SQL qui **n’oublie jamais le parent** (pour que les `WHERE` de drilldown soient toujours possibles).

---

## 0) Règles de conception (à ne jamais casser)

### R0 — Le drill-down impose “le parent dans la donnée”
- Si on **navigue Domaine → Applications**, alors la source de données doit contenir **`domain_id` ET `app_id`**.
- Si on **navigue Application → Domaines**, alors la source doit contenir **`app_id` ET `domain_id`**.
✅ Conclusion : le **socle V1** doit exposer au minimum (par ligne) :  
`period_month, app_id, domain_id, (family_id?), product_id, (env_label?), quantity`

### R1 — Un widget = un endpoint (V1)
- Pour V1, on vise la simplicité opérationnelle : **un endpoint par widget**.
- Un écran appelle 4–6 endpoints max (acceptable). Optimisation (agrégation en 1 endpoint) = V1.1/V2 si nécessaire.

### R2 — La multiplication “pricing view” se fait côté SQL à la volée
- Les MVs stockent **des quantités** (consommations/poids).
- Le coût = `quantity * unit_price` via jointure sur `pricing_view_item`.

### R3 — Les MVs sont **orientées “lecture UI”**
- Une MV “drill-down base” + quelques MV d’agrégation réutilisables pour les widgets.
- On évite 12 MVs dès le 1er sprint : on part sur un set minimal mais durable.

---

## 1) Pages & layout (disposition)

## 1.1 Dashboard (Vue globale mois M / pricing view P)

**Layout recommandé (desktop 16:9)**  
- **Row 1 (full width)** : `Header KPI`
- **Row 2 (2 colonnes 50/50)** : `Répartition Domaines` | `Top Applications`
- **Row 3 (2 colonnes 50/50)** : `Tendance Coût Total (12M)` | `Variations (Top ↑ / ↓)`
- **Row 4 (full width)** : `Table “Tout domaines (scroll)”` (optionnel V1 si besoin)

### Widgets Dashboard — Table de référence

| Widget | Position | Type UI | Ce que ça affiche | Endpoint (V1) | MV(s) utilisée(s) | WHERE / paramètres (drill-ready) |
|---|---|---|---|---|---|---|
| D1. Header KPI | Row1 / full | KPI cards | Total mois, Δ vs M-1, nb apps couvertes | `GET /api/finops/v1/dashboard/summary?month&pricingViewId` | `mv_finops_agg_total_month_product` | `WHERE period_month=:month` + join pricing view |
| D2. Répartition par domaine | Row2 / left | Donut/Bar | Coût par domaine (Top + “Autres”) | `GET /api/finops/v1/dashboard/by-domain?month&pricingViewId&limit` | `mv_finops_agg_domain_month_product` | `WHERE period_month=:month` (drill: `domain_id` renvoyé) |
| D3. Top applications | Row2 / right | Table | Top apps coût mois | `GET /api/finops/v1/dashboard/top-apps?month&pricingViewId&limit` | `mv_finops_agg_app_month_product` | `WHERE period_month=:month` (drill: `app_id`) |
| D4. Tendance coût total | Row3 / left | Line chart | Total coût sur N mois | `GET /api/finops/v1/dashboard/trend-total?from&to&pricingViewId` | `mv_finops_agg_total_month_product` | `WHERE period_month BETWEEN :from AND :to` |
| D5. Variations (Top ↑ / ↓) | Row3 / right | 2 tables | Top hausses / baisses vs M-1 (apps) | `GET /api/finops/v1/dashboard/variations/apps?month&pricingViewId&limit` | `mv_finops_agg_app_month_product` | calc Δ(M vs M-1) (drill: app_id) |
| D6. Table domaines (optionnel V1) | Row4 / full | Table | Tous domaines + coûts + % | `GET /api/finops/v1/dashboard/by-domain?month&pricingViewId` | `mv_finops_agg_domain_month_product` | idem D2 |

---

## 1.2 Page Domaine (domaine D, mois M / pricing view P)

**Layout recommandé**
- **Row 1 (full width)** : `Header Domaine`
- **Row 2 (2 colonnes 50/50)** : `Tendance Domaine (12M)` | `Répartition Familles (si applicable)`
- **Row 3 (2 colonnes 50/50)** : `Top Apps du domaine` | `Répartition Environnements (si data)`
- **Row 4 (full width)** : `Table détail (apps ou produits)` (optionnel V1)

### Widgets Domaine — Table de référence

| Widget | Position | Type UI | Ce que ça affiche | Endpoint (V1) | MV(s) utilisée(s) | WHERE / paramètres (drill-ready) |
|---|---|---|---|---|---|---|
| DO1. Header Domaine | Row1 / full | KPI header | Coût domaine, %, Δ vs M-1, Direct/Indirect | `GET /api/finops/v1/domains/{domainId}/summary?month&pricingViewId` | `mv_finops_agg_domain_month_product` | `WHERE domain_id=:domainId AND period_month=:month` |
| DO2. Trend Domaine | Row2 / left | Line chart | Domaine sur N mois | `GET /api/finops/v1/domains/{domainId}/trend?from&to&pricingViewId` | `mv_finops_agg_domain_month_product` | `WHERE domain_id=:domainId AND period_month BETWEEN :from AND :to` |
| DO3. Familles (si exist) | Row2 / right | Bar/Donut | Répartition par familles | `GET /api/finops/v1/domains/{domainId}/by-family?month&pricingViewId` | `mv_finops_drill_base` | `WHERE domain_id=:domainId AND period_month=:month` + `GROUP BY family_id` |
| DO4. Top Apps du domaine | Row3 / left | Table | Apps consommatrices du domaine | `GET /api/finops/v1/domains/{domainId}/top-apps?month&pricingViewId&limit` | `mv_finops_drill_base` | `WHERE domain_id=:domainId AND period_month=:month` + `GROUP BY app_id` |
| DO5. By environment (si data) | Row3 / right | Bar/Stack | Répartition env (Prod/Hors-prod/Unknown) | `GET /api/finops/v1/domains/{domainId}/by-environment?month&pricingViewId` | `mv_finops_drill_base` | `WHERE domain_id=:domainId AND period_month=:month` + `GROUP BY env_label` |

---

## 1.3 Page Application (application A, mois M / pricing view P)

**Layout recommandé**
- **Row 1 (full width)** : `Header Application`
- **Row 2 (2 colonnes 50/50)** : `Répartition Domaines` | `Tendance Application (12M)`
- **Row 3 (full width)** : `Table Produits (drill-ready)` (avec filtres Domaine/Env)
- **Row 4 (2 colonnes 50/50, optionnel V1)** : `By Environment` | `Variations produits (vs M-1)`

### Widgets Application — Table de référence

| Widget | Position | Type UI | Ce que ça affiche | Endpoint (V1) | MV(s) utilisée(s) | WHERE / paramètres (drill-ready) |
|---|---|---|---|---|---|---|
| AP1. Header Application | Row1 / full | KPI header | Coût app, Δ vs M-1, domaines actifs | `GET /api/finops/v1/apps/{appId}/summary?month&pricingViewId` | `mv_finops_agg_app_month_product` | `WHERE app_id=:appId AND period_month=:month` |
| AP2. Répartition Domaines | Row2 / left | Donut/Bar | Coût par domaine pour l’app | `GET /api/finops/v1/apps/{appId}/by-domain?month&pricingViewId` | `mv_finops_drill_base` | `WHERE app_id=:appId AND period_month=:month` + `GROUP BY domain_id` |
| AP3. Trend Application | Row2 / right | Line chart | App sur N mois | `GET /api/finops/v1/apps/{appId}/trend?from&to&pricingViewId` | `mv_finops_agg_app_month_product` | `WHERE app_id=:appId AND period_month BETWEEN :from AND :to` |
| AP4. Table Produits (détail) | Row3 / full | Table filtrable | Produits + qty + coût + env | `GET /api/finops/v1/apps/{appId}/products?month&pricingViewId&domainId?&env?` | `mv_finops_drill_base` | `WHERE app_id=:appId AND period_month=:month` + filtres optionnels (`domain_id`, `env_label`) |
| AP5. By Environment (optionnel V1) | Row4 / left | Bar/Stack | Coût par env pour l’app (tous domaines ou 1 domaine) | `GET /api/finops/v1/apps/{appId}/by-environment?month&pricingViewId&domainId?` | `mv_finops_drill_base` | `WHERE app_id=:appId AND period_month=:month` + `GROUP BY env_label` |
| AP6. Variations produits (optionnel V1) | Row4 / right | Table | Produits qui montent/baissent vs M-1 | `GET /api/finops/v1/apps/{appId}/variations/products?month&pricingViewId&limit` | `mv_finops_drill_base` | calc Δ(M vs M-1) groupé par product_id |

---

## 2) Contrats d’API (formats de réponse attendus)

> Pour V1, on standardise un format qui aide le front :  
- `context` (mois, pricing view)  
- `items` (liste)  
- `totals` (optionnel)  

### 2.1 Exemple — `dashboard/by-domain`
```json
{
  "context": { "month": "2026-03", "pricingViewId": "PV2026Q1" },
  "items": [
    { "domainId": "OPEN", "domainName": "Open", "cost": 120340.12, "pct": 0.42 },
    { "domainId": "NATIVE", "domainName": "Natif", "cost": 90210.50, "pct": 0.31 }
  ],
  "totals": { "cost": 286500.00 }
}
```

### 2.2 Exemple — `apps/{appId}/products`
```json
{
  "context": { "month": "2026-03", "pricingViewId": "PV2026Q1", "appId": "APP_123" },
  "items": [
    {
      "domainId": "OPEN",
      "familyId": "VM",
      "productId": "DISK_GB",
      "productName": "Disque (Go)",
      "env": "prod",
      "quantity": 1200,
      "unitPrice": 0.12,
      "cost": 144.0
    }
  ],
  "totals": { "cost": 7432.55 }
}
```

---

## 3) Materialized Views utilisées (V1 minimal durable)

> Principes :
- **1 MV “drill base”** = contient tous les pivots nécessaires au drill-down.
- **3 MVs d’agrégation** = accélèrent les widgets principaux sans casser le drill-down.

## 3.1 MV-01 — `mv_finops_drill_base` (socle drill-down)
**But** : servir toutes les pages drill-down (Domaine, Application) + certains widgets du dashboard via `GROUP BY`.

**Colonnes minimales**
- `period_month` (YYYY-MM)
- `app_id`
- `domain_id`
- `family_id` (nullable)
- `product_id`
- `env_label` (nullable, texte libre)
- `quantity` (NUMERIC)
- (optionnel) `calc_type` (`DIRECT`/`INDIRECT`) + `metadata_json` (pour détails)

**SQL (forme)**
```sql
CREATE MATERIALIZED VIEW mv_finops_drill_base AS
SELECT
  fc.period_month,
  fc.app_id,
  COALESCE(dp.domain_id, fc.domain_id) AS domain_id,
  dp.family_id,
  fc.product_id,
  fc.env_label,
  SUM(fc.quantity) AS quantity
FROM fact_consumption fc
LEFT JOIN dim_product dp ON dp.product_id = fc.product_id
-- ou fc porte déjà domain_id/family_id selon ingestion
GROUP BY
  fc.period_month, fc.app_id, COALESCE(dp.domain_id, fc.domain_id),
  dp.family_id, fc.product_id, fc.env_label;
```

---

## 3.2 MV-02 — `mv_finops_agg_domain_month_product`
**But** : dashboard “par domaine” + pages domaine (summary/trend) rapides.

**Colonnes**
- `period_month`
- `domain_id`
- `product_id`
- `quantity`

**SQL**
```sql
CREATE MATERIALIZED VIEW mv_finops_agg_domain_month_product AS
SELECT
  period_month,
  domain_id,
  product_id,
  SUM(quantity) AS quantity
FROM mv_finops_drill_base
GROUP BY period_month, domain_id, product_id;
```

---

## 3.3 MV-03 — `mv_finops_agg_app_month_product`
**But** : dashboard “top apps” + pages application (summary/trend) rapides.

**Colonnes**
- `period_month`
- `app_id`
- `product_id`
- `quantity`

**SQL**
```sql
CREATE MATERIALIZED VIEW mv_finops_agg_app_month_product AS
SELECT
  period_month,
  app_id,
  product_id,
  SUM(quantity) AS quantity
FROM mv_finops_drill_base
GROUP BY period_month, app_id, product_id;
```

---

## 3.4 MV-04 — `mv_finops_agg_total_month_product`
**But** : tendance “coût total” (et KPI global) sans recalcul lourd.

**Colonnes**
- `period_month`
- `product_id`
- `quantity`

**SQL**
```sql
CREATE MATERIALIZED VIEW mv_finops_agg_total_month_product AS
SELECT
  period_month,
  product_id,
  SUM(quantity) AS quantity
FROM mv_finops_drill_base
GROUP BY period_month, product_id;
```

---

## 4) Requêtes SQL type (join pricing view à la volée)

### 4.1 Coût par domaine (mois M, pricing view P)
```sql
SELECT
  d.domain_id,
  d.domain_name,
  SUM(m.quantity * pvi.unit_price) AS cost
FROM mv_finops_agg_domain_month_product m
JOIN pricing_view_item pvi
  ON pvi.pricing_view_id = :pricingViewId
 AND pvi.product_id = m.product_id
JOIN dim_domain d
  ON d.domain_id = m.domain_id
WHERE m.period_month = :month
GROUP BY d.domain_id, d.domain_name
ORDER BY cost DESC;
```

### 4.2 Top apps (mois M, pricing view P)
```sql
SELECT
  a.app_id,
  a.app_name,
  SUM(m.quantity * pvi.unit_price) AS cost
FROM mv_finops_agg_app_month_product m
JOIN pricing_view_item pvi
  ON pvi.pricing_view_id = :pricingViewId
 AND pvi.product_id = m.product_id
JOIN dim_application a
  ON a.app_id = m.app_id
WHERE m.period_month = :month
GROUP BY a.app_id, a.app_name
ORDER BY cost DESC
LIMIT :limit;
```

### 4.3 Détail produits d’une app (mois M, pricing view P, filtre domaine/env optionnels)
```sql
SELECT
  m.domain_id,
  m.family_id,
  m.product_id,
  pr.product_name,
  m.env_label,
  m.quantity,
  pvi.unit_price,
  (m.quantity * pvi.unit_price) AS cost
FROM mv_finops_drill_base m
JOIN pricing_view_item pvi
  ON pvi.pricing_view_id = :pricingViewId
 AND pvi.product_id = m.product_id
JOIN dim_product pr
  ON pr.product_id = m.product_id
WHERE m.period_month = :month
  AND m.app_id = :appId
  AND (:domainId IS NULL OR m.domain_id = :domainId)
  AND (:env IS NULL OR m.env_label = :env)
ORDER BY cost DESC;
```

---

## 5) Checklist “V1 prête prod” (FinOps UI)

- [ ] Les 3 pages existent : Dashboard / Domaine / Application
- [ ] Les paramètres globaux existent : `month`, `pricingViewId`
- [ ] Tous les endpoints renvoient `context` + `items` (format stable)
- [ ] Les MVs minimales (01→04) sont créées + refresh nightly
- [ ] Les drilldowns sont testés :  
  - Dashboard → Domaine (domainId présent)  
  - Dashboard → Application (appId présent)  
  - Domaine → Application (appId présent)  
  - Application → Domaine (domainId présent)  

---

## 6) Notes (V1 vs évolutions)

### V1.1 / V2 possibles
- Fusionner plusieurs widgets en 1 endpoint “screen payload”
- Ajouter une MV “variations precomputed” si besoin performance
- Introduire “hot month” vs “frozen history” plus tard (si freeze V1 est validé)
