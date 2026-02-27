# 🌐 Spécification Technique – FinOps API Microservice

## 0️⃣ Nommage du Microservice

### Recommandation

Le nom **PinOps** peut prêter à confusion.  
Le terme métier reconnu est **FinOps** (Financial Operations).

👉 Recommandation :
- Nom technique du service : **finops-api**
- Nom fonctionnel : **FinOps API**

Cela garantit :
- Cohérence avec le domaine
- Lisibilité pour les équipes
- Alignement avec le module Batch (finops-batch)

---

# 1️⃣ Objectif du Microservice

Le microservice **FinOps API** est responsable de :

- Exposer les données FinOps consolidées via API REST
- Servir les dashboards Backstage
- Fournir des vues hiérarchiques :
  - Domaine
  - Famille
  - Produit
  - Application
- Fournir :
  - Classements
  - Historique
  - Variations
- Garantir performance via lecture exclusive des Materialized Views PostgreSQL

⚠️ Le service **ne calcule aucun coût** (rôle du Batch).

---

# 2️⃣ Stack Technique

## Runtime
- Quarkus
- Java 17

## API
- quarkus-rest (RESTEasy Reactive)
- OpenAPI / Swagger

## Accès Base de Données
- PostgreSQL
- quarkus-jdbc-postgresql
- Accès SQL explicite (JDBC recommandé v1)

## Sécurité
- quarkus-oidc
- Authentification via Keycloak (Service OIDC entreprise)
- JWT validation

## Observabilité
- Micrometer (Prometheus)
- SmallRye Health
- Logs structurés JSON

---

# 3️⃣ Architecture Interne

## Couches

1. REST Controllers
2. Services métier
3. DAO / Repositories (SQL)
4. DTO (API contract)
5. Security Layer
6. Config Layer

---

# 4️⃣ Sources de Données

Le service lit exclusivement :

- mv_cost_domain_month
- mv_cost_family_month
- mv_cost_application_month
- mv_cost_app_domain_month
- mv_cost_app_family_month
- mv_cost_app_product_month
- mv_rank_app_month
- mv_anomalies_month
- mv_history_domain

Aucun accès direct à fact_releve en production.

---

# 5️⃣ Endpoints Principaux

## Dashboard

GET /finops/dashboard

Retourne :
- coût total
- variation
- top domaines
- top familles
- top applications
- série historique globale

---

## Domaines

GET /finops/domains?period=YYYY-MM

GET /finops/domains/{domainId}/history?from=YYYY-MM&to=YYYY-MM

GET /finops/domains/{domainId}/families?period=YYYY-MM

---

## Familles

GET /finops/families?period=YYYY-MM

GET /finops/families/{familyId}/products?period=YYYY-MM

GET /finops/families/{familyId}/applications?period=YYYY-MM

GET /finops/families/{familyId}/history

---

## Applications

GET /finops/applications?period=YYYY-MM

GET /finops/applications/{appId}/summary?period=YYYY-MM

GET /finops/applications/{appId}/history

---

## Classements

GET /finops/rankings?period=YYYY-MM&type=applications&metric=cost

---

## Anomalies

GET /finops/anomalies?period=YYYY-MM&thresholdPct=20

---

## Historique Générique

GET /finops/history?level=domain&id=X&from=YYYY-MM&to=YYYY-MM

---

# 6️⃣ Formats de Réponse

## KPI
{
  period,
  totalCost,
  deltaAbs,
  deltaPct
}

## Series
{
  labels: [],
  values: []
}

## Breakdown
[
  { id, name, cost, pct }
]

---

# 7️⃣ Performance & Optimisation

- Index sur toutes les MVs
- Pagination (limit/offset)
- Tri par défaut cost DESC
- Possibilité d’ETag (v2)
- Timeout DB configuré

---

# 8️⃣ Sécurité

## Authentification
- JWT via OIDC

## Autorisations
- Role finops-user (lecture)
- Role finops-admin (admin)

Future :
- Restriction par périmètre squad / groupe

---

# 9️⃣ Configuration

Variables d’environnement :

- POSTGRES_URL
- POSTGRES_USER
- POSTGRES_PASSWORD
- OIDC_CLIENT_ID
- OIDC_CLIENT_SECRET
- FINOPS_DEFAULT_PERIOD_MODE=current_month
- FINOPS_MAX_LIMIT=200

---

# 🔟 Déploiement

## Kubernetes

- Deployment
- Service
- Ingress
- HPA (optionnel)
- Readiness / Liveness probes

## CI/CD

- Build Maven
- Build image
- Scan sécurité
- Déploiement via ArgoCD

---

# 1️⃣1️⃣ Monitoring

Metrics :
- finops_api_query_duration
- finops_api_requests_total

Health :
- DB connectivity
- freshness last batch run

Endpoint recommandé :

GET /finops/status

Retour :
- last_success_run
- last_refresh_time
- data_freshness

---

# 1️⃣2️⃣ Résumé

Le microservice **FinOps API** :

- Expose les données consolidées
- Lit uniquement des Materialized Views
- Est stateless
- Est sécurisé via OIDC
- Est déployé en Kubernetes
- Est aligné avec le Batch nightly

Il constitue la couche d’exposition performante et sécurisée du module FinOps.
