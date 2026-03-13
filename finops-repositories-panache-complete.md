# FinOps Quarkus — Guide complet des repositories (Panache + SQL natif)

Ce document complète la partie Java et se concentre sur les repositories, avec :
- la structure recommandée
- les classes complètes
- les imports
- les méthodes Panache simples
- les méthodes analytiques SQL natives
- l’ordre exact d’implémentation

Cible : Quarkus 3.x, Jakarta, Panache, PostgreSQL.

---

## 1. Principe de conception

Dans ton projet FinOps, il faut distinguer 2 familles de repositories.

### A. Repositories de référentiel / dimension
Utilisent principalement Panache :
- dim_domain
- dim_family
- dim_product
- dim_environment
- pricing_view
- pricing_calendar
- pricing_view_line

Ici, Panache est parfait pour :
- lire une ligne par ID
- chercher par code
- lister
- filtrer simplement

### B. Repositories analytiques
Utilisent :
- PanacheRepositoryBase
- EntityManager
- SQL natif

Ici, on requête :
- mv_finops_cost_base
- mv_finops_cost_history

C’est la meilleure approche pour :
- summary
- trends
- variations
- breakdowns
- detail rows

---

## 2. Arborescence recommandée

```text
src/main/java/com/company/finops/repository/
├── dimension/
│   ├── DomainRepository.java
│   ├── FamilyRepository.java
│   ├── ProductRepository.java
│   └── EnvironmentRepository.java
│
├── pricing/
│   ├── PricingViewRepository.java
│   ├── PricingViewLineRepository.java
│   └── PricingCalendarRepository.java
│
├── context/
│   └── ContextRepository.java
│
├── global/
│   └── GlobalRepository.java
│
├── domain/
│   └── DomainAnalyticsRepository.java
│
├── application/
│   └── ApplicationAnalyticsRepository.java
│
└── detail/
    └── DetailRepository.java
```

---

## 3. Repositories de dimensions

### 3.1 DomainRepository

```java
package com.company.finops.repository.dimension;

import com.company.finops.entity.dimension.DomainEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class DomainRepository implements PanacheRepositoryBase<DomainEntity, Long> {

    public Optional<DomainEntity> findByCode(String domainCode) {
        return find("domainCode", domainCode).firstResultOptional();
    }

    public boolean existsByCode(String domainCode) {
        return count("domainCode", domainCode) > 0;
    }
}
```

### 3.2 FamilyRepository

```java
package com.company.finops.repository.dimension;

import com.company.finops.entity.dimension.FamilyEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class FamilyRepository implements PanacheRepositoryBase<FamilyEntity, Long> {

    public Optional<FamilyEntity> findByDomainIdAndCode(Long domainId, String familyCode) {
        return find("domainId = ?1 and familyCode = ?2", domainId, familyCode)
            .firstResultOptional();
    }

    public List<FamilyEntity> findByDomainId(Long domainId) {
        return list("domainId", domainId);
    }
}
```

### 3.3 ProductRepository

```java
package com.company.finops.repository.dimension;

import com.company.finops.entity.dimension.ProductEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ProductRepository implements PanacheRepositoryBase<ProductEntity, Long> {

    public Optional<ProductEntity> findByCode(String productCode) {
        return find("productCode", productCode).firstResultOptional();
    }

    public List<ProductEntity> findByDomainId(Long domainId) {
        return list("domainId", domainId);
    }

    public List<ProductEntity> findByFamilyId(Long familyId) {
        return list("familyId", familyId);
    }
}
```

### 3.4 EnvironmentRepository

```java
package com.company.finops.repository.dimension;

import com.company.finops.entity.dimension.EnvironmentEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class EnvironmentRepository implements PanacheRepositoryBase<EnvironmentEntity, Long> {

    public Optional<EnvironmentEntity> findByCode(String environmentCode) {
        return find("environmentCode", environmentCode).firstResultOptional();
    }
}
```

---

## 4. Repositories de pricing

### 4.1 PricingViewRepository

```java
package com.company.finops.repository.pricing;

import com.company.finops.entity.pricing.PricingViewEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PricingViewRepository implements PanacheRepositoryBase<PricingViewEntity, UUID> {

    public Optional<PricingViewEntity> findByCode(String pricingViewCode) {
        return find("pricingViewCode", pricingViewCode).firstResultOptional();
    }
}
```

### 4.2 PricingViewLineRepository

```java
package com.company.finops.repository.pricing;

import com.company.finops.entity.pricing.PricingViewLineEntity;
import com.company.finops.entity.pricing.PricingViewLineId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PricingViewLineRepository implements PanacheRepositoryBase<PricingViewLineEntity, PricingViewLineId> {

    public Optional<PricingViewLineEntity> findByPricingViewIdAndProductId(UUID pricingViewId, Long productId) {
        return find("pricingViewId = ?1 and productId = ?2", pricingViewId, productId)
            .firstResultOptional();
    }

    public List<PricingViewLineEntity> findByPricingViewId(UUID pricingViewId) {
        return list("pricingViewId", pricingViewId);
    }
}
```

### 4.3 PricingCalendarRepository

```java
package com.company.finops.repository.pricing;

import com.company.finops.entity.pricing.PricingCalendarEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PricingCalendarRepository implements PanacheRepositoryBase<PricingCalendarEntity, Integer> {

    public PricingCalendarEntity findLatest() {
        return find("order by month desc").firstResult();
    }
}
```

---

## 5. Repository de contexte

### 5.1 ContextRepository

```java
package com.company.finops.repository.context;

import com.company.finops.entity.pricing.PricingCalendarEntity;
import com.company.finops.repository.pricing.PricingCalendarRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ContextRepository implements PanacheRepositoryBase<PricingCalendarEntity, Integer> {

    @Inject
    EntityManager em;

    @Inject
    PricingCalendarRepository pricingCalendarRepository;

    public Integer findDefaultMonth() {
        PricingCalendarEntity latest = pricingCalendarRepository.findLatest();
        return latest != null ? latest.month : null;
    }

    public UUID findDefaultPricingViewId(Integer month) {
        String sql = """
            SELECT pc.pricing_view_id
            FROM finops_dm.pricing_calendar pc
            WHERE pc.month = :month
        """;
        return (UUID) em.createNativeQuery(sql)
            .setParameter("month", month)
            .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findAvailablePeriodsRaw() {
        String sql = """
            SELECT pc.month::text AS value, pc.month::text AS label
            FROM finops_dm.pricing_calendar pc
            ORDER BY pc.month DESC
        """;
        return em.createNativeQuery(sql).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findAvailablePricingViewsRaw() {
        String sql = """
            SELECT pv.pricing_view_id::text AS value, pv.name AS label
            FROM finops_dm.pricing_view pv
            ORDER BY pv.name
        """;
        return em.createNativeQuery(sql).getResultList();
    }

    public String findCurrency(UUID pricingViewId) {
        String sql = """
            SELECT MIN(pvl.currency)
            FROM finops_dm.pricing_view_line pvl
            WHERE pvl.pricing_view_id = :pricingViewId
        """;
        return (String) em.createNativeQuery(sql)
            .setParameter("pricingViewId", pricingViewId)
            .getSingleResult();
    }
}
```

---

## 6. Repository global

```java
package com.company.finops.repository.global;

import com.company.finops.entity.mv.MvFinopsCostBaseEntity;
import com.company.finops.entity.mv.MvFinopsCostBaseId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class GlobalRepository implements PanacheRepositoryBase<MvFinopsCostBaseEntity, MvFinopsCostBaseId> {

    @Inject
    EntityManager em;

    public BigDecimal findTotalCost(Integer month, UUID pricingViewId) {
        String sql = """
            SELECT COALESCE(SUM(b.quantity * pvl.unit_price), 0)
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
        """;
        return (BigDecimal) em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findDomainBreakdown(Integer month, UUID pricingViewId) {
        String sql = """
            SELECT
                b.domain_code AS element_id,
                b.domain_name AS element_label,
                COALESCE(SUM(b.quantity * pvl.unit_price), 0) AS cost
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
            GROUP BY b.domain_code, b.domain_name
            ORDER BY cost DESC
        """;
        return em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findTopApplications(Integer month, UUID pricingViewId, int limit) {
        String sql = """
            SELECT
                b.application_id AS element_id,
                b.application_id AS element_label,
                COALESCE(SUM(b.quantity * pvl.unit_price), 0) AS cost
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
            GROUP BY b.application_id
            ORDER BY cost DESC
            LIMIT :limit
        """;
        return em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("limit", limit)
            .getResultList();
    }
}
```

---

## 7. Repository domaine

```java
package com.company.finops.repository.domain;

import com.company.finops.entity.mv.MvFinopsCostBaseEntity;
import com.company.finops.entity.mv.MvFinopsCostBaseId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class DomainAnalyticsRepository implements PanacheRepositoryBase<MvFinopsCostBaseEntity, MvFinopsCostBaseId> {

    @Inject
    EntityManager em;

    public BigDecimal findDomainTotalCost(String domainCode, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT COALESCE(SUM(b.quantity * pvl.unit_price), 0)
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.domain_code = :domainCode
        """;
        return (BigDecimal) em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("domainCode", domainCode)
            .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findFamilyCosts(String domainCode, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT
                COALESCE(b.family_code, 'N/A') AS element_id,
                COALESCE(b.family_name, 'N/A') AS element_label,
                COALESCE(SUM(b.quantity * pvl.unit_price), 0) AS cost
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.domain_code = :domainCode
            GROUP BY b.family_code, b.family_name
            ORDER BY cost DESC
        """;
        return em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("domainCode", domainCode)
            .getResultList();
    }
}
```

---

## 8. Repository application

```java
package com.company.finops.repository.application;

import com.company.finops.entity.mv.MvFinopsCostBaseEntity;
import com.company.finops.entity.mv.MvFinopsCostBaseId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ApplicationAnalyticsRepository implements PanacheRepositoryBase<MvFinopsCostBaseEntity, MvFinopsCostBaseId> {

    @Inject
    EntityManager em;

    public BigDecimal findApplicationTotalCost(String applicationId, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT COALESCE(SUM(b.quantity * pvl.unit_price), 0)
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.application_id = :applicationId
        """;
        return (BigDecimal) em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("applicationId", applicationId)
            .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findDomainCosts(String applicationId, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT
                b.domain_code AS element_id,
                b.domain_name AS element_label,
                COALESCE(SUM(b.quantity * pvl.unit_price), 0) AS cost
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.application_id = :applicationId
            GROUP BY b.domain_code, b.domain_name
            ORDER BY cost DESC
        """;
        return em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("applicationId", applicationId)
            .getResultList();
    }
}
```

---

## 9. Repository détail

```java
package com.company.finops.repository.detail;

import com.company.finops.entity.mv.MvFinopsCostBaseEntity;
import com.company.finops.entity.mv.MvFinopsCostBaseId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class DetailRepository implements PanacheRepositoryBase<MvFinopsCostBaseEntity, MvFinopsCostBaseId> {

    @Inject
    EntityManager em;

    public BigDecimal findTotalCost(String applicationId, String domainCode, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT COALESCE(SUM(b.quantity * pvl.unit_price), 0)
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.application_id = :applicationId
              AND b.domain_code = :domainCode
        """;
        return (BigDecimal) em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("applicationId", applicationId)
            .setParameter("domainCode", domainCode)
            .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findDetailRows(String applicationId, String domainCode, Integer month, UUID pricingViewId) {
        String sql = """
            SELECT
                b.month,
                b.environment_name,
                COALESCE(b.family_name, 'N/A') AS family_name,
                b.product_name,
                b.quantity,
                pvl.unit_price,
                (b.quantity * pvl.unit_price) AS cost
            FROM finops_dm.mv_finops_cost_base b
            JOIN finops_dm.pricing_view_line pvl
              ON pvl.product_id = b.product_id
             AND pvl.pricing_view_id = :pricingViewId
            WHERE b.month = :month
              AND b.application_id = :applicationId
              AND b.domain_code = :domainCode
            ORDER BY
                b.environment_name,
                family_name,
                b.product_name
        """;
        return em.createNativeQuery(sql)
            .setParameter("month", month)
            .setParameter("pricingViewId", pricingViewId)
            .setParameter("applicationId", applicationId)
            .setParameter("domainCode", domainCode)
            .getResultList();
    }

    public String findDomainName(String domainCode) {
        String sql = """
            SELECT d.domain_name
            FROM finops_dm.dim_domain d
            WHERE d.domain_code = :domainCode
        """;
        return (String) em.createNativeQuery(sql)
            .setParameter("domainCode", domainCode)
            .getSingleResult();
    }
}
```

---

## 10. Ordre exact d’implémentation

1. Créer les entities Panache
2. Créer les repositories dimensions
3. Créer les repositories pricing
4. Créer les DTO
5. Créer les mappers
6. Créer ContextRepository
7. Créer GlobalRepository
8. Créer DomainAnalyticsRepository
9. Créer ApplicationAnalyticsRepository
10. Créer DetailRepository
11. Brancher les services
12. Brancher les resources

---

## 11. Règles de bonne pratique

- utiliser PanacheEntityBase partout
- utiliser PanacheRepositoryBase partout
- utiliser SQL natif pour l’analytique
- garder les repositories responsables du SQL
- garder les services responsables de la logique métier
- garder les resources très minces

---

## 12. Conclusion

Pour ton code FinOps, la bonne implémentation Quarkus moderne est :

- Panache pour les entities
- PanacheRepositoryBase pour les repositories
- SQL natif dans les repositories analytiques
- DTO records
- mappers explicites
- services propres
- resources REST fines
