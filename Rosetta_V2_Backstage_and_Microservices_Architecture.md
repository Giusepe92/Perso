# 🧭 Rosetta V2 – Architecture Backstage + Microservices (Vue d’ensemble)
## Plugins, Modules Backstage, API Gateway, Data Marts & Batchs (Mongo → PostgreSQL)

**Objectif du document :** fournir une vue *compacte mais complète* de l’architecture Rosetta V2, de Backstage jusqu’aux microservices, bases de données, batchs et sources de données.

---

# 1) Vue globale – principes

Rosetta V2 suit un modèle “plateforme data-driven” :

**Sources externes / Raw → Normalisation (Batch) → Data Mart PostgreSQL → API (serving) → UI Backstage**

Deux modes de consommation coexistent :
- **Live** : API Rosetta interroge directement une source (Dynatrace / ArgoCD / GitLab / ELISA) pour du statut instantané
- **Historisé** : un batch ingère et agrège régulièrement, puis l’API sert un Data Mart (rapide, stable, historisé)

---

# 2) Backstage (Portail unique)

## 2.1 Déploiement
- **1 déploiement Backstage** (frontend + backend dans le même conteneur)
- **1 base PostgreSQL Backstage** (gérée par Backstage : schémas, migrations, modèles)
- Rosetta **n’écrit pas** dans la DB Backstage

## 2.2 Rôle Backstage dans Rosetta
- Authentifie les utilisateurs (OIDC/SSO)
- Expose les pages Rosetta (plugins frontend)
- Fournit le Software Catalog (entités Components, Systems, Groups, Resources)
- Héberge une couche backend “proxy” (API gateway) + modules (catalog, authz)

---

# 3) Plugins Frontend (UI)

## 3.1 `rosetta-core` (plugin frontend)
Composants UI partagés :
- filtres (période, domaine, groupe)
- KPI cards / badges
- charts containers & layouts
- pattern drilldown & navigation
- design system Rosetta (styles, tables, dialogues)

## 3.2 `rosetta-finops` (plugin frontend)
Pages user :
- dashboard coûts (domain → family → product → app)
- pricing view (vision budgétaire) + comparaisons
- historique & tendances
Pages admin :
- batch runs, logs, relance manuelle, reprocess

## 3.3 `rosetta-monitoring` (plugin frontend)
- vue application : golden signals, incidents, changes, SLO
- déploiements : live + historique + DORA (light puis full)
- liens ELISA (logs) contextualisés
- dashboards direction (top risques, tendances)

## 3.4 `rosetta-referentiel` (plugin frontend)
- catalogue Rosetta “métier” (apps / groupes)
- fiches application (ownership, relations, pivots)
- formulaires : création / modification / demande d’ajout
- admin : approvals + gestion mappings/pivots

---

# 4) Backstage Backend – plugin & modules

## 4.1 `rosetta-gateway-backend` (plugin backend)
Rôle : **proxy unifié** entre Backstage et les microservices Rosetta.

Fonctions :
- forward des tokens / identité (OIDC → microservices)
- ajout de headers d’audit (x-user, x-groups, x-request-id)
- timeouts, retry safe, caching léger optionnel
- normalisation erreurs (4xx/5xx) pour l’UI

Routes (exemple) :
- `/api/rosetta/finops/*` → `finops-api`
- `/api/rosetta/monitoring/*` → `monitoring-api`
- `/api/rosetta/ref/*` → `platform-ref-api`

## 4.2 Module “AuthZ / RBAC / EDC” (module Backstage)
Un **module** attaché au backend Backstage, dédié :
- mapping Groupes AD → rôles Rosetta
- politique d’accès (RBAC) pour UI & appels gateway
- préparation intégration EDC (si utilisé comme référentiel d’accès)
- cohérence : `Rosetta_User`, `Rosetta_FinOps_Admin`, `Rosetta_Referentiel_Admin`, `Rosetta_Admin`

> Note : la sécurité doit être enforce côté microservices également. Backstage fait du gating UX + proxy contrôlé.

## 4.3 Module “Catalog Integration” (module Backstage)
Un **module** attaché au backend Backstage, dédié :
- providers (ex : GitLab catalog discovery)
- processors / post-processors :
  - enrichissement des entités (annotations/pivots)
  - notification au référentiel lors découverte/MAJ/suppression de composants
- règles de nommage, ownership, tagging minimum

---

# 5) Microservices Rosetta (Serving APIs)

## 5.1 `platform-ref-api` (Référentiel cartographique + approvals)
- entités : applications, groupes, relations, pivots (mappings)
- workflows : demandes / validation admin / audit
- reçoit events du catalog Backstage (component discovered/updated)

DB : `platform_ref_db` (PostgreSQL – OLTP)

## 5.2 `finops-api`
- sert les coûts (facts + MVs) + pricing views
- drilldown, historique, comparaisons
- endpoints admin (runs, logs, trigger)

DB : `finops_db` (PostgreSQL – Data Mart + Materialized Views)

## 5.3 `monitoring-api`
- sert métriques historisées (SLO, incidents, changes, DORA)
- endpoints live (Dynatrace/ArgoCD/GitLab/ELISA)
- dashboards direction / SRE

DB : `monitoring_db` (PostgreSQL – Data Mart + Materialized Views)

---

# 6) Batchs Rosetta (ETL / normalisation / historisation)

## 6.1 Landing / Raw data
- MongoDB (ou stockage brut) reçoit :
  - CMDB/ServiceNow dumps
  - exports Dynatrace
  - autres datasets “bruts”
- non consommé directement par l’UI

## 6.2 `finops-batch` (CronJob)
Lit :
- raw (Mongo) + APIs internes (selon domaines)
Calcule :
- facts consumption / coefficients (direct/indirect)
- refresh des materialized views finops
Écrit :
- `finops_db` (facts/dims + runs + logs metadata)

Exécution :
- nightly (mensuel agrégé, recalcul possible)
- déclenchement manuel via admin FinOps

## 6.3 `monitoring-batch` (CronJob)
Lit :
- exports Dynatrace (raw)
- incidents/changes ServiceNow (raw)
- (optionnel) events déploiement (collectés)
Calcule :
- séries temporelles agrégées (hourly/daily)
- KPI SLO / DORA (light puis full)
- refresh MVs monitoring
Écrit :
- `monitoring_db`

Exécution :
- hourly/daily selon métrique
- déclenchement manuel via admin Monitoring

---

# 7) Sources de données (exemples)

## 7.1 Dynatrace
- metrics API (latence, erreurs, saturation, throughput)
- problems/events
- topology/entities (si dispo)

## 7.2 ServiceNow (CMDB/ITSM)
- incidents
- changes
- CI / relations (selon qualité de mapping)

## 7.3 ArgoCD / GitLab
- statut live déploiements (health/sync)
- pipelines CI/CD
- historisation via monitoring-batch (si besoin DORA)

## 7.4 ELISA (ELK/Kibana)
- liens contextualisés (app/env/time range)
- indicateurs simples (optionnel) si extraction possible

---

# 8) Qui parle à qui ? (flux synthétiques)

## 8.1 Backstage → Rosetta
- UI Rosetta → `rosetta-gateway-backend` → APIs Rosetta
- Catalog Backstage → module catalog → events vers `platform-ref-api`

## 8.2 Batch → Data Mart → API
- finops-batch → `finops_db` → finops-api → Backstage UI
- monitoring-batch → `monitoring_db` → monitoring-api → Backstage UI

## 8.3 Live (Monitoring)
- Backstage UI → gateway → monitoring-api → Dynatrace/ArgoCD/GitLab/ELISA

---

# 9) Ce que permet l’architecture (objectif final)

- Un portail unique (Backstage) pour :
  - cartographie gouvernée (référentiel)
  - pilotage des coûts (FinOps)
  - pilotage observabilité & delivery (Monitoring)
- Des microservices spécialisés et indépendants
- Des Data Marts performants (PostgreSQL + MVs)
- Des batchs industrialisés (CronJobs)
- Une gouvernance robuste (RBAC AD + workflows approvals)
- Une trajectoire incrémentale : ajouter un domaine FinOps / une métrique Monitoring sans refondre l’ensemble

---

# 10) Résumé “1 slide”

- **Backstage (1 conteneur)** : UI Rosetta + catalog + gateway proxy + modules (authz, catalog)
- **Microservices APIs** : référentiel / finops / monitoring
- **Raw zone** : Mongo (données brutes)
- **Batchs** : finops-batch, monitoring-batch (CronJobs)
- **Data Marts** : Postgres par domaine (platform_ref_db, finops_db, monitoring_db)
- **Live + Historique** : monitoring-api (live), batchs (historique)
