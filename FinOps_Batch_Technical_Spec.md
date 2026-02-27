# 🧱 Spécification Technique – FinOps Batch (Quarkus)

## 1. Portée

Ce document décrit le **microservice FinOps Batch** chargé de :
- Collecter / calculer les consommations et coûts FinOps par **domaine technologique** (Open/Legacy, Cloud Privé, Cloud Public, Natif).
- Normaliser ces données sous forme de **relevés mensuels** par application et par produit.
- Charger les relevés dans **PostgreSQL** (data mart FinOps).
- Rafraîchir les **materialized views** utilisées par l’API / Backstage.
- Assurer traçabilité, idempotence, reprocess et observabilité.

---

## 2. Hypothèses & Principes

- **Granularité principale : mensuelle** (`period_month`).
- Exécution **nightly** (toutes les nuits) avec recalcul de la fenêtre « mois courant » (et éventuellement N-1).
- Le batch est **idempotent** au niveau de la période (recalcul complet par période).
- Les sources peuvent être hétérogènes ; la sortie est un **contrat unique** : `Relevé`.
- Les vues matérialisées sont **déclarées via migrations** et **refresh** en fin de run.

---

## 3. Stack Technique

### 3.1 Runtime
- **Quarkus** (Java 17)
- Packaging : JVM (recommandé) ou native (optionnel selon contraintes d’infra)
- Build : Maven + Quarkus plugin

### 3.2 Accès données
- PostgreSQL : `quarkus-jdbc-postgresql` + ORM léger (JDBC / Panache / JOOQ selon choix)
- MongoDB (Raw CMDB) : `quarkus-mongodb-client` (lecture uniquement côté batch)

### 3.3 HTTP & Sécurité
- `quarkus-rest` / `quarkus-rest-client` pour appeler les APIs (Cloud/Services natifs)
- Auth :
  - OIDC client credentials / service account (Keycloak) **ou**
  - Token technique (vault/secret) selon SI
- TLS / certs : gestion via truststore container + secrets

### 3.4 Scheduling & Exécution
**Recommandation : Kubernetes CronJob**
- Un pod lancé chaque nuit
- Exécute le pipeline
- Se termine (pas de service permanent)

Alternative : service permanent + `quarkus-scheduler` (si CronJob non possible).

### 3.5 Observabilité
- Logs structurés JSON (ou format standard entreprise)
- Metrics Prometheus : durée run, volumes, erreurs
- Tracing (optionnel) : OpenTelemetry

---

## 4. Architecture du Service

### 4.1 Composants principaux

- **BatchRunner** : point d’entrée du run (orchestration globale)
- **Domain Batches** (4 familles) :
  - `OpenLegacyBatch` (Mongo Raw CMDB → Relevés)
  - `PrivateCloudBatch` (APIs internes → Relevés)
  - `PublicCloudBatch` (APIs fournisseurs → Relevés)
  - `NativeCostsBatch` (services natifs : Cube/GitLab/Artifactory → Relevés)
- **ReleveWriter** : persistance en PostgreSQL
- **RunRepository** : gestion `etl_runs` (runId, statut, timings, volumes)
- **MvRefresher** : refresh des materialized views
- **ReprocessController** (optionnel) : endpoint interne pour relancer une période (si besoin)

### 4.2 Contrat de sortie : Relevé (concept technique)

Un relevé est un enregistrement normalisé qui identifie :
- `period_month`
- `application_id` (ou identifiant stable d’application)
- `product_id`
- (dérivés / ou stockés) `family_id`, `domain_id`
- `usage_quantity`
- `unit_cost`
- `total_cost`
- `source`
- `run_id`
- timestamps de calcul

---

## 5. Orchestration d’un Run

### 5.1 Fenêtre de calcul
- Par défaut : `period_month = current_month`
- Optionnel : recalcul `current_month` + `previous_month` (gestion data tardive)

### 5.2 Étapes du pipeline (workflow technique)

1) **Init run**
- Créer `run_id`
- Insérer ligne `etl_runs` : status = `RUNNING`, start_time
- Résoudre la/les périodes ciblées

2) **Extraction / Calcul par domaine**
Pour chaque domaine activé :
- Lire source (Mongo ou APIs)
- Mapper vers objets métier intermédiaires
- Calculer usage + coûts
- Produire une liste de `Relevé`

3) **Load Postgre (idempotent)**
Pour chaque période ciblée :
- `DELETE` des relevés existants (ou `DELETE` par run+period) puis réinsertion
  - stratégie recommandée : supprimer par `period_month` et `source` (ou `domain`) avant insert
- Insert en bulk (batch insert) dans `fact_releve`

4) **Refresh materialized views**
- Refresh des MVs nécessaires (ordre défini)
- Utiliser `CONCURRENTLY` si index uniques en place

5) **Finalize run**
- Update `etl_runs` : status = `SUCCESS`, end_time, volumes, erreurs=0
- En cas d’erreur : status=`FAILED` + stack/summary + end_time

---

## 6. Idempotence & Reprocess

### 6.1 Stratégie recommandée
- **Rebuild complet** d’une période au lieu d’upsert incrémental
- Pour reprocess :
  - même pipeline, même période
  - suppression + réinsertion

### 6.2 Table de suivi `etl_runs`
Champs typiques :
- `run_id` (PK)
- `status` (RUNNING/SUCCESS/FAILED)
- `periods` (ex: JSON array)
- `started_at`, `ended_at`
- `records_inserted`
- `errors_count`
- `error_summary` (texte court)
- `trigger_type` (CRON / MANUAL)
- `git_sha` / `version` (optionnel mais très utile)

---

## 7. Gestion des erreurs & Robustesse

### 7.1 Politique d’échec
- Si un domaine échoue :
  - Option A (strict) : run FAILED, rien n’est publié
  - Option B (tolérant) : domain FAILED mais run SUCCESS partiel (à éviter en v1)

Recommandation : **strict** en v1 (cohérence data).

### 7.2 Retries
- Retries réseau sur appels API (timeout, 5xx)
- Circuit breaker / backoff (MicroProfile Fault Tolerance si autorisé)

### 7.3 Timeouts
- Définir des timeouts par client HTTP
- Timeouts DB (pool) et taille de batch d’insert

---

## 8. Refresh des Materialized Views

### 8.1 Orchestration
- `MvRefresher` exécute un ordre déterministe :
  1. MVs socle (domain/family/app)
  2. MVs drill-down
  3. MVs ranking/anomalies
  4. MVs history (si activées)

### 8.2 Exemple
- `mv_cost_domain_month`
- `mv_cost_family_month`
- `mv_cost_application_month`
- `mv_cost_app_domain_month`
- `mv_cost_app_family_month`
- `mv_cost_app_product_month`
- `mv_rank_app_month`
- `mv_anomalies_month`
- `mv_history_domain`

---

## 9. Configuration (Quarkus)

### 9.1 Variables d’environnement (exemples)
- `FINOPS_PERIOD_MODE=current|range`
- `FINOPS_RECALC_PREVIOUS_MONTH=true|false`
- `FINOPS_DOMAINS_ENABLED=open,private,public,native`
- `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `MONGO_URL`, `MONGO_DB`
- `OIDC_TOKEN_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`
- `HTTP_TIMEOUT_MS`, `HTTP_RETRIES`

### 9.2 Feature flags
Permettre d’activer/désactiver des domaines sans rebuild d’image.

---

## 10. Exécution & Déploiement

### 10.1 Mode recommandé : Kubernetes CronJob

- Image : `finops-batch-ms:<version>`
- Schedule : nightly (ex: `0 2 * * *`)
- ConcurrencyPolicy : `Forbid` (évite 2 runs en parallèle)
- Resources : requests/limits adaptés aux volumes
- Secrets : DB creds, OIDC creds, TLS certs
- NetworkPolicy : accès DB + APIs uniquement

### 10.2 Alternative : Service permanent
- Deployment + `quarkus-scheduler`
- Moins clean (process toujours actif) mais simple si CronJob interdit

---

## 11. Performance (recommandations)

- Utiliser inserts batch (JDBC batch size)
- Indexer `fact_releve` sur `(period_month, application_id)`, `(period_month, domain_id)`, etc.
- Limiter refresh MV à la fenêtre recalculée si possible (sinon refresh complet acceptable en v1)
- Prévoir partitionnement mensuel de `fact_releve` si volumes très élevés

---

## 12. Sécurité

- Identité technique (service account) pour appels API
- Stockage secrets : Kubernetes Secrets / Vault
- Aucun secret en logs
- TLS systématique (HTTPs) + truststore à jour

---

## 13. Livrables attendus (tech)

- Projet Quarkus `finops-batch-ms`
- Modules par domaine (packages séparés)
- Migrations DB (si batch porte aussi les migrations) ou dépendance à un module DB dédié
- Helm chart / manifests CronJob
- Dashboards/alerting minimal : run failed, durée anormale, volume anormal

---

## 14. Points ouverts (à trancher)

- Identifiant stable d’application (UUID interne vs name)
- Politique tolérance échec multi-domaines (strict vs partial)
- Rafraîchissement MV complet vs partiel
- Stockage famille/domaine dénormalisé dans `fact_releve` ou via dimension

---

## 15. Résumé

Le FinOps Batch est un **ETL nightly** orchestré sous Quarkus, exécuté idéalement via **Kubernetes CronJob**.  
Il normalise des sources hétérogènes en **relevés mensuels** stockés dans PostgreSQL, puis rafraîchit des **materialized views** consommées par l’API FinOps et Backstage.
