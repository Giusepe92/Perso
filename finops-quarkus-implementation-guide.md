# Guide complet d’implémentation FinOps Quarkus (DataMart → Services)

> Ce guide couvre l’implémentation **jusqu’à la couche service Quarkus** à partir du schéma SQL fourni, pour alimenter les endpoints FinOps déjà préparés côté API.  
> Il est structuré pour être suivi pas à pas et rester pragmatique pour une V1 orientée dashboards.

---

# 1. Objectif

À partir de la base PostgreSQL `finops_dm`, construire :

1. les **materialized views** de lecture
2. les **entities Quarkus**
3. les **DTO**
4. les **repositories SQL**
5. les **mappers**
6. les **services**

Le flux cible est :

    fact_consumption_monthly
            ↓
    materialized views
            ↓
    repositories SQL
            ↓
    mappers
            ↓
    DTO
            ↓
    services
            ↓
    resources REST (déjà préparées chez toi)

---

# 2. Schéma source utilisé

Le modèle fourni contient :

## Dimensions
- `finops_dm.dim_domain`
- `finops_dm.dim_family`
- `finops_dm.dim_product`
- `finops_dm.dim_environment`

## Pricing
- `finops_dm.pricing_view`
- `finops_dm.pricing_view_line`
- `finops_dm.pricing_calendar`

## Fact
- `finops_dm.fact_consumption_monthly`

## Batch / audit
- `finops_dm.etl_run`
- `finops_dm.etl_run_step`

## Point central de valorisation
La consommation est stockée dans :

- `fact_consumption_monthly.quantity`

Le coût se calcule à la lecture par :

`quantity × pricing_view_line.unit_price`

Donc il faut **garder `product_id`** dans les vues de lecture.

---

# 3. Principe d’architecture recommandé

## 3.1 Ce qu’on ne fait pas
Ne pas créer :
- une MV par endpoint
- une MV par widget
- une entity JPA complexe par jointure métier
- des relations ORM lourdes entre toutes les dimensions

## 3.2 Ce qu’on fait
Créer :
- **1 MV principale** pour les breakdowns/détails
- **1 MV historique** pour les trends
- des repositories SQL explicites
- des mappers simples
- des services lisibles

---

# 4. Materialized Views à créer

## 4.1 MV principale : `mv_finops_cost_base`

### Usage
Elle alimente :
- global summary
- global domains
- global top apps
- pages domain
- pages application
- détail intersection
- listes

### Grain
Une ligne par :

`month + application_id + product_id + domain_id + family_id + environment_id`

### SQL

```sql
DROP MATERIALIZED VIEW IF EXISTS finops_dm.mv_finops_cost_base;

CREATE MATERIALIZED VIEW finops_dm.mv_finops_cost_base AS
SELECT
    f.month,
    f.application_id,
    f.product_id,
    f.domain_id,
    d.domain_code,
    d.domain_name,
    f.family_id,
    fam.family_code,
    fam.family_name,
    f.environment_id,
    env.environment_code,
    env.environment_name,
    p.product_code,
    p.product_name,
    SUM(f.quantity) AS quantity
FROM finops_dm.fact_consumption_monthly f
JOIN finops_dm.dim_domain d
    ON d.domain_id = f.domain_id
LEFT JOIN finops_dm.dim_family fam
    ON fam.family_id = f.family_id
JOIN finops_dm.dim_product p
    ON p.product_id = f.product_id
LEFT JOIN finops_dm.dim_environment env
    ON env.environment_id = f.environment_id
GROUP BY
    f.month,
    f.application_id,
    f.product_id,
    f.domain_id,
    d.domain_code,
    d.domain_name,
    f.family_id,
    fam.family_code,
    fam.family_name,
    f.environment_id,
    env.environment_code,
    env.environment_name,
    p.product_code,
    p.product_name;
```

## 4.2 MV historique : `mv_finops_cost_history`

### Usage
Elle alimente :
- global trend
- trend domain
- trend application
- trend intersection domain × application

### Grain
Une ligne par :

`month + application_id + domain_id + product_id`

### SQL

```sql
DROP MATERIALIZED VIEW IF EXISTS finops_dm.mv_finops_cost_history;

CREATE MATERIALIZED VIEW finops_dm.mv_finops_cost_history AS
SELECT
    f.month,
    f.application_id,
    f.domain_id,
    d.domain_code,
    d.domain_name,
    f.product_id,
    p.product_code,
    p.product_name,
    SUM(f.quantity) AS quantity
FROM finops_dm.fact_consumption_monthly f
JOIN finops_dm.dim_domain d
    ON d.domain_id = f.domain_id
JOIN finops_dm.dim_product p
    ON p.product_id = f.product_id
GROUP BY
    f.month,
    f.application_id,
    f.domain_id,
    d.domain_code,
    d.domain_name,
    f.product_id,
    p.product_code,
    p.product_name;
```

---

# 5. Indexes à créer sur les MV

## 5.1 MV base

```sql
CREATE INDEX idx_mv_finops_cost_base_month
ON finops_dm.mv_finops_cost_base(month);

CREATE INDEX idx_mv_finops_cost_base_app
ON finops_dm.mv_finops_cost_base(application_id);

CREATE INDEX idx_mv_finops_cost_base_domain
ON finops_dm.mv_finops_cost_base(domain_id);

CREATE INDEX idx_mv_finops_cost_base_family
ON finops_dm.mv_finops_cost_base(family_id);

CREATE INDEX idx_mv_finops_cost_base_product
ON finops_dm.mv_finops_cost_base(product_id);

CREATE INDEX idx_mv_finops_cost_base_environment
ON finops_dm.mv_finops_cost_base(environment_id);

CREATE INDEX idx_mv_finops_cost_base_month_app_domain
ON finops_dm.mv_finops_cost_base(month, application_id, domain_id);
```

## 5.2 MV history

```sql
CREATE INDEX idx_mv_finops_cost_history_month
ON finops_dm.mv_finops_cost_history(month);

CREATE INDEX idx_mv_finops_cost_history_app
ON finops_dm.mv_finops_cost_history(application_id);

CREATE INDEX idx_mv_finops_cost_history_domain
ON finops_dm.mv_finops_cost_history(domain_id);

CREATE INDEX idx_mv_finops_cost_history_product
ON finops_dm.mv_finops_cost_history(product_id);

CREATE INDEX idx_mv_finops_cost_history_month_app_domain
ON finops_dm.mv_finops_cost_history(month, application_id, domain_id);
```

## 5.3 Pricing

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_view_line_pv_product
ON finops_dm.pricing_view_line(pricing_view_id, product_id);
```

---

# 6. Refresh strategy

À déclencher après le batch d’alimentation :

```sql
REFRESH MATERIALIZED VIEW finops_dm.mv_finops_cost_base;
REFRESH MATERIALIZED VIEW finops_dm.mv_finops_cost_history;
```

Pour une V1 :
- refresh synchrone à la fin du batch
- pas besoin de `CONCURRENTLY` tout de suite

---

# 7. Structure Java recommandée

```text
src/main/java/com/yourcompany/finops/
├── dto
│   ├── common
│   ├── context
│   ├── global
│   ├── domain
│   ├── application
│   └── detail
├── entity
│   ├── table
│   └── mv
├── mapper
├── repository
├── service
│   ├── api
│   └── impl
└── resource
```

---

# 8. Entities Quarkus à créer

## 8.1 Table entities

### `PricingViewEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_view", schema = "finops_dm")
public class PricingViewEntity {

    @Id
    @Column(name = "pricing_view_id")
    public UUID pricingViewId;

    @Column(name = "pricing_view_code", nullable = false, unique = true)
    public String pricingViewCode;

    @Column(name = "name", nullable = false)
    public String name;

    @Column(name = "created_by")
    public String createdBy;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### `PricingViewLineId.java`

```java
package com.yourcompany.finops.entity.table;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class PricingViewLineId implements Serializable {
    public UUID pricingViewId;
    public Long productId;

    public PricingViewLineId() {}

    public PricingViewLineId(UUID pricingViewId, Long productId) {
        this.pricingViewId = pricingViewId;
        this.productId = productId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PricingViewLineId that)) return false;
        return Objects.equals(pricingViewId, that.pricingViewId)
            && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(pricingViewId, productId);
    }
}
```

### `PricingViewLineEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_view_line", schema = "finops_dm")
@IdClass(PricingViewLineId.class)
public class PricingViewLineEntity {

    @Id
    @Column(name = "pricing_view_id")
    public UUID pricingViewId;

    @Id
    @Column(name = "product_id")
    public Long productId;

    @Column(name = "unit_price", nullable = false)
    public BigDecimal unitPrice;

    @Column(name = "currency", nullable = false)
    public String currency;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;
}
```

### `PricingCalendarEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_calendar", schema = "finops_dm")
public class PricingCalendarEntity {

    @Id
    @Column(name = "month")
    public Integer month;

    @Column(name = "pricing_view_id", nullable = false)
    public UUID pricingViewId;

    @Column(name = "is_frozen", nullable = false)
    public Boolean isFrozen;

    @Column(name = "frozen_at")
    public OffsetDateTime frozenAt;

    @Column(name = "frozen_by")
    public String frozenBy;
}
```

### `DomainEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_domain", schema = "finops_dm")
public class DomainEntity {

    @Id
    @Column(name = "domain_id")
    public Long domainId;

    @Column(name = "domain_code", nullable = false, unique = true)
    public String domainCode;

    @Column(name = "domain_name", nullable = false)
    public String domainName;

    @Column(name = "domain_description")
    public String domainDescription;

    @Column(name = "is_active", nullable = false)
    public Boolean isActive;

    @Column(name = "is_indirect", nullable = false)
    public Boolean isIndirect;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### `FamilyEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_family", schema = "finops_dm")
public class FamilyEntity {

    @Id
    @Column(name = "family_id")
    public Long familyId;

    @Column(name = "domain_id", nullable = false)
    public Long domainId;

    @Column(name = "family_code", nullable = false)
    public String familyCode;

    @Column(name = "family_name", nullable = false)
    public String familyName;

    @Column(name = "family_description")
    public String familyDescription;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### `ProductEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_product", schema = "finops_dm")
public class ProductEntity {

    @Id
    @Column(name = "product_id")
    public Long productId;

    @Column(name = "product_code", nullable = false, unique = true)
    public String productCode;

    @Column(name = "product_name", nullable = false)
    public String productName;

    @Column(name = "product_description")
    public String productDescription;

    @Column(name = "domain_id", nullable = false)
    public Long domainId;

    @Column(name = "family_id")
    public Long familyId;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### `EnvironmentEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_environment", schema = "finops_dm")
public class EnvironmentEntity {

    @Id
    @Column(name = "environment_id")
    public Long environmentId;

    @Column(name = "environment_code", nullable = false, unique = true)
    public String environmentCode;

    @Column(name = "environment_name", nullable = false)
    public String environmentName;

    @Column(name = "environment_description")
    public String environmentDescription;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### `FactConsumptionMonthlyEntity.java`

```java
package com.yourcompany.finops.entity.table;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fact_consumption_monthly", schema = "finops_dm")
public class FactConsumptionMonthlyEntity {

    @Id
    @Column(name = "fact_id")
    public Long factId;

    @Column(name = "month", nullable = false)
    public Integer month;

    @Column(name = "application_id", nullable = false)
    public String applicationId;

    @Column(name = "product_id", nullable = false)
    public Long productId;

    @Column(name = "domain_id", nullable = false)
    public Long domainId;

    @Column(name = "family_id")
    public Long familyId;

    @Column(name = "environment_id")
    public Long environmentId;

    @Column(name = "quantity", nullable = false)
    public BigDecimal quantity;

    @Column(name = "resource")
    public String resource;

    @Column(name = "metadata", columnDefinition = "jsonb")
    public String metadata;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

## 8.2 MV entities

### `CostBaseId.java`

```java
package com.yourcompany.finops.entity.mv;

import java.io.Serializable;
import java.util.Objects;

public class CostBaseId implements Serializable {
    public Integer month;
    public String applicationId;
    public Long productId;
    public Long domainId;
    public Long familyId;
    public Long environmentId;

    public CostBaseId() {}

    public CostBaseId(Integer month, String applicationId, Long productId, Long domainId, Long familyId, Long environmentId) {
        this.month = month;
        this.applicationId = applicationId;
        this.productId = productId;
        this.domainId = domainId;
        this.familyId = familyId;
        this.environmentId = environmentId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CostBaseId that)) return false;
        return Objects.equals(month, that.month)
            && Objects.equals(applicationId, that.applicationId)
            && Objects.equals(productId, that.productId)
            && Objects.equals(domainId, that.domainId)
            && Objects.equals(familyId, that.familyId)
            && Objects.equals(environmentId, that.environmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(month, applicationId, productId, domainId, familyId, environmentId);
    }
}
```

### `CostBaseEntity.java`

```java
package com.yourcompany.finops.entity.mv;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mv_finops_cost_base", schema = "finops_dm")
@IdClass(CostBaseId.class)
public class CostBaseEntity {

    @Id
    @Column(name = "month")
    public Integer month;

    @Id
    @Column(name = "application_id")
    public String applicationId;

    @Id
    @Column(name = "product_id")
    public Long productId;

    @Id
    @Column(name = "domain_id")
    public Long domainId;

    @Id
    @Column(name = "family_id")
    public Long familyId;

    @Id
    @Column(name = "environment_id")
    public Long environmentId;

    @Column(name = "domain_code")
    public String domainCode;

    @Column(name = "domain_name")
    public String domainName;

    @Column(name = "family_code")
    public String familyCode;

    @Column(name = "family_name")
    public String familyName;

    @Column(name = "environment_code")
    public String environmentCode;

    @Column(name = "environment_name")
    public String environmentName;

    @Column(name = "product_code")
    public String productCode;

    @Column(name = "product_name")
    public String productName;

    @Column(name = "quantity")
    public BigDecimal quantity;
}
```

### `CostHistoryId.java`

```java
package com.yourcompany.finops.entity.mv;

import java.io.Serializable;
import java.util.Objects;

public class CostHistoryId implements Serializable {
    public Integer month;
    public String applicationId;
    public Long domainId;
    public Long productId;

    public CostHistoryId() {}

    public CostHistoryId(Integer month, String applicationId, Long domainId, Long productId) {
        this.month = month;
        this.applicationId = applicationId;
        this.domainId = domainId;
        this.productId = productId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CostHistoryId that)) return false;
        return Objects.equals(month, that.month)
            && Objects.equals(applicationId, that.applicationId)
            && Objects.equals(domainId, that.domainId)
            && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(month, applicationId, domainId, productId);
    }
}
```

### `CostHistoryEntity.java`

```java
package com.yourcompany.finops.entity.mv;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mv_finops_cost_history", schema = "finops_dm")
@IdClass(CostHistoryId.class)
public class CostHistoryEntity {

    @Id
    @Column(name = "month")
    public Integer month;

    @Id
    @Column(name = "application_id")
    public String applicationId;

    @Id
    @Column(name = "domain_id")
    public Long domainId;

    @Id
    @Column(name = "product_id")
    public Long productId;

    @Column(name = "domain_code")
    public String domainCode;

    @Column(name = "domain_name")
    public String domainName;

    @Column(name = "product_code")
    public String productCode;

    @Column(name = "product_name")
    public String productName;

    @Column(name = "quantity")
    public BigDecimal quantity;
}
```

---

# 9. DTO à créer

## Common

### `SelectOptionDto.java`

```java
package com.yourcompany.finops.dto.common;

public record SelectOptionDto(
    String value,
    String label
) {}
```

### `TrendPointDto.java`

```java
package com.yourcompany.finops.dto.common;

import java.math.BigDecimal;

public record TrendPointDto(
    Integer month,
    BigDecimal cost
) {}
```

### `BreakdownItemDto.java`

```java
package com.yourcompany.finops.dto.common;

import java.math.BigDecimal;

public record BreakdownItemDto(
    String elementId,
    String elementLabel,
    BigDecimal cost
) {}
```

### `VariationDto.java`

```java
package com.yourcompany.finops.dto.common;

import java.math.BigDecimal;

public record VariationDto(
    String elementId,
    String elementName,
    BigDecimal delta
) {}
```

### `ItemsResponse.java`

```java
package com.yourcompany.finops.dto.common;

import java.util.List;

public record ItemsResponse<T>(
    List<T> items
) {}
```

## Context

### `FinopsContextDto.java`

```java
package com.yourcompany.finops.dto.context;

import com.yourcompany.finops.dto.common.SelectOptionDto;
import java.util.List;

public record FinopsContextDto(
    Integer month,
    String pv,
    String currency,
    List<SelectOptionDto> availablePeriods,
    List<SelectOptionDto> availablePricingViews
) {}
```

## Summary

### `FinopsSummaryDto.java`

```java
package com.yourcompany.finops.dto.global;

import java.math.BigDecimal;

public record FinopsSummaryDto(
    Integer month,
    String pricingViewId,
    BigDecimal totalCost,
    BigDecimal previousMonthCost,
    String currency
) {}
```

## Detail

### `CalcDetailsDto.java`

```java
package com.yourcompany.finops.dto.detail;

public record CalcDetailsDto(
    String source,
    String rule,
    String pricingViewId,
    String runId
) {}
```

### `DetailFlatRowDto.java`

```java
package com.yourcompany.finops.dto.detail;

import java.math.BigDecimal;

public record DetailFlatRowDto(
    Integer month,
    String environment,
    String familyId,
    String familyName,
    String productId,
    String productName,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal cost,
    CalcDetailsDto calcDetails
) {}
```

### `DomainAppDetailDto.java`

```java
package com.yourcompany.finops.dto.detail;

import java.util.List;

public record DomainAppDetailDto(
    String applicationId,
    String domainId,
    String domainName,
    String currency,
    List<DetailFlatRowDto> rows
) {}
```

---

# 10. Mappers à créer

## `CommonMapper.java`

```java
package com.yourcompany.finops.mapper;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.SelectOptionDto;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.common.VariationDto;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;

@ApplicationScoped
public class CommonMapper {

    public SelectOptionDto toSelectOption(Object[] row) {
        return new SelectOptionDto(
            row[0] != null ? row[0].toString() : "",
            row[1] != null ? row[1].toString() : ""
        );
    }

    public BreakdownItemDto toBreakdownItem(Object[] row) {
        return new BreakdownItemDto(
            row[0] != null ? row[0].toString() : "",
            row[1] != null ? row[1].toString() : "",
            (BigDecimal) row[2]
        );
    }

    public TrendPointDto toTrendPoint(Object[] row) {
        return new TrendPointDto(
            ((Number) row[0]).intValue(),
            (BigDecimal) row[1]
        );
    }

    public VariationDto toVariation(Object[] row) {
        return new VariationDto(
            row[0] != null ? row[0].toString() : "",
            row[1] != null ? row[1].toString() : "",
            (BigDecimal) row[2]
        );
    }
}
```

## `SummaryMapper.java`

```java
package com.yourcompany.finops.mapper;

import com.yourcompany.finops.dto.global.FinopsSummaryDto;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;

@ApplicationScoped
public class SummaryMapper {

    public FinopsSummaryDto toSummary(
        Integer month,
        String pricingViewId,
        BigDecimal totalCost,
        BigDecimal previousMonthCost,
        String currency
    ) {
        return new FinopsSummaryDto(
            month,
            pricingViewId,
            totalCost != null ? totalCost : BigDecimal.ZERO,
            previousMonthCost != null ? previousMonthCost : BigDecimal.ZERO,
            currency != null ? currency : "EUR"
        );
    }
}
```

## `DetailMapper.java`

```java
package com.yourcompany.finops.mapper;

import com.yourcompany.finops.dto.detail.CalcDetailsDto;
import com.yourcompany.finops.dto.detail.DetailFlatRowDto;
import com.yourcompany.finops.dto.detail.DomainAppDetailDto;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class DetailMapper {

    public DetailFlatRowDto toDetailRow(Object[] row, String pricingViewCode) {
        return new DetailFlatRowDto(
            ((Number) row[0]).intValue(),
            row[1] != null ? row[1].toString() : "N/A",
            row[2] != null ? row[2].toString() : "N/A",
            row[3] != null ? row[3].toString() : "N/A",
            row[4] != null ? row[4].toString() : "N/A",
            row[5] != null ? row[5].toString() : "N/A",
            (BigDecimal) row[6],
            (BigDecimal) row[7],
            (BigDecimal) row[8],
            new CalcDetailsDto(
                "FINOPS_DB",
                "quantity * pricing_view_line.unit_price",
                pricingViewCode,
                null
            )
        );
    }

    public DomainAppDetailDto toDetailResponse(
        String applicationId,
        String domainId,
        String domainName,
        String currency,
        List<DetailFlatRowDto> rows
    ) {
        return new DomainAppDetailDto(
            applicationId,
            domainId,
            domainName,
            currency,
            rows
        );
    }
}
```

---

# 11. Services à créer

## `FinopsContextService.java`

```java
package com.yourcompany.finops.service.api;

import com.yourcompany.finops.dto.context.FinopsContextDto;

public interface FinopsContextService {
    FinopsContextDto getDefaultContext();
}
```

## `FinopsContextServiceImpl.java`

```java
package com.yourcompany.finops.service.impl;

import com.yourcompany.finops.dto.common.SelectOptionDto;
import com.yourcompany.finops.dto.context.FinopsContextDto;
import com.yourcompany.finops.mapper.CommonMapper;
import com.yourcompany.finops.repository.FinopsContextRepository;
import com.yourcompany.finops.service.api.FinopsContextService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;

@ApplicationScoped
public class FinopsContextServiceImpl implements FinopsContextService {

    @Inject
    FinopsContextRepository repository;

    @Inject
    CommonMapper commonMapper;

    @Override
    public FinopsContextDto getDefaultContext() {
        Object[] defaultRow = repository.findDefaultContextRow();

        Integer month = ((Number) defaultRow[0]).intValue();
        String pv = defaultRow[1].toString();
        String currency = defaultRow[2] != null ? defaultRow[2].toString() : "EUR";

        List<SelectOptionDto> periods = repository.findAvailablePeriods()
            .stream()
            .map(commonMapper::toSelectOption)
            .toList();

        List<SelectOptionDto> pricingViews = repository.findAvailablePricingViews()
            .stream()
            .map(commonMapper::toSelectOption)
            .toList();

        return new FinopsContextDto(month, pv, currency, periods, pricingViews);
    }
}
```

## `FinopsGlobalService.java`

```java
package com.yourcompany.finops.service.api;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;

public interface FinopsGlobalService {
    FinopsSummaryDto getSummary(Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getDomainBreakdown(Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getTopApplications(Integer month, String pricingViewCode, int limit);
    ItemsResponse<TrendPointDto> getTrend(Integer month, String pricingViewCode);
}
```

## `FinopsGlobalServiceImpl.java`

```java
package com.yourcompany.finops.service.impl;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;
import com.yourcompany.finops.mapper.CommonMapper;
import com.yourcompany.finops.mapper.SummaryMapper;
import com.yourcompany.finops.repository.FinopsGlobalRepository;
import com.yourcompany.finops.service.api.FinopsGlobalService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class FinopsGlobalServiceImpl implements FinopsGlobalService {

    @Inject
    FinopsGlobalRepository repository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    CommonMapper commonMapper;

    @Override
    public FinopsSummaryDto getSummary(Integer month, String pricingViewCode) {
        BigDecimal totalCost = repository.findTotalCost(month, pricingViewCode);
        BigDecimal previousMonthCost = repository.findTotalCost(previousMonth(month), pricingViewCode);

        return summaryMapper.toSummary(
            month,
            pricingViewCode,
            totalCost,
            previousMonthCost,
            "EUR"
        );
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getDomainBreakdown(Integer month, String pricingViewCode) {
        List<BreakdownItemDto> items = repository.findDomainBreakdown(month, pricingViewCode)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getTopApplications(Integer month, String pricingViewCode, int limit) {
        List<BreakdownItemDto> items = repository.findTopApplications(month, pricingViewCode, limit)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<TrendPointDto> getTrend(Integer month, String pricingViewCode) {
        List<TrendPointDto> items = repository.findTrend(month, pricingViewCode)
            .stream()
            .map(commonMapper::toTrendPoint)
            .toList();

        return new ItemsResponse<>(items);
    }

    private Integer previousMonth(Integer month) {
        int year = month / 100;
        int mm = month % 100;
        return mm == 1 ? ((year - 1) * 100) + 12 : (year * 100) + (mm - 1);
    }
}
```

## `FinopsDomainService.java`

```java
package com.yourcompany.finops.service.api;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;

public interface FinopsDomainService {
    FinopsSummaryDto getSummary(String domainCode, Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getFamilyBreakdown(String domainCode, Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getEnvironmentBreakdown(String domainCode, Integer month, String pricingViewCode);
    ItemsResponse<TrendPointDto> getTrend(String domainCode, Integer month, String pricingViewCode);
}
```

## `FinopsDomainServiceImpl.java`

```java
package com.yourcompany.finops.service.impl;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;
import com.yourcompany.finops.mapper.CommonMapper;
import com.yourcompany.finops.mapper.SummaryMapper;
import com.yourcompany.finops.repository.FinopsDomainRepository;
import com.yourcompany.finops.service.api.FinopsDomainService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class FinopsDomainServiceImpl implements FinopsDomainService {

    @Inject
    FinopsDomainRepository repository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    CommonMapper commonMapper;

    @Override
    public FinopsSummaryDto getSummary(String domainCode, Integer month, String pricingViewCode) {
        BigDecimal totalCost = repository.findDomainTotalCost(month, pricingViewCode, domainCode);
        BigDecimal previousCost = repository.findDomainTotalCost(previousMonth(month), pricingViewCode, domainCode);

        return summaryMapper.toSummary(
            month,
            pricingViewCode,
            totalCost,
            previousCost,
            "EUR"
        );
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getFamilyBreakdown(String domainCode, Integer month, String pricingViewCode) {
        List<BreakdownItemDto> items = repository.findFamilyBreakdown(month, pricingViewCode, domainCode)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getEnvironmentBreakdown(String domainCode, Integer month, String pricingViewCode) {
        List<BreakdownItemDto> items = repository.findEnvironmentBreakdown(month, pricingViewCode, domainCode)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<TrendPointDto> getTrend(String domainCode, Integer month, String pricingViewCode) {
        List<TrendPointDto> items = repository.findTrend(month, pricingViewCode, domainCode)
            .stream()
            .map(commonMapper::toTrendPoint)
            .toList();

        return new ItemsResponse<>(items);
    }

    private Integer previousMonth(Integer month) {
        int year = month / 100;
        int mm = month % 100;
        return mm == 1 ? ((year - 1) * 100) + 12 : (year * 100) + (mm - 1);
    }
}
```

## `FinopsApplicationService.java`

```java
package com.yourcompany.finops.service.api;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;

public interface FinopsApplicationService {
    FinopsSummaryDto getSummary(String applicationId, Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getDomainBreakdown(String applicationId, Integer month, String pricingViewCode);
    ItemsResponse<BreakdownItemDto> getEnvironmentBreakdown(String applicationId, Integer month, String pricingViewCode);
    ItemsResponse<TrendPointDto> getTrend(String applicationId, Integer month, String pricingViewCode);
}
```

## `FinopsApplicationServiceImpl.java`

```java
package com.yourcompany.finops.service.impl;

import com.yourcompany.finops.dto.common.BreakdownItemDto;
import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;
import com.yourcompany.finops.mapper.CommonMapper;
import com.yourcompany.finops.mapper.SummaryMapper;
import com.yourcompany.finops.repository.FinopsApplicationRepository;
import com.yourcompany.finops.service.api.FinopsApplicationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class FinopsApplicationServiceImpl implements FinopsApplicationService {

    @Inject
    FinopsApplicationRepository repository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    CommonMapper commonMapper;

    @Override
    public FinopsSummaryDto getSummary(String applicationId, Integer month, String pricingViewCode) {
        BigDecimal totalCost = repository.findApplicationTotalCost(month, pricingViewCode, applicationId);
        BigDecimal previousCost = repository.findApplicationTotalCost(previousMonth(month), pricingViewCode, applicationId);

        return summaryMapper.toSummary(
            month,
            pricingViewCode,
            totalCost,
            previousCost,
            "EUR"
        );
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getDomainBreakdown(String applicationId, Integer month, String pricingViewCode) {
        List<BreakdownItemDto> items = repository.findDomainBreakdown(month, pricingViewCode, applicationId)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<BreakdownItemDto> getEnvironmentBreakdown(String applicationId, Integer month, String pricingViewCode) {
        List<BreakdownItemDto> items = repository.findEnvironmentBreakdown(month, pricingViewCode, applicationId)
            .stream()
            .map(commonMapper::toBreakdownItem)
            .toList();

        return new ItemsResponse<>(items);
    }

    @Override
    public ItemsResponse<TrendPointDto> getTrend(String applicationId, Integer month, String pricingViewCode) {
        List<TrendPointDto> items = repository.findTrend(month, pricingViewCode, applicationId)
            .stream()
            .map(commonMapper::toTrendPoint)
            .toList();

        return new ItemsResponse<>(items);
    }

    private Integer previousMonth(Integer month) {
        int year = month / 100;
        int mm = month % 100;
        return mm == 1 ? ((year - 1) * 100) + 12 : (year * 100) + (mm - 1);
    }
}
```

## `FinopsDetailService.java`

```java
package com.yourcompany.finops.service.api;

import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.detail.DomainAppDetailDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;

public interface FinopsDetailService {
    FinopsSummaryDto getSummary(String applicationId, String domainCode, Integer month, String pricingViewCode);
    DomainAppDetailDto getDetails(String applicationId, String domainCode, Integer month, String pricingViewCode);
    ItemsResponse<TrendPointDto> getTrend(String applicationId, String domainCode, Integer month, String pricingViewCode);
}
```

## `FinopsDetailServiceImpl.java`

```java
package com.yourcompany.finops.service.impl;

import com.yourcompany.finops.dto.common.ItemsResponse;
import com.yourcompany.finops.dto.common.TrendPointDto;
import com.yourcompany.finops.dto.detail.DetailFlatRowDto;
import com.yourcompany.finops.dto.detail.DomainAppDetailDto;
import com.yourcompany.finops.dto.global.FinopsSummaryDto;
import com.yourcompany.finops.mapper.CommonMapper;
import com.yourcompany.finops.mapper.DetailMapper;
import com.yourcompany.finops.mapper.SummaryMapper;
import com.yourcompany.finops.repository.FinopsDetailRepository;
import com.yourcompany.finops.service.api.FinopsDetailService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class FinopsDetailServiceImpl implements FinopsDetailService {

    @Inject
    FinopsDetailRepository repository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    DetailMapper detailMapper;

    @Inject
    CommonMapper commonMapper;

    @Override
    public FinopsSummaryDto getSummary(String applicationId, String domainCode, Integer month, String pricingViewCode) {
        BigDecimal totalCost = repository.findTotalCost(month, pricingViewCode, applicationId, domainCode);
        BigDecimal previousCost = repository.findTotalCost(previousMonth(month), pricingViewCode, applicationId, domainCode);

        return summaryMapper.toSummary(
            month,
            pricingViewCode,
            totalCost,
            previousCost,
            "EUR"
        );
    }

    @Override
    public DomainAppDetailDto getDetails(String applicationId, String domainCode, Integer month, String pricingViewCode) {
        List<DetailFlatRowDto> rows = repository.findDetailRows(month, pricingViewCode, applicationId, domainCode)
            .stream()
            .map(row -> detailMapper.toDetailRow(row, pricingViewCode))
            .toList();

        return detailMapper.toDetailResponse(
            applicationId,
            domainCode,
            domainCode,
            "EUR",
            rows
        );
    }

    @Override
    public ItemsResponse<TrendPointDto> getTrend(String applicationId, String domainCode, Integer month, String pricingViewCode) {
        List<TrendPointDto> items = repository.findTrend(month, pricingViewCode, applicationId, domainCode)
            .stream()
            .map(commonMapper::toTrendPoint)
            .toList();

        return new ItemsResponse<>(items);
    }

    private Integer previousMonth(Integer month) {
        int year = month / 100;
        int mm = month % 100;
        return mm == 1 ? ((year - 1) * 100) + 12 : (year * 100) + (mm - 1);
    }
}
```

---

# 12. Ordre exact d’implémentation

## Étape 1
Créer et tester en base :
- `mv_finops_cost_base`
- `mv_finops_cost_history`
- indexes

## Étape 2
Créer les entities :
- `PricingViewEntity`
- `PricingViewLineEntity`
- `PricingCalendarEntity`
- `DomainEntity`
- `FamilyEntity`
- `ProductEntity`
- `EnvironmentEntity`
- `FactConsumptionMonthlyEntity`
- `CostBaseEntity`
- `CostHistoryEntity`

## Étape 3
Créer tous les DTO

## Étape 4
Créer les repositories :
- `FinopsContextRepository`
- `FinopsGlobalRepository`
- `FinopsDomainRepository`
- `FinopsApplicationRepository`
- `FinopsDetailRepository`

## Étape 5
Créer les mappers :
- `CommonMapper`
- `SummaryMapper`
- `DetailMapper`

## Étape 6
Créer les services :
- `FinopsContextServiceImpl`
- `FinopsGlobalServiceImpl`
- `FinopsDomainServiceImpl`
- `FinopsApplicationServiceImpl`
- `FinopsDetailServiceImpl`

## Étape 7
Brancher tes resources REST existantes sur ces services

---

# 13. Conseils finaux

## 13.1 Ne pas sur-ORMiser
Pour cette API analytique FinOps :
- ORM pour les tables simples
- SQL natif explicite pour les dashboards

## 13.2 Garder `pricing_view_code` côté API
C’est plus stable et lisible pour le frontend que l’UUID.

## 13.3 Retourner toujours des DTO déjà “prêts écran”
Évite de faire des calculs côté frontend qui devraient être faits côté service.

## 13.4 Variations
Pour la V1, implémente les variations après :
- global summary
- breakdowns
- trends
- details

---

# 14. Ce qu’il te reste ensuite
Une fois ce guide appliqué, il te restera seulement :
- brancher les resources REST
- ajuster les noms exacts des DTO à ton frontend
- finir top variations
- éventuellement ajouter 1 ou 2 vues supplémentaires si la perf le demande

---

# 15. Résumé final

Ce guide te donne tout ce qu’il faut pour aller de :

`PostgreSQL schema → MV → Entities → Repositories SQL → Mappers → DTO → Services Quarkus`

et brancher ensuite tes endpoints existants sans redéfinir l’architecture.
