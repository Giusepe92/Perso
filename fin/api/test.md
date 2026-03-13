BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP SCHEMA IF EXISTS finops_dm CASCADE;
CREATE SCHEMA finops_dm;

-- ============================================================
-- 2.1 DIMENSIONS
-- ============================================================

-- ---- dim_domain ----
CREATE TABLE finops_dm.dim_domain (
  domain_id           BIGSERIAL PRIMARY KEY,
  domain_code         TEXT NOT NULL UNIQUE,
  domain_name         TEXT NOT NULL,
  domain_description  TEXT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_indirect         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN finops_dm.dim_domain.is_indirect IS 
  'FALSE = quantity mesurée directement (ex: OPEN). TRUE = quantity calculée comme poids (coût OPEN app / coût OPEN total)';

-- ---- dim_family ----
CREATE TABLE finops_dm.dim_family (
  family_id           BIGSERIAL PRIMARY KEY,
  domain_id           BIGINT NOT NULL REFERENCES finops_dm.dim_domain(domain_id),
  family_code         TEXT NOT NULL,
  family_name         TEXT NOT NULL,
  family_description  TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dim_family_domain_code UNIQUE (domain_id, family_code)
);

-- ---- dim_product ----
CREATE TABLE finops_dm.dim_product (
  product_id           BIGSERIAL PRIMARY KEY,
  product_code         TEXT NOT NULL UNIQUE,
  product_name         TEXT NOT NULL,
  product_description  TEXT NULL,
  domain_id            BIGINT NOT NULL REFERENCES finops_dm.dim_domain(domain_id),
  family_id            BIGINT NULL REFERENCES finops_dm.dim_family(family_id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- dim_environment ----
CREATE TABLE finops_dm.dim_environment (
  environment_id          BIGSERIAL PRIMARY KEY,
  environment_code        TEXT NOT NULL UNIQUE,
  environment_name        TEXT NOT NULL,
  environment_description TEXT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2.2 PRICING VIEWS
-- ============================================================

-- ---- pricing_view ----
CREATE TABLE finops_dm.pricing_view (
  pricing_view_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_view_code  TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  created_by        TEXT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- pricing_view_line ----
CREATE TABLE finops_dm.pricing_view_line (
  pricing_view_id  UUID   NOT NULL REFERENCES finops_dm.pricing_view(pricing_view_id) ON DELETE CASCADE,
  product_id       BIGINT NOT NULL REFERENCES finops_dm.dim_product(product_id),
  unit_price       NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  currency         TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pricing_view_id, product_id)
);

-- ---- pricing_calendar ----
CREATE TABLE finops_dm.pricing_calendar (
  month           INTEGER PRIMARY KEY CHECK (
    month >= 190001 AND 
    month <= 999912 AND
    (month % 100) BETWEEN 1 AND 12
  ),
  pricing_view_id UUID NOT NULL REFERENCES finops_dm.pricing_view(pricing_view_id),
  is_frozen       BOOLEAN NOT NULL DEFAULT FALSE,
  frozen_at       TIMESTAMPTZ NULL,
  frozen_by       TEXT NULL,
  CONSTRAINT chk_frozen_consistency CHECK (
    (is_frozen = FALSE AND frozen_at IS NULL AND frozen_by IS NULL) OR
    (is_frozen = TRUE AND frozen_at IS NOT NULL AND frozen_by IS NOT NULL)
  )
);

-- ============================================================
-- 2.3 FACTS
-- ============================================================

-- ---- fact_consumption_monthly ----
CREATE TABLE finops_dm.fact_consumption_monthly (
  fact_id        BIGSERIAL PRIMARY KEY,
  month          INTEGER NOT NULL CHECK (
    month >= 190001 AND 
    month <= 999912 AND
    (month % 100) BETWEEN 1 AND 12
  ),
  application_id TEXT NOT NULL,
  product_id     BIGINT NOT NULL REFERENCES finops_dm.dim_product(product_id),
  domain_id      BIGINT NOT NULL REFERENCES finops_dm.dim_domain(domain_id),
  family_id      BIGINT NULL REFERENCES finops_dm.dim_family(family_id),
  environment_id BIGINT NULL REFERENCES finops_dm.dim_environment(environment_id),
  quantity       NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  resource       TEXT NULL,
  metadata       JSONB NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_fact_consumption_grain
ON finops_dm.fact_consumption_monthly (
  month,
  application_id,
  product_id,
  COALESCE(environment_id, -1),
  COALESCE(resource, '')
);

-- ============================================================
-- 2.4 BATCH RUNS / ADMIN / AUDIT
-- ============================================================

-- ---- etl_run ----
CREATE TABLE finops_dm.etl_run (
  run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name       TEXT NOT NULL,
  trigger_type   TEXT NOT NULL CHECK (trigger_type IN ('SCHEDULED', 'MANUAL')),
  triggered_by   TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED')),
  period         TEXT NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ NULL,
  duration_ms    BIGINT NULL,
  summary        JSONB NULL,
  CONSTRAINT chk_ended_at_logic CHECK (
    (status IN ('PENDING', 'RUNNING') AND ended_at IS NULL) OR
    (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED') AND ended_at IS NOT NULL)
  )
);

-- ---- etl_run_step ----
CREATE TABLE finops_dm.etl_run_step (
  run_id       UUID NOT NULL REFERENCES finops_dm.etl_run(run_id) ON DELETE CASCADE,
  step_key     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ NULL,
  duration_ms  BIGINT NULL,
  metrics      JSONB NULL,
  PRIMARY KEY (run_id, step_key),
  CONSTRAINT chk_ended_at_logic_step CHECK (
    (status IN ('PENDING', 'RUNNING') AND ended_at IS NULL) OR
    (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED') AND ended_at IS NOT NULL)
  )
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger 1 : Synchronisation domain_id/family_id
CREATE OR REPLACE FUNCTION finops_dm.sync_fact_dimensions()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.domain_id, p.family_id
  INTO NEW.domain_id, NEW.family_id
  FROM finops_dm.dim_product p
  WHERE p.product_id = NEW.product_id;
  
  IF NEW.domain_id IS NULL THEN
    RAISE EXCEPTION 'Product % does not exist in dim_product', NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_fact_dimensions
  BEFORE INSERT OR UPDATE ON finops_dm.fact_consumption_monthly
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.sync_fact_dimensions();

-- Trigger 2 : Calcul automatique duration_ms
CREATE OR REPLACE FUNCTION finops_dm.calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) * 1000;
  ELSE
    NEW.duration_ms := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_duration_run
  BEFORE INSERT OR UPDATE ON finops_dm.etl_run
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.calculate_duration();

CREATE TRIGGER trg_calculate_duration_step
  BEFORE INSERT OR UPDATE ON finops_dm.etl_run_step
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.calculate_duration();

-- Trigger 3 : Mise à jour automatique updated_at
CREATE OR REPLACE FUNCTION finops_dm.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_updated_at_fact
  BEFORE UPDATE ON finops_dm.fact_consumption_monthly
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

CREATE TRIGGER trg_update_updated_at_product
  BEFORE UPDATE ON finops_dm.dim_product
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

CREATE TRIGGER trg_update_updated_at_domain
  BEFORE UPDATE ON finops_dm.dim_domain
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

CREATE TRIGGER trg_update_updated_at_family
  BEFORE UPDATE ON finops_dm.dim_family
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

CREATE TRIGGER trg_update_updated_at_environment
  BEFORE UPDATE ON finops_dm.dim_environment
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

CREATE TRIGGER trg_update_updated_at_pricing_view
  BEFORE UPDATE ON finops_dm.pricing_view
  FOR EACH ROW
  EXECUTE FUNCTION finops_dm.update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

-- dim_product
CREATE INDEX idx_dim_product_domain_id ON finops_dm.dim_product(domain_id);
CREATE INDEX idx_dim_product_family_id ON finops_dm.dim_product(family_id);

-- pricing
CREATE INDEX idx_pricing_view_line_product ON finops_dm.pricing_view_line(product_id);
CREATE INDEX idx_pricing_calendar_view ON finops_dm.pricing_calendar(pricing_view_id);

-- fact (simples)
CREATE INDEX idx_fact_month ON finops_dm.fact_consumption_monthly(month);
CREATE INDEX idx_fact_app ON finops_dm.fact_consumption_monthly(application_id);
CREATE INDEX idx_fact_product ON finops_dm.fact_consumption_monthly(product_id);
CREATE INDEX idx_fact_domain ON finops_dm.fact_consumption_monthly(domain_id);
CREATE INDEX idx_fact_family ON finops_dm.fact_consumption_monthly(family_id);
CREATE INDEX idx_fact_environment ON finops_dm.fact_consumption_monthly(environment_id);
CREATE INDEX idx_fact_resource ON finops_dm.fact_consumption_monthly(resource);
CREATE INDEX idx_fact_metadata_gin ON finops_dm.fact_consumption_monthly USING GIN (metadata);

-- fact (composites)
CREATE INDEX idx_fact_month_domain ON finops_dm.fact_consumption_monthly(month, domain_id);
CREATE INDEX idx_fact_month_app ON finops_dm.fact_consumption_monthly(month, application_id);
CREATE INDEX idx_fact_month_product ON finops_dm.fact_consumption_monthly(month, product_id);
CREATE INDEX idx_fact_month_env ON finops_dm.fact_consumption_monthly(month, environment_id);

-- etl
CREATE INDEX idx_etl_run_period ON finops_dm.etl_run(period);
CREATE INDEX idx_etl_run_job ON finops_dm.etl_run(job_name);
CREATE INDEX idx_etl_run_status ON finops_dm.etl_run(status);

-- ============================================================
-- COMMENTAIRES
-- ============================================================

COMMENT ON SCHEMA finops_dm IS 
  'Data Mart FinOps : Consommations mensuelles et tarifications (4 domaines : OPEN, TRANSVERSE, RÉSEAU, CLUSTER)';

COMMENT ON TABLE finops_dm.fact_consumption_monthly IS 
  'Table de faits : Consommations mensuelles. Grain : (month, application_id, product_id, environment_id?, resource?)';

COMMENT ON COLUMN finops_dm.fact_consumption_monthly.month IS 
  'Mois de consommation au format YYYYMM (ex: 202511 = Novembre 2025). Type INTEGER pour correspondre au format source.';

COMMENT ON COLUMN finops_dm.fact_consumption_monthly.environment_id IS 
  'Environnement (DEV/PROD...). Obligatoire pour domaine OPEN, NULL pour autres domaines';

COMMENT ON COLUMN finops_dm.fact_consumption_monthly.domain_id IS 
  'Dénormalisé pour performance. Synchronisé automatiquement via trigger depuis dim_product';

COMMENT ON COLUMN finops_dm.fact_consumption_monthly.family_id IS 
  'Dénormalisé pour performance. Synchronisé automatiquement via trigger depuis dim_product';

COMMENT ON COLUMN finops_dm.fact_consumption_monthly.quantity IS 
  'OPEN : mesure réelle (API calls, GB, heures...). Autres domaines : poids calculé (coût OPEN app / coût OPEN total)';

COMMENT ON COLUMN finops_dm.pricing_calendar.month IS 
  'Mois au format YYYYMM (ex: 202511 = Novembre 2025). Type INTEGER pour correspondre au format source.';

COMMENT ON TRIGGER trg_sync_fact_dimensions ON finops_dm.fact_consumption_monthly IS 
  'Auto-remplit domain_id et family_id depuis dim_product. Valide que product_id existe.';

COMMENT ON FUNCTION finops_dm.calculate_duration() IS 
  'Calcule automatiquement duration_ms = (ended_at - started_at) en millisecondes.';

COMMENT ON FUNCTION finops_dm.update_updated_at() IS 
  'Met à jour automatiquement updated_at lors d''une modification.';

COMMIT;
