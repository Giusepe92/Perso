# 🌐 Spécification Technique – FinOps API (Quarkus REST)

## 1. 🎯 Objectif du microservice

Le microservice **FinOps API** expose les données consolidées du module FinOps via des endpoints REST destinés principalement à Backstage.

Il permet :

- La consultation des consommations et des coûts
- L’application dynamique d’une **Vision Budgétaire (Pricing View)**
- Le drill-down Domaine → Famille → Produit → Application
- Les classements et historiques
- L’accès aux informations d’administration (runs batch, statut, logs)

⚠️ Le microservice ne calcule pas les consommations.  
⚠️ Il ne persiste pas de coûts figés.  
Il applique dynamiquement les prix aux agrégats de consommation.

---

# 2. 🧭 Navigation générale & rôle dans l’architecture

Chaîne complète :

Sources → FinOps Batch → PostgreSQL (consommation + pricing + MVs) → **FinOps API** → Backstage UI

Le service :

- Lit uniquement PostgreSQL
- Joint les Materialized Views de consommation avec `pricing_line`
- Applique les règles de sélection de la Vision Budgétaire
- Retourne des DTO optimisés pour l’UI

---

# 3. 🧱 Stack Technique

## 3.1 Runtime
- Quarkus
- Java 17
- Packaging JVM (recommandé)

## 3.2 API
- `quarkus-rest` (RESTEasy Reactive)
- OpenAPI / Swagger activé

## 3.3 Base de données
- PostgreSQL
- `quarkus-jdbc-postgresql`
- Accès SQL explicite (JDBC recommandé)

## 3.4 Sécurité
- `quarkus-oidc`
- JWT validation (Keycloak)
- RBAC simple :
  - finops-user
  - finops-admin

## 3.5 Observabilité
- `quarkus-micrometer-registry-prometheus`
- `quarkus-smallrye-health`
- Logs structurés JSON

---

# 4. 🏗 Architecture interne

## 4.1 Couches

1. REST Controllers (Resources)
2. Services métier (orchestration requêtes)
3. Repositories / DAO (SQL)
4. DTO / Mappers
5. Security layer
6. Configuration layer

---

# 5. 📦 Sources de données

## 5.1 Tables principales

- `fact_consumption`
- `pricing_view`
- `pricing_line`
- `pricing_view_mapping`
- `etl_runs`

## 5.2 Materialized Views (consommation)

- `mv_consumption_domain_month`
- `mv_consumption_family_month`
- `mv_consumption_application_month`
- `mv_consumption_app_domain_month`
- `mv_consumption_app_family_month`
- `mv_consumption_app_product_month`
- `mv_rank_consumption_app_month`
- `mv_consumption_app_variation_month`

---

# 6. 💰 Calcul des coûts avec Vision Budgétaire

## 6.1 Paramètre standard

Tous les endpoints exposant des coûts acceptent :

`pricingView=<code|id>`

Si absent :

- récupérer la vision par défaut via `pricing_view_mapping`
- fallback sur `pricing_view.is_default = true`

## 6.2 Logique SQL

Principe :

SELECT SUM(total_quantity * unit_price)
FROM mv_consumption_app_product_month c
JOIN pricing_line p
  ON p.product_id = c.product_id
WHERE p.pricing_view_id = :pricingView
AND c.period_month = :period

Le calcul est toujours fait sur des agrégats.

---

# 7. 🔌 Endpoints principaux

## Dashboard

GET /finops/dashboard?period=YYYY-MM&pricingView=...

Retour :
- totalCost
- delta vs mois précédent
- top domaines
- top familles
- top applications
- série historique

---

## Domaines

GET /finops/domains?period=YYYY-MM&pricingView=...

GET /finops/domains/{domainId}/history?from=YYYY-MM&to=YYYY-MM&pricingView=...

GET /finops/domains/{domainId}/families?period=YYYY-MM&pricingView=...

---

## Familles

GET /finops/families?period=YYYY-MM&pricingView=...

GET /finops/families/{familyId}/applications?period=YYYY-MM&pricingView=...

GET /finops/families/{familyId}/history?...

---

## Applications

GET /finops/applications?period=YYYY-MM&pricingView=...

GET /finops/applications/{appId}/summary?period=YYYY-MM&pricingView=...

GET /finops/applications/{appId}/history?...

---

## Classements

GET /finops/rankings?period=YYYY-MM&type=applications&metric=cost&pricingView=...

---

## Comparaison de visions

GET /finops/compare?period=YYYY-MM&viewA=...&viewB=...&level=domain|family|application&id=...

---

## Admin

GET /finops/admin/runs

GET /finops/admin/runs/{runId}

GET /finops/admin/runs/{runId}/logs

GET /finops/status

---

# 8. 📤 Format de réponse (DTO)

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

## Ranking

{
  id,
  name,
  cost,
  deltaAbs,
  deltaPct,
  rank
}

---

# 9. ⚡ Performance & Optimisation

- Lecture uniquement sur MVs
- Index requis sur :
  - pricing_line(pricing_view_id, product_id)
  - MVs (period_month, dimension)
- Pagination obligatoire sur listes
- Timeout DB configuré
- Pas de calcul en mémoire Java

Objectif :
- Dashboard < 300ms
- Drill-down < 500ms

---

# 10. 🔐 Sécurité

- Authentification OIDC
- Vérification audience + issuer
- Rôles :
  - finops-user (lecture)
  - finops-admin (admin runs, pricing admin)

Future possible :
- Filtrage par périmètre (squad / groupe Backstage)

---

# 11. ⚙ Configuration

Variables d’environnement :

- POSTGRES_URL
- POSTGRES_USER
- POSTGRES_PASSWORD
- OIDC_CLIENT_ID
- OIDC_CLIENT_SECRET
- FINOPS_DEFAULT_HISTORY_MONTHS=12
- FINOPS_MAX_LIMIT=200

---

# 12. 🚀 Déploiement

## Kubernetes

- Deployment
- Service
- Ingress
- HPA optionnel
- Readiness / Liveness probes

## CI/CD

- Maven build
- Build image
- Scan sécurité
- Déploiement via ArgoCD

---

# 13. 📊 Monitoring

Metrics :

- finops_api_request_duration
- finops_api_query_duration
- finops_api_errors_total

Health :

- DB connectivity
- freshness last batch run

---

# 14. 🏁 Résumé

Le microservice **FinOps API** :

- Expose les données consolidées
- Applique dynamiquement la Vision Budgétaire
- Lit exclusivement les agrégats PostgreSQL
- Est stateless et scalable
- Est sécurisé via OIDC
- S’intègre proprement dans Kubernetes

Il constitue la couche d’exposition performante du module FinOps.
