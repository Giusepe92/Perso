# Guide Java FinOps Quarkus (Panache, Quarkus 3.x)

Portée : uniquement la partie Java à partir d’une base PostgreSQL déjà créée avec tables, indexes et materialized views.

Objectif :
- utiliser les bonnes pratiques Quarkus récentes
- utiliser Panache proprement
- garder les resources REST minces
- faire la lecture analytique via SQL natif dans les repositories
- mapper proprement vers les DTO

---

## 1. Dépendances recommandées

```xml
<dependencies>
  <dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-arc</artifactId>
  </dependency>

  <dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-rest-jackson</artifactId>
  </dependency>

  <dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-hibernate-orm-panache</artifactId>
  </dependency>

  <dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-jdbc-postgresql</artifactId>
  </dependency>

  <dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-agroal</artifactId>
  </dependency>
</dependencies>
```

---

## 2. Principe d’architecture

Pour un use case FinOps analytique, la bonne pratique est :

- **PanacheEntityBase** pour les entities
- **PanacheRepositoryBase** pour les repositories
- **SQL natif** dans les repositories analytiques
- **records** pour les DTO
- **services** explicites
- **resources** minces

Pipeline cible :

```text
PostgreSQL
  ↓
Materialized Views
  ↓
Repository Panache + SQL natif
  ↓
Mapper
  ↓
DTO
  ↓
Service
  ↓
Resource REST
```

---

## 3. Structure de packages recommandée

```text
src/main/java/com/company/finops/
├── dto/
│   ├── common/
│   ├── context/
│   └── detail/
├── entity/
│   ├── dimension/
│   ├── pricing/
│   ├── fact/
│   └── mv/
├── repository/
│   ├── dimension/
│   ├── pricing/
│   ├── context/
│   ├── global/
│   ├── domain/
│   ├── application/
│   └── detail/
├── mapper/
│   ├── common/
│   ├── context/
│   └── detail/
├── service/
│   ├── context/
│   ├── global/
│   ├── domain/
│   ├── application/
│   └── detail/
└── resource/
```

---

## 4. Entities Panache

### 4.1 DomainEntity

```java
package com.company.finops.entity.dimension;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_domain", schema = "finops_dm")
public class DomainEntity extends PanacheEntityBase {

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
    public Boolean active;

    @Column(name = "is_indirect", nullable = false)
    public Boolean indirect;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### 4.2 FamilyEntity

```java
package com.company.finops.entity.dimension;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_family", schema = "finops_dm")
public class FamilyEntity extends PanacheEntityBase {

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

### 4.3 ProductEntity

```java
package com.company.finops.entity.dimension;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_product", schema = "finops_dm")
public class ProductEntity extends PanacheEntityBase {

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

### 4.4 EnvironmentEntity

```java
package com.company.finops.entity.dimension;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dim_environment", schema = "finops_dm")
public class EnvironmentEntity extends PanacheEntityBase {

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

### 4.5 PricingViewEntity

```java
package com.company.finops.entity.pricing;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_view", schema = "finops_dm")
public class PricingViewEntity extends PanacheEntityBase {

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

### 4.6 PricingViewLineId

```java
package com.company.finops.entity.pricing;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class PricingViewLineId implements Serializable {
    public UUID pricingViewId;
    public Long productId;

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

### 4.7 PricingViewLineEntity

```java
package com.company.finops.entity.pricing;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_view_line", schema = "finops_dm")
@IdClass(PricingViewLineId.class)
public class PricingViewLineEntity extends PanacheEntityBase {

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

### 4.8 PricingCalendarEntity

```java
package com.company.finops.entity.pricing;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_calendar", schema = "finops_dm")
public class PricingCalendarEntity extends PanacheEntityBase {

    @Id
    @Column(name = "month")
    public Integer month;

    @Column(name = "pricing_view_id", nullable = false)
    public UUID pricingViewId;

    @Column(name = "is_frozen", nullable = false)
    public Boolean frozen;

    @Column(name = "frozen_at")
    public OffsetDateTime frozenAt;

    @Column(name = "frozen_by")
    public String frozenBy;
}
```

### 4.9 FactConsumptionEntity

```java
package com.company.finops.entity.fact;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fact_consumption_monthly", schema = "finops_dm")
public class FactConsumptionEntity extends PanacheEntityBase {

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

    @Column(name = "metadata")
    public String metadata;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;
}
```

### 4.10 MvFinopsCostBaseId

```java
package com.company.finops.entity.mv;

import java.io.Serializable;
import java.util.Objects;

public class MvFinopsCostBaseId implements Serializable {
    public Integer month;
    public String applicationId;
    public Long productId;
    public Long domainId;
    public Long familyId;
    public Long environmentId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MvFinopsCostBaseId that)) return false;
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

### 4.11 MvFinopsCostBaseEntity

```java
package com.company.finops.entity.mv;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mv_finops_cost_base", schema = "finops_dm")
@IdClass(MvFinopsCostBaseId.class)
public class MvFinopsCostBaseEntity extends PanacheEntityBase {

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

    @Column(name = "domain_code")
    public String domainCode;

    @Column(name = "domain_name")
    public String domainName;

    @Id
    @Column(name = "family_id")
    public Long familyId;

    @Column(name = "family_code")
    public String familyCode;

    @Column(name = "family_name")
    public String familyName;

    @Id
    @Column(name = "environment_id")
    public Long environmentId;

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

### 4.12 MvFinopsCostHistoryId

```java
package com.company.finops.entity.mv;

import java.io.Serializable;
import java.util.Objects;

public class MvFinopsCostHistoryId implements Serializable {
    public Integer month;
    public String applicationId;
    public Long domainId;
    public Long productId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MvFinopsCostHistoryId that)) return false;
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

### 4.13 MvFinopsCostHistoryEntity

```java
package com.company.finops.entity.mv;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mv_finops_cost_history", schema = "finops_dm")
@IdClass(MvFinopsCostHistoryId.class)
public class MvFinopsCostHistoryEntity extends PanacheEntityBase {

    @Id
    @Column(name = "month")
    public Integer month;

    @Id
    @Column(name = "application_id")
    public String applicationId;

    @Id
    @Column(name = "domain_id")
    public Long domainId;

    @Column(name = "domain_code")
    public String domainCode;

    @Column(name = "domain_name")
    public String domainName;

    @Id
    @Column(name = "product_id")
    public Long productId;

    @Column(name = "product_code")
    public String productCode;

    @Column(name = "product_name")
    public String productName;

    @Column(name = "quantity")
    public BigDecimal quantity;
}
```

---

# 5. DTO modernes à utiliser

## DTO communs

```java
package com.company.finops.dto.common;

public record SelectOptionDto(String value, String label) {}
```

```java
package com.company.finops.dto.common;

import java.math.BigDecimal;

public record TrendPointDto(Integer month, BigDecimal cost) {}
```

```java
package com.company.finops.dto.common;

import java.math.BigDecimal;

public record BreakdownItemDto(String elementId, String elementLabel, BigDecimal cost) {}
```

```java
package com.company.finops.dto.common;

import java.math.BigDecimal;

public record VariationItemDto(String elementId, String elementName, BigDecimal delta) {}
```

```java
package com.company.finops.dto.common;

import java.util.List;

public record ItemsResponse<T>(List<T> items) {}
```

## Context

```java
package com.company.finops.dto.context;

import com.company.finops.dto.common.SelectOptionDto;
import java.util.List;

public record DefaultContextDto(
    Integer month,
    String pv,
    String currency,
    List<SelectOptionDto> availablePeriods,
    List<SelectOptionDto> availablePricingViews
) {}
```

## Summary

```java
package com.company.finops.dto.common;

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

```java
package com.company.finops.dto.detail;

public record CalcDetailsDto(
    String source,
    String rule,
    String pricingViewId,
    String runId
) {}
```

```java
package com.company.finops.dto.detail;

import java.math.BigDecimal;

public record DetailFlatRowDto(
    Integer month,
    String environment,
    String familyName,
    String productName,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal cost,
    CalcDetailsDto calcDetails
) {}
```

```java
package com.company.finops.dto.detail;

import java.util.List;

public record DomainAppDetailDto(
    String applicationId,
    String domainCode,
    String domainName,
    String currency,
    List<DetailFlatRowDto> rows
) {}
```

---

# 6. Mappers

## ContextMapper

```java
package com.company.finops.mapper.context;

import com.company.finops.dto.common.SelectOptionDto;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ContextMapper {

    public List<SelectOptionDto> toSelectOptions(List<Object[]> raw) {
        return raw.stream()
            .map(r -> new SelectOptionDto(
                String.valueOf(r[0]),
                String.valueOf(r[1])
            ))
            .toList();
    }
}
```

## BreakdownMapper

```java
package com.company.finops.mapper.common;

import com.company.finops.dto.common.BreakdownItemDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class BreakdownMapper {

    public List<BreakdownItemDto> toDtoList(List<Object[]> raw) {
        return raw.stream()
            .map(r -> new BreakdownItemDto(
                String.valueOf(r[0]),
                String.valueOf(r[1]),
                (BigDecimal) r[2]
            ))
            .toList();
    }
}
```

## TrendMapper

```java
package com.company.finops.mapper.common;

import com.company.finops.dto.common.TrendPointDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class TrendMapper {

    public List<TrendPointDto> toDtoList(List<Object[]> raw) {
        return raw.stream()
            .map(r -> new TrendPointDto(
                ((Number) r[0]).intValue(),
                (BigDecimal) r[1]
            ))
            .toList();
    }
}
```

## VariationMapper

```java
package com.company.finops.mapper.common;

import com.company.finops.dto.common.VariationItemDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class VariationMapper {

    public List<VariationItemDto> toDtoList(List<Object[]> raw) {
        return raw.stream()
            .map(r -> new VariationItemDto(
                String.valueOf(r[0]),
                String.valueOf(r[1]),
                (BigDecimal) r[2]
            ))
            .toList();
    }
}
```

## SummaryMapper

```java
package com.company.finops.mapper.common;

import com.company.finops.dto.common.FinopsSummaryDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;

@ApplicationScoped
public class SummaryMapper {

    public FinopsSummaryDto toDto(
        Integer month,
        String pricingViewId,
        BigDecimal totalCost,
        BigDecimal previousMonthCost,
        String currency
    ) {
        return new FinopsSummaryDto(
            month,
            pricingViewId,
            totalCost,
            previousMonthCost,
            currency
        );
    }
}
```

## DetailMapper

```java
package com.company.finops.mapper.detail;

import com.company.finops.dto.detail.CalcDetailsDto;
import com.company.finops.dto.detail.DetailFlatRowDto;
import com.company.finops.dto.detail.DomainAppDetailDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class DetailMapper {

    public List<DetailFlatRowDto> toRows(List<Object[]> raw, String pricingViewId) {
        return raw.stream()
            .map(r -> new DetailFlatRowDto(
                ((Number) r[0]).intValue(),
                String.valueOf(r[1]),
                String.valueOf(r[2]),
                String.valueOf(r[3]),
                (BigDecimal) r[4],
                (BigDecimal) r[5],
                (BigDecimal) r[6],
                new CalcDetailsDto(
                    "mv_finops_cost_base + pricing_view_line",
                    "cost = quantity * unitPrice",
                    pricingViewId,
                    null
                )
            ))
            .toList();
    }

    public DomainAppDetailDto toDto(
        String applicationId,
        String domainCode,
        String domainName,
        String currency,
        List<DetailFlatRowDto> rows
    ) {
        return new DomainAppDetailDto(
            applicationId,
            domainCode,
            domainName,
            currency,
            rows
        );
    }
}
```

---

# 7. Services

## ContextService

```java
package com.company.finops.service.context;

import com.company.finops.dto.context.DefaultContextDto;
import com.company.finops.mapper.context.ContextMapper;
import com.company.finops.repository.context.ContextRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class ContextService {

    @Inject
    ContextRepository repository;

    @Inject
    ContextMapper mapper;

    public DefaultContextDto getDefaultContext() {
        Integer defaultMonth = repository.findDefaultMonth();
        UUID pricingViewId = repository.findDefaultPricingViewId(defaultMonth);
        String currency = repository.findCurrency(pricingViewId);

        return new DefaultContextDto(
            defaultMonth,
            pricingViewId.toString(),
            currency,
            mapper.toSelectOptions(repository.findAvailablePeriodsRaw()),
            mapper.toSelectOptions(repository.findAvailablePricingViewsRaw())
        );
    }
}
```

## GlobalService

```java
package com.company.finops.service.global;

import com.company.finops.dto.common.*;
import com.company.finops.mapper.common.*;
import com.company.finops.repository.context.ContextRepository;
import com.company.finops.repository.global.GlobalRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class GlobalService {

    @Inject
    GlobalRepository repository;

    @Inject
    ContextRepository contextRepository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    BreakdownMapper breakdownMapper;

    @Inject
    TrendMapper trendMapper;

    @Inject
    VariationMapper variationMapper;

    public FinopsSummaryDto getSummary(Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        String currency = contextRepository.findCurrency(pvId);

        var current = repository.findTotalCost(month, pvId);
        var previous = repository.findTotalCost(previousMonth(month), pvId);

        return summaryMapper.toDto(month, pricingViewId, current, previous, currency);
    }

    public ItemsResponse<BreakdownItemDto> getDomainBreakdown(Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findDomainBreakdown(month, pvId)));
    }

    public ItemsResponse<BreakdownItemDto> getTopApplications(Integer month, String pricingViewId, int limit) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findTopApplications(month, pvId, limit)));
    }

    public ItemsResponse<TrendPointDto> getTrend(Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(trendMapper.toDtoList(repository.findTrend(month, pvId)));
    }

    public ItemsResponse<VariationItemDto> getTopVariations(Integer month, String pricingViewId, int limit) {
        UUID pvId = UUID.fromString(pricingViewId);
        List<VariationItemDto> all = variationMapper.toDtoList(
            repository.findApplicationVariations(month, previousMonth(month), pvId)
        );

        return new ItemsResponse<>(
            all.stream()
                .sorted(Comparator.comparing(VariationItemDto::delta).reversed())
                .limit(limit)
                .toList()
        );
    }

    private int previousMonth(int month) {
        int y = month / 100;
        int m = month % 100;
        if (m == 1) return ((y - 1) * 100) + 12;
        return (y * 100) + (m - 1);
    }
}
```

## DomainService

```java
package com.company.finops.service.domain;

import com.company.finops.dto.common.*;
import com.company.finops.mapper.common.*;
import com.company.finops.repository.context.ContextRepository;
import com.company.finops.repository.domain.DomainRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class DomainService {

    @Inject
    DomainRepository repository;

    @Inject
    ContextRepository contextRepository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    BreakdownMapper breakdownMapper;

    @Inject
    TrendMapper trendMapper;

    public FinopsSummaryDto getSummary(String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        String currency = contextRepository.findCurrency(pvId);

        return summaryMapper.toDto(
            month,
            pricingViewId,
            repository.findDomainTotalCost(domainCode, month, pvId),
            repository.findDomainTotalCost(domainCode, previousMonth(month), pvId),
            currency
        );
    }

    public ItemsResponse<BreakdownItemDto> getFamilyCosts(String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findFamilyCosts(domainCode, month, pvId)));
    }

    public ItemsResponse<BreakdownItemDto> getEnvironmentCosts(String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findEnvironmentCosts(domainCode, month, pvId)));
    }

    public ItemsResponse<BreakdownItemDto> getTopApplications(String domainCode, Integer month, String pricingViewId, int limit) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findTopApplications(domainCode, month, pvId, limit)));
    }

    public ItemsResponse<TrendPointDto> getTrend(String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(trendMapper.toDtoList(repository.findTrend(domainCode, month, pvId)));
    }

    private int previousMonth(int month) {
        int y = month / 100;
        int m = month % 100;
        if (m == 1) return ((y - 1) * 100) + 12;
        return (y * 100) + (m - 1);
    }
}
```

## ApplicationService

```java
package com.company.finops.service.application;

import com.company.finops.dto.common.*;
import com.company.finops.mapper.common.*;
import com.company.finops.repository.application.ApplicationRepository;
import com.company.finops.repository.context.ContextRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class ApplicationService {

    @Inject
    ApplicationRepository repository;

    @Inject
    ContextRepository contextRepository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    BreakdownMapper breakdownMapper;

    @Inject
    TrendMapper trendMapper;

    public FinopsSummaryDto getSummary(String applicationId, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        String currency = contextRepository.findCurrency(pvId);

        return summaryMapper.toDto(
            month,
            pricingViewId,
            repository.findApplicationTotalCost(applicationId, month, pvId),
            repository.findApplicationTotalCost(applicationId, previousMonth(month), pvId),
            currency
        );
    }

    public ItemsResponse<BreakdownItemDto> getDomainCosts(String applicationId, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findDomainCosts(applicationId, month, pvId)));
    }

    public ItemsResponse<BreakdownItemDto> getEnvironmentCosts(String applicationId, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findEnvironmentCosts(applicationId, month, pvId)));
    }

    public ItemsResponse<BreakdownItemDto> getTopProducts(String applicationId, Integer month, String pricingViewId, int limit) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(breakdownMapper.toDtoList(repository.findTopProducts(applicationId, month, pvId, limit)));
    }

    public ItemsResponse<TrendPointDto> getTrend(String applicationId, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(trendMapper.toDtoList(repository.findTrend(applicationId, month, pvId)));
    }

    private int previousMonth(int month) {
        int y = month / 100;
        int m = month % 100;
        if (m == 1) return ((y - 1) * 100) + 12;
        return (y * 100) + (m - 1);
    }
}
```

## DetailService

```java
package com.company.finops.service.detail;

import com.company.finops.dto.common.FinopsSummaryDto;
import com.company.finops.dto.common.ItemsResponse;
import com.company.finops.dto.common.TrendPointDto;
import com.company.finops.dto.detail.DomainAppDetailDto;
import com.company.finops.mapper.common.SummaryMapper;
import com.company.finops.mapper.common.TrendMapper;
import com.company.finops.mapper.detail.DetailMapper;
import com.company.finops.repository.context.ContextRepository;
import com.company.finops.repository.detail.DetailRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class DetailService {

    @Inject
    DetailRepository repository;

    @Inject
    ContextRepository contextRepository;

    @Inject
    SummaryMapper summaryMapper;

    @Inject
    TrendMapper trendMapper;

    @Inject
    DetailMapper detailMapper;

    public FinopsSummaryDto getSummary(String applicationId, String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        String currency = contextRepository.findCurrency(pvId);

        return summaryMapper.toDto(
            month,
            pricingViewId,
            repository.findTotalCost(applicationId, domainCode, month, pvId),
            repository.findTotalCost(applicationId, domainCode, previousMonth(month), pvId),
            currency
        );
    }

    public ItemsResponse<TrendPointDto> getTrend(String applicationId, String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        return new ItemsResponse<>(
            trendMapper.toDtoList(repository.findTrend(applicationId, domainCode, month, pvId))
        );
    }

    public DomainAppDetailDto getDetails(String applicationId, String domainCode, Integer month, String pricingViewId) {
        UUID pvId = UUID.fromString(pricingViewId);
        String currency = contextRepository.findCurrency(pvId);
        String domainName = repository.findDomainName(domainCode);

        return detailMapper.toDto(
            applicationId,
            domainCode,
            domainName,
            currency,
            detailMapper.toRows(repository.findDetailRows(applicationId, domainCode, month, pvId), pricingViewId)
        );
    }

    private int previousMonth(int month) {
        int y = month / 100;
        int m = month % 100;
        if (m == 1) return ((y - 1) * 100) + 12;
        return (y * 100) + (m - 1);
    }
}
```

---

# 10. Resources REST minces

## ContextResource

```java
package com.company.finops.resource;

import com.company.finops.dto.context.DefaultContextDto;
import com.company.finops.service.context.ContextService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/default-context")
@Produces(MediaType.APPLICATION_JSON)
public class ContextResource {

    @Inject
    ContextService service;

    @GET
    public DefaultContextDto getDefaultContext() {
        return service.getDefaultContext();
    }
}
```

## GlobalResource

```java
package com.company.finops.resource;

import com.company.finops.dto.common.*;
import com.company.finops.service.global.GlobalService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/global")
@Produces(MediaType.APPLICATION_JSON)
public class GlobalResource {

    @Inject
    GlobalService service;

    @GET
    @Path("/summary")
    public FinopsSummaryDto getSummary(@QueryParam("month") Integer month,
                                       @QueryParam("pricingViewId") String pricingViewId) {
        return service.getSummary(month, pricingViewId);
    }

    @GET
    @Path("/domains")
    public ItemsResponse<BreakdownItemDto> getDomains(@QueryParam("month") Integer month,
                                                      @QueryParam("pricingViewId") String pricingViewId) {
        return service.getDomainBreakdown(month, pricingViewId);
    }

    @GET
    @Path("/top-applications")
    public ItemsResponse<BreakdownItemDto> getTopApps(@QueryParam("month") Integer month,
                                                      @QueryParam("pricingViewId") String pricingViewId,
                                                      @DefaultValue("10") @QueryParam("limit") int limit) {
        return service.getTopApplications(month, pricingViewId, limit);
    }

    @GET
    @Path("/trend")
    public ItemsResponse<TrendPointDto> getTrend(@QueryParam("month") Integer month,
                                                 @QueryParam("pricingViewId") String pricingViewId) {
        return service.getTrend(month, pricingViewId);
    }

    @GET
    @Path("/top-variations")
    public ItemsResponse<VariationItemDto> getVariations(@QueryParam("month") Integer month,
                                                         @QueryParam("pricingViewId") String pricingViewId,
                                                         @DefaultValue("10") @QueryParam("limit") int limit) {
        return service.getTopVariations(month, pricingViewId, limit);
    }
}
```

---

# 11. Ordre d’implémentation recommandé

1. Config datasource Quarkus
2. Créer les entities Panache
3. Créer les DTO
4. Créer les repositories :
   - Context
   - Global
   - Detail
   - Domain
   - Application
5. Créer les mappers
6. Implémenter les services
7. Brancher les resources

---

# 12. Bonnes pratiques Quarkus / Panache

- utiliser `PanacheEntityBase`, pas `PanacheEntity`
- garder les entities simples
- mettre le SQL analytique dans les repositories
- utiliser des `record` pour les DTO
- garder les services explicites
- garder les resources minces

---

# 13. Ce qu’il faut éviter

- tout faire en HQL/Panache sur les dashboards
- mettre la logique métier dans les resources
- créer une MV par endpoint
- mélanger entities et DTO

---

# 14. Conclusion

Pour ton FinOps, l’architecture Java moderne la plus propre est :

```text
Entities Panache
  ↓
Repositories Panache + SQL natif
  ↓
Mappers
  ↓
DTO records
  ↓
Services
  ↓
Resources REST
```

C’est la solution la plus compatible avec :
- Quarkus 3.x
- Panache
- un data mart analytique
- des dashboards Backstage performants
