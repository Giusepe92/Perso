
# FinOps – Génération des Domaines Indirects à partir du domaine Open

Ce document décrit les trois éléments nécessaires pour générer les lignes de consommation indirectes (domaines abstraits) à partir du poids calculé sur le domaine **open**.

---

# 1️⃣ Création de l’index (à exécuter une seule fois)

Cet index garantit l’unicité des lignes par mois / application / produit.
Il est nécessaire pour permettre l'utilisation de `ON CONFLICT` dans la fonction.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS ux_fact_consumption_month_app_product
ON fact_consumption (period_month, application_id, product_id);
```

---

# 2️⃣ Création de la fonction PostgreSQL (à exécuter une seule fois)

Cette fonction :

- Calcule le coût Open par application selon la pricing view
- Calcule le poids de chaque application
- Génère les lignes pour les produits indirects (abstract_*)
- Insère les lignes dans `fact_consumption`
- Met à jour si la ligne existe déjà

⚠️ IMPORTANT : Modifier la liste des produits indirects dans le bloc `ARRAY[...]`.

```sql
CREATE OR REPLACE FUNCTION finops_generate_indirect_from_open(
  p_period_month date,
  p_pricing_view_id text,
  p_run_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN

  WITH
  indirect_products AS (
    SELECT unnest(ARRAY[
      /* >>> METTRE ICI LES PRODUITS INDIRECTS <<< */
      'abstract_network',
      'abstract_transversal'
      /* ,'abstract_security' */
    ]::text[]) AS product_id
  ),

  open_lines AS (
    SELECT
      fc.period_month,
      fc.application_id,
      fc.product_id,
      fc.quantity,
      pvl.unit_price,
      (fc.quantity * pvl.unit_price) AS line_cost
    FROM fact_consumption fc
    JOIN dim_product dp
      ON dp.product_id = fc.product_id
     AND dp.domain_id = 'open'
    JOIN pricing_view_line pvl
      ON pvl.product_id = fc.product_id
     AND pvl.pricing_view_id = p_pricing_view_id
    WHERE fc.period_month = p_period_month
  ),

  app_open_cost AS (
    SELECT
      period_month,
      application_id,
      SUM(line_cost) AS open_cost
    FROM open_lines
    GROUP BY period_month, application_id
  ),

  total_open AS (
    SELECT
      period_month,
      SUM(open_cost) AS total_open_cost
    FROM app_open_cost
    GROUP BY period_month
  ),

  app_weights AS (
    SELECT
      a.period_month,
      a.application_id,
      CASE
        WHEN t.total_open_cost = 0 THEN 0
        ELSE a.open_cost / t.total_open_cost
      END AS weight_value
    FROM app_open_cost a
    JOIN total_open t
      ON t.period_month = a.period_month
  ),

  indirect_pricing AS (
    SELECT
      ip.product_id,
      pvl.unit_price
    FROM indirect_products ip
    JOIN pricing_view_line pvl
      ON pvl.product_id = ip.product_id
     AND pvl.pricing_view_id = p_pricing_view_id
  )

  INSERT INTO fact_consumption (
    period_month,
    application_id,
    product_id,
    quantity,
    metadata,
    run_id
  )
  SELECT
    aw.period_month,
    aw.application_id,
    ip.product_id,
    aw.weight_value::numeric AS quantity,
    jsonb_build_object(
      'source', 'indirect_allocation',
      'weight_base', 'open_cost_share',
      'pricing_view_id', p_pricing_view_id,
      'base_domain_id', 'open'
    ) AS metadata,
    p_run_id
  FROM app_weights aw
  CROSS JOIN indirect_pricing ip
  WHERE aw.weight_value > 0

  ON CONFLICT (period_month, application_id, product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    metadata = EXCLUDED.metadata,
    run_id = EXCLUDED.run_id;

END;
$$;
```

---

# 3️⃣ Exécution de la fonction (à exécuter à chaque batch)

Cette requête déclenche la génération des lignes indirectes pour un mois et une pricing view donnée.

```sql
SELECT finops_generate_indirect_from_open(
  p_period_month := DATE '2026-03-01',
  p_pricing_view_id := 'pv_2026_q1',
  p_run_id := 'run_2026_03_01_0001'
);
```

---

# Résumé du process batch

1. Calcul et insertion des lignes Open dans `fact_consumption`
2. Exécution de la fonction `finops_generate_indirect_from_open`
3. Les domaines indirects sont automatiquement générés
4. Les coûts indirects sont calculés dynamiquement via la pricing view

---

Fin du document.
