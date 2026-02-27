# 🧱 Spécification Technique – FinOps Batch (Quarkus)  
**Orchestration & Normalisation des données (consommation mensuelle)**

## 1. Portée du document

Ce document décrit le microservice **FinOps Batch** chargé de :

- Collecter les données de consommation depuis plusieurs sources (Open/Legacy via Mongo, Cloud privé/public via APIs, services natifs internes).
- Normaliser et transformer ces données en **consommations mensuelles** par **application × produit**.
- Charger les consommations normalisées dans **PostgreSQL** (Data Mart FinOps).
- Rafraîchir les **Materialized Views** de consommation.
- Assurer traçabilité, idempotence, reprocess et observabilité.

> Le batch ne calcule pas un “coût final figé” lié à une vision budgétaire. Il produit la **consommation**, utilisée ensuite par l’API pour calculer le coût selon une *Pricing View*.

---

## 2. Hypothèses & principes

### 2.1 Granularité temporelle
- **Grain principal : mensuel** (`period_month = YYYY-MM`)
- Exécution **nightly** : recalcul du **mois courant**, optionnellement `N-1` (gestion des données tardives)

### 2.2 Contrat de sortie
- Sortie unique : **consommation normalisée**
- Grain : `(period_month, application_id, product_id)`
- Mesure : `quantity` (unité d’œuvre)

### 2.3 Hiérarchie métier
- `product → family → domain`
- Le batch produit au minimum `product_id` + `quantity`. Famille/domaine sont déduits via référentiel produit (ou stockés dénormalisés si nécessaire pour perfs).

### 2.4 Idempotence
- Rebuild par période :
  - suppression/rechargement de la fenêtre ciblée
  - aucune dépendance au run précédent

### 2.5 Performance
- Chargements bulk en PostgreSQL (batch insert)
- Refresh MV ordonné en fin de run

---

## 3. Stack technique

### 3.1 Runtime
- **Quarkus** (Java 17)
- Packaging : JVM (recommandé) / Native (optionnel)
- Build : Maven + Quarkus plugin

### 3.2 Accès données
- PostgreSQL : `quarkus-jdbc-postgresql`
  - accès SQL explicite (JDBC) recommandé pour bulk insert
- MongoDB : `quarkus-mongodb-client`
  - lecture des collections “raw CMDB” (Open/Legacy)

### 3.3 HTTP & sécurité (appels APIs)
- REST client : `quarkus-rest-client` (ou MP Rest Client)
- TLS : truststore container + certificats entreprise
- Auth :
  - OIDC client credentials (Keycloak) recommandé
  - ou tokens techniques (secrets) selon SI

### 3.4 Scheduling & exécution
✅ Recommandé : **Kubernetes CronJob**
- Le conteneur batch démarre, exécute, s’arrête.
- ConcurrencyPolicy: `Forbid` (évite runs parallèles)
- Retry job Kubernetes (backoffLimit) selon politique

Alternative : service permanent + `quarkus-scheduler` (si CronJob impossible)

### 3.5 Observabilité
- Logs structurés (JSON si standard interne)
- Health : `quarkus-smallrye-health` (optionnel si CronJob)
- Metrics : `quarkus-micrometer-registry-prometheus`
  - durée run, volume insert, erreurs, durée refresh MV
- Tracing : OpenTelemetry (optionnel)

---

## 4. Architecture du service

### 4.1 Composants principaux
- **BatchRunner** : orchestration globale du run
- **RunRepository** : gestion `etl_runs` (runId, status, timings, volumes, logs_url)
- **PeriodResolver** : calcule la fenêtre de périodes à traiter
- **DomainBatch Orchestrator** : enchaîne les blocs par domaine
- **Domain Batches** :
  - `OpenLegacyBatch` (Mongo Raw CMDB → consommations)
  - `PrivateCloudBatch` (APIs → consommations)
  - `PublicCloudBatch` (APIs → consommations)
  - `NativeServicesBatch` (Cube/GitLab/Artifactory → consommations)
- **Normalizer** : mapping vers le contrat commun (application, product, quantity, period)
- **ConsumptionWriter** : load PostgreSQL (bulk)
- **MvRefresher** : refresh des MVs de consommation
- **ReprocessService** : exécution manuelle d’une période (optionnel, exposé via endpoint admin interne)

### 4.2 Contrat de sortie (consommation normalisée)
Objet technique : `ConsumptionRecord`

Champs minimum :
- `period_month` (YYYY-MM)
- `application_id` (id stable)
- `product_id`
- `quantity` (numeric)
- `source_domain` (open/private/public/native) – pour trace
- `run_id`
- `created_at`

---

## 5. Orchestration d’un run

### 5.1 Fenêtre de calcul
Par défaut :
- `period_month = mois courant`

Options :
- `period_month = mois courant + N-1` (recommandé en nightly pour corriger les arrivées tardives)

### 5.2 Étapes du pipeline (workflow technique)

1) **Init run**
- Génération `run_id`
- `etl_runs` insert status=RUNNING + start_time
- Détermination `periods[]`

2) **Extraction & Normalisation par domaine**
Pour chaque domaine activé :
- lire source (Mongo ou API)
- transformer en objets intermédiaires
- normaliser en `ConsumptionRecord`
- valider (quantity >= 0, product_id non null, app_id non null)
- accumuler les résultats

3) **Load Postgre (idempotent)**
Pour chaque période :
- suppression des consommations existantes sur la période et le périmètre (période + domaine/source)
- insertion bulk dans `fact_consumption`

4) **Refresh Materialized Views (consommation)**
- refresh ordonné des MVs
- `CONCURRENTLY` si indexes uniques en place

5) **Finalize**
- update `etl_runs` status=SUCCESS + end_time + volumes
- en cas d’erreur : status=FAILED + error_summary

---

## 6. Idempotence & Reprocess

### 6.1 Idempotence
- Rebuild complet par période
- Aucune dépendance sur les résultats précédents
- Permet correction / rerun propre

### 6.2 Reprocess
- Exécution manuelle possible (Admin)
- Paramètres :
  - période(s)
  - domaines à recalculer
  - mode force (override)

Le batch doit être capable d’exécuter :
- un run “global” (tous domaines)
- un run “ciblé” (domaine(s) + applications optionnel)

---

## 7. Gestion des erreurs & robustesse

### 7.1 Politique d’échec (v1)
Recommandation : **strict**
- Si un domaine critique échoue → run FAILED
- Pas de publication partielle

### 7.2 Retries réseau
- Timeout + retry sur appels APIs (exponentiel/backoff)
- Circuit breaker si autorisé (Fault Tolerance)

### 7.3 Erreurs de données
- Rejeter / tracer les lignes invalides (app inconnue, product inconnu)
- Stocker un résumé dans `etl_runs.error_summary`
- Option : table `etl_run_rejects` (v2) pour audit

---

## 8. Refresh Materialized Views (consommation)

### 8.1 Liste typique
- `mv_consumption_domain_month`
- `mv_consumption_family_month`
- `mv_consumption_application_month`
- `mv_consumption_app_domain_month`
- `mv_consumption_app_family_month`
- `mv_consumption_app_product_month`

### 8.2 Recommandations
- Créer les indexes uniques requis pour `CONCURRENTLY`
- Mesurer durée refresh par MV (metrics)
- Réordonner refresh : socle → drill-down

---

## 9. Configuration Quarkus

Variables d’environnement recommandées :
- `FINOPS_PERIOD_MODE=current|current_plus_n1|range`
- `FINOPS_DOMAINS_ENABLED=open,private,public,native`
- `FINOPS_FORCE_RECALC=false|true`
- `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `MONGO_URL`, `MONGO_DB`
- `OIDC_TOKEN_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`
- `HTTP_TIMEOUT_MS`, `HTTP_RETRIES`

Feature flags :
- activer/désactiver domaines par environnement
- activer reprocess endpoint admin

---

## 10. Exécution & déploiement

### 10.1 Mode recommandé : Kubernetes CronJob
- Schedule nightly (ex: `0 2 * * *`)
- ConcurrencyPolicy: Forbid
- backoffLimit (selon politique)
- Resources requests/limits dimensionnés
- Secrets : DB, OIDC, certs
- NetworkPolicy : accès Postgres + APIs nécessaires

### 10.2 Image & runtime
- Image `finops-batch:<version>`
- Entrypoint : exécute une commande unique `java -jar ...` (ou native)
- Sortie : code 0 en SUCCESS, non-0 en FAILED

---

## 11. Performance (recommandations)

- Bulk insert (JDBC batch size)
- Index sur `fact_consumption` :
  - `(period_month, application_id)`
  - `(period_month, product_id)`
  - `(period_month, domain_id)` si dénormalisé
- Partitionnement mensuel (v2) si volumétrie très élevée
- Limiter la fenêtre recalculée (mois courant + N-1)

---

## 12. Sécurité

- Identité technique pour appels API (service account)
- Secrets dans Vault/K8s Secrets (pas en config claire)
- TLS systématique + truststore entreprise
- Aucun secret en logs

---

## 13. Livrables attendus

- Microservice Quarkus `finops-batch`
- Modules internes par domaine (packages séparés)
- DAO Postgre : load + delete par période
- Client Mongo + clients REST externes
- MvRefresher + `etl_runs` tracking
- Helm chart / manifests CronJob
- Observabilité : metrics, logs, alerting minimal (run failed)

---

## 14. Résumé

Le **FinOps Batch** est un ETL nightly en Quarkus, exécuté idéalement en **Kubernetes CronJob**.  
Il normalise des sources hétérogènes en **consommations mensuelles** stockées dans PostgreSQL, rafraîchit des **Materialized Views de consommation** et publie une traçabilité complète via `etl_runs`.  
Le calcul des coûts est laissé à l’API via la **Vision Budgétaire** versionnée.
