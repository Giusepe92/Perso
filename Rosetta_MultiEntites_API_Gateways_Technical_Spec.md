# Rosetta – Architecture Multi-Entités  
## Spécification Technique & Conception (API Gateway Entité + API Gateway Groupe)

---

# 0. Résumé exécutif (technique)

Rosetta devient un **réseau d’instances Entité** (Backstage + microservices + datamarts) piloté par :

1. **Rosetta API Gateway Entité** (point d’entrée local, stable, sécurisé, observé)
2. **Rosetta API Gateway Groupe** (multi-tenant, routage vers les entités, agrégation transverse)

Cette architecture permet :

- APIs locales fiables pour chaque entité
- Une seule API transverse Groupe (un seul point d’intégration)
- Une vision Groupe (FinOps/Green/Monitoring/Référentiel/Gouvernance) sans dépendre d’un data lake obligatoire
- La possibilité d’un **Backstage Groupe “léger”** : front + API gateway groupe, sans microservices métier ni base locale

---

# 1. Objectifs & principes

## 1.1 Objectifs

- Exposer des APIs Rosetta “Enterprise-grade”
- Support multi-entités (tenants) via un routage standard
- Garantir gouvernance, sécurité, traçabilité et audit
- Permettre intégration simple dans outils Groupe
- Préparer une vision Groupe consolidée (à la demande ou via cache/snapshots)

## 1.2 Principes clés

- **API-first** : tout passe par API
- **Tenant-aware** : chaque requête identifie son tenant
- **Zero trust** : JWT + scopes + règles d’accès multi-tenant
- **Observability native** : logs, métriques, tracing, audit
- **Backward compatibility** : versioning /api/v1, /api/v2

---

# 2. Composants à mettre en place

## 2.1 Côté Entité (par instance Rosetta)

### A) Rosetta API Gateway – Entité (obligatoire)

Responsabilités :

- AuthN/AuthZ (JWT, scopes, RBAC)
- Routing vers microservices (FinOps, Monitoring, Référentiel, Gov…)
- Normalisation des réponses (enveloppes JSON communes)
- Rate limiting & protection
- Centralisation logs et métriques
- Exposition OpenAPI consolidée

### B) Microservices Entité (métier)

- FinOps API (datamart + pricing views)
- Monitoring API (metrics/incidents/SLO + historisation)
- Référentiel API (applications, groupes, pivots, tags)
- (Option) Governance API entité (journal local)

### C) Data stores Entité

- MongoDB Raw zone (ingestion/landing)
- PostgreSQL DataMarts (lecture optimisée via MV)
- (Option) PostgreSQL OLTP microservices (référentiel, gouvernance, etc.)

### D) Batchs Entité

- Batch FinOps
- Batch Monitoring
- Batch programmes/KPI (si activé)
- (Option) Batch export groupe (snapshots)

---

## 2.2 Côté Groupe

### A) Rosetta API Gateway – Groupe (obligatoire pour multi-tenant)

Responsabilités :

- AuthN/AuthZ (JWT Groupe)
- Résolution tenant → cible (registry)
- Routing / fan-out multi-entités
- Agrégation / consolidation (option)
- Cache / snapshots (option)
- Journalisation des appels multi-tenant
- Observabilité transverse

### B) Registry tenants (obligatoire)

Source de vérité :

- tenant_id (code entité)
- base_url de l’API Gateway entité
- statut (active/inactive)
- capabilities (finops/monitoring/green/programs)
- contraintes réseau / proxy / timeout spécifiques
- certificats / trust store si nécessaire

Implémentation : table Postgres (groupe) ou config (YAML) au départ, avec UI admin plus tard.

### C) (Option) Store Groupe (cache/snapshots)

Pour stabiliser les temps de réponse et les vues COMEX :

- snapshots quotidiens
- stockage consolidé (Postgres groupe)
- permet des vues transverses sans N appels

### D) Backstage Groupe “léger” (option)

- Une instance Backstage servant uniquement d’UI transverse
- Pas de microservices métier locaux
- Plug-ins “Groupe” qui appellent uniquement l’API Gateway groupe
- (Option) un petit “référentiel groupe” minimal (registry + liens)

---

# 3. Routage multi-tenant : fonctionnement

## 3.1 Entrée côté Groupe

Le client appelle :

`GET /api/group/v1/finops/domains?tenant=ENT_X&month=2026-01`

### Règles

- tenant obligatoire sur les endpoints “entité proxy”
- tenant peut aussi être dans le path : `/api/group/v1/tenants/{tenantId}/...` (plus propre)
- interdiction de “wildcard tenant” sauf endpoints d’agrégation

---

## 3.2 Résolution tenant → URL cible

Pseudo-implémentation :

1. Lire tenantId
2. Charger tenant config depuis registry
3. Vérifier tenant actif
4. Vérifier capabilities (module activé)
5. Construire URL cible : `tenant.base_url + mapped_path`
6. Forward request avec token approprié (voir § sécurité)

---

## 3.3 Routing : patterns

### Pattern 1 – Proxy simple (1 tenant)

- forward strict
- réponse en streaming / passthrough
- faible overhead

### Pattern 2 – Fan-out (N tenants)

- exécuter requêtes parallèles sur plusieurs tenants
- agréger résultats
- retourner un résultat consolidé

### Pattern 3 – Proxy + enrichissement

- forward vers un tenant
- enrichir réponse (ex : ajouter metadata groupe, tags, benchmarks)

---

# 4. Sécurité : modèles recommandés

## 4.1 Authentification clients externes

- OIDC Client Credentials (ClientID/Secret)
- JWT signé (Groupe) avec scopes multi-tenant
- Tokens courts (5-15 min)
- Rotation secrets

## 4.2 Problème clé : token propagation vers l’Entité

Deux modèles possibles. Spéc technique retient **un modèle clair** :

### Modèle retenu : “Token Exchange / On-behalf-of” (idéal)  
Si l’infra OIDC le permet, la Gateway Groupe échange le token Groupe contre un token Entité (audience entité).

Avantages :
- traçabilité complète
- scope mapping explicite
- entité contrôle ce qui est accessible

Alternative (si token exchange impossible au début) :
- “service-to-service token” : Gateway Groupe possède un client technique dédié sur chaque entité.
- la Gateway Groupe appelle l’entité avec le token “service account groupe→entité”.

Dans les deux cas, l’entité loggue l’appel avec :
- tenant
- client technique groupe
- endpoint
- requestId

## 4.3 Autorisation (RBAC + scopes)

### Scopes côté Groupe

- rosetta.group.read.tenants
- rosetta.group.read.finops
- rosetta.group.read.monitoring
- rosetta.group.read.referential
- rosetta.group.aggregate.finops (fan-out)

### Mapping des scopes

Gateway Groupe vérifie :
- scope requis pour endpoint
- droits multi-tenant explicites si fan-out

Gateway Entité vérifie :
- scope entité requis
- éventuellement “caller=group-gateway”

---

# 5. Journalisation / Observabilité

## 5.1 Logs techniques

### Au niveau Groupe

- requestId global
- tenantId
- endpoint
- durée routing / upstream
- statut HTTP
- client_id OIDC

### Au niveau Entité

- requestId reçu (propagé)
- caller_id (group gateway service account)
- endpoint
- durée
- statut

## 5.2 Tracing

Recommandation :
- propagation headers : `X-Request-Id`, `traceparent`
- OpenTelemetry + exporter ELISA/ELK
- corrélation cross-tenant

---

# 6. Catalogue d’APIs à prévoir

## 6.1 APIs Entité (exposées derrière gateway entité)

- Référentiel : apps/groups/components + pivots (tags dynatrace, argo, etc.)
- FinOps : agrégats domaine/famille/produit/app + pricing views
- GreenRadar : CO2 agrégé
- Monitoring : métriques, incidents, SLO, états de déploiement
- Admin : batch runs, audit journal, freeze/défreeze périodes, refresh MV

## 6.2 APIs Groupe (exposées par gateway groupe)

### A) Proxy tenant

- /tenants/{id}/finops/...
- /tenants/{id}/monitoring/...
- /tenants/{id}/referential/...

### B) Agrégation transverse

- /finops/summary?tenants=...&month=...
- /green/summary?month=...
- /maturity/summary (complétude référentiel / adoption)
- /audit/summary (journal transverse)

### C) Registry / onboarding

- GET /tenants
- POST /tenants (admin groupe)
- PATCH /tenants/{id}/status
- GET /tenants/{id}/capabilities

---

# 7. Intégration dans un Backstage Groupe “léger”

## 7.1 Objectif

Avoir un portail Rosetta Groupe pour :

- exposer des dashboards transverses
- fournir navigation vers les Rosetta entité (“deep links”)
- éviter de re-déployer des microservices métier au niveau Groupe

## 7.2 Modèle

Backstage Groupe = UI uniquement :

- plugin “Rosetta Group” appelle Gateway Groupe
- aucune base métier locale
- registry tenants minimal (dans gateway groupe)

## 7.3 Deep links

Les réponses Gateway Groupe incluent :
- tenantId
- entityBaseUrl
- linkToEntityView (pré-construit)

Ainsi, cliquer sur une application dans la vue groupe renvoie vers la fiche application dans l’entité.

---

# 8. Gouvernance & process

## 8.1 Onboarding d’une nouvelle entité

1. Déploiement Rosetta entité (gateway + microservices)
2. Tests de connectivité (Groupe → Entité)
3. Création client OIDC “group→entity”
4. Ajout tenant dans registry
5. Validation sécurité (scopes, logs)
6. Activation progressive par capabilities

## 8.2 Gestion des évolutions

- versioning OpenAPI
- matrice compatibilité (Gateway Groupe ↔ Entité)
- feature flags pour endpoints nouveaux
- monitoring des endpoints et SLA

---

# 9. Stratégie d’implémentation (progressive)

## Phase 1 – Entité (socle)

- Gateway entité
- scopes OIDC entité
- OpenAPI consolidée
- endpoints FinOps core + référentiel pivot

## Phase 2 – Groupe (proxy)

- Gateway groupe
- registry tenants (statique au départ)
- proxy tenant (pas d’agrégation)
- deep links vers entité

## Phase 3 – Groupe (agrégation & cache)

- fan-out multi-tenant
- consolidation
- snapshots quotidiens
- dashboards groupe

---

# 10. Conclusion

Cette architecture :

- industrialise les APIs Rosetta au niveau Entité
- fournit une API transverse Groupe multi-tenant via une gateway unique
- permet un Backstage Groupe “léger” (UI + gateway groupe)
- assure sécurité, gouvernance et observabilité à grande échelle
- prépare une trajectoire V3/V4 pour la consolidation, la BI et l’IA

Elle transforme Rosetta en **backbone API IT du Groupe**.
