# Rosetta Gov (Governance API) — Spécifications Fonctionnelles & Techniques (V2)

> **But** : centraliser la gouvernance et l’audit de la plateforme Rosetta V2 (Backstage + microservices), fournir des APIs Admin transverses et des capacités de reporting pour les décisionnaires et super-admins.

---

## 1) Objectifs

### Objectifs principaux
- Centraliser un **Journal d’audit** métier (actions admin + événements critiques).
- Offrir des **rapports de gouvernance** (usage, exécutions batch, conformité, qualité de données).
- Fournir un point d’entrée unique pour les écrans Admin “plateforme” dans Backstage.
- Outiller la direction et les équipes contrôle : traçabilité, preuve, conformité.

### Objectifs non recherchés
- Ne remplace pas ELISA/Kibana (logs techniques). Le module référence ELISA via `correlation_id`.
- Ne stocke pas les données métiers FinOps/Monitoring/Référentiel (il centralise la gouvernance, pas les faits).

---

## 2) Périmètre Fonctionnel

### 2.1 Journal d’Audit Global (plateforme)
**Public :** Super Admin (`Rosetta_Admin`), éventuellement `Rosetta_Audit_Viewer` (lecture seule).

Fonctions :
- Liste paginée filtrable de tous les événements auditables (FinOps, Référentiel, Monitoring, RBAC, Platform).
- Détail d’événement (contexte, cible, payload, résultat, durée).
- Lien vers les logs ELISA via `correlation_id`.
- Export CSV filtré (optionnel).
- Indicateurs synthétiques : volume d’actions par période, par domaine, par admin.

Événements couverts (exemples) :
- Batch : run/reprocess/freeze/unfreeze/refresh MV
- Approvals : approve/reject/create/update/delete entités
- RBAC : assign/revoke rôles, changements de droits
- Opérations exceptionnelles : unlock period, override, maintenance flag

---

### 2.2 Registre des Exécutions (Runs Registry)
**But :** fournir une vue consolidée des runs batch sur tous les domaines (FinOps, Monitoring, etc.).

Fonctions :
- Historique des runs (statut, durée, période, domaine, déclencheur).
- Détails run : étapes, volumes, anomalies, MVs refreshées, liens ELISA.
- KPI : taux de succès, p95 durée, volumétrie traitée.

Remarque : chaque microservice garde sa table “run” locale, mais **Rosetta Gov** reçoit un résumé normalisé (“run summary”).

---

### 2.3 Reporting Gouvernance (Management & Direction)
**Objectif :** donner des “facts” prêts pour des comités.

Rapports phares :
- **Adoption** : utilisateurs actifs, pages vues, entités consultées (si instrumentation).
- **Santé plateforme** : taux de succès batch, incidents, indisponibilités, SLA interne.
- **Qualité données** : % entités référentiel complètes, pivots manquants, mapping Dynatrace absent, etc.
- **Conformité** : actions admin, périodes figées, overrides, accès aux données sensibles.
- **Charge** : volumétrie événements, volumétrie runs, taille DB, rétention.

Sorties :
- API JSON pour dashboards
- Export CSV/JSON (optionnel)
- “Monthly governance digest” (rapport mensuel auto) (optionnel)

---

### 2.4 Annuaire des Permissions & Rôles (RBAC Registry)
**But :** rendre lisible “qui a quels droits” (audit + contrôle).

Fonctions :
- Liste des rôles Rosetta (Admin, FinOps_Admin, Ref_Admin, Monitoring_Admin, User).
- Liste des membres par rôle (synchro EDC/AD, ou vue “effective roles”).
- Historique des changements de rôles (audit_event).
- Vérifications conformité : rôle admin trop large, séparation des tâches.

---

### 2.5 Paramètres & Feature Flags plateforme (Admin Settings)
**But :** gouverner l’activation de fonctionnalités globales.

Exemples :
- activer/désactiver un domaine FinOps
- activer “manual runs”
- maintenance mode d’un module
- configuration rétention audit

Chaque changement est audité.

---

## 3) UX Backstage (écrans admin)
Ces écrans sont exposés via un plugin “Rosetta Admin”.

Pages recommandées :
1. **Audit Journal** (global)
2. **Runs Registry** (global)
3. **RBAC & Permissions** (global)
4. **Reporting** (tableaux/graph)
5. **Settings / Feature Flags**

---

## 4) Architecture Technique

### 4.1 Positionnement
- Microservice Quarkus REST : `rosetta-gov-api`
- DB Postgres dédiée (ou schéma `rosetta_gov` dans une DB Rosetta partagée)
- API consommée par :
  - Backstage plugin Admin
  - autres microservices (publication events / run summaries)

### 4.2 Intégration avec les microservices
Deux intégrations supportées (recommandation : HTTP) :

#### A) Publication par HTTP (recommandée)
- FinOps / Monitoring / Référentiel appellent :
  - `POST /gov/audit/events`
  - `POST /gov/runs`
- Avantages : découplage DB, contrôle schema, validation, versioning.
- Inconvénient : 1 hop réseau.

#### B) Écriture DB directe (tolérée si contrainte)
- microservices écrivent dans `audit_event` via un user DB commun.
- Inconvénient : couplage DB, droits plus larges.

---

## 5) Modèle de Données (Postgres)

### 5.1 `audit_event`
Append-only, paginé server-side.

Champs :
- `event_id` UUID PK
- `occurred_at` timestamptz
- `domain` (FINOPS/REFERENTIEL/MONITORING/PLATFORM)
- `action` (ex: FINOPS_FREEZE_PERIOD)
- `actor_user_id`, `actor_email` (optionnel), `actor_groups` (json)
- `actor_role_effective`
- `source` (UI/API/CRON/SYSTEM)
- `target_type`, `target_ref`
- `payload_summary` jsonb
- `result_status` (SUCCESS/FAILED/DENIED/CANCELED)
- `result_message`
- `duration_ms`
- `correlation_id`
- `links` jsonb

Index :
- (occurred_at desc)
- (domain, occurred_at desc)
- (actor_user_id, occurred_at desc)
- (action, occurred_at desc)
- (target_ref)

### 5.2 `run_registry`
Résumé normalisé des runs consolidés.

Champs :
- `run_id` UUID PK
- `origin_service` (finops-batch, monitoring-batch, etc.)
- `run_type` (RUN/REPROCESS/FREEZE/UNFREEZE/REFRESH_MV)
- `period` (YYYY-MM) optionnel
- `status` (RUNNING/SUCCESS/FAILED/CANCELED)
- `trigger` (CRON/MANUAL/SYSTEM)
- `requested_by` (userId)
- `started_at`, `ended_at`, `duration_ms`
- `metrics` jsonb (volumes, anomalies, counters)
- `correlation_id`
- `links` jsonb

Index :
- (started_at desc)
- (origin_service, started_at desc)
- (status, started_at desc)
- (period, origin_service)

### 5.3 `gov_setting`
Key/value gouverné.
- `key` text PK
- `value` jsonb
- `updated_at`
- `updated_by`
- audit systématique via `audit_event`

### 5.4 `rbac_snapshot` (optionnel)
- `taken_at`
- `role`
- `members` jsonb

---

## 6) API (contrats principaux)

### 6.1 Audit
- `POST /gov/audit/events`
- `GET  /gov/audit/events?from=&to=&domain=&action=&status=&actor=&target=&page=&pageSize=`
- `GET  /gov/audit/events/{eventId}`

### 6.2 Runs registry
- `POST /gov/runs` (publish run summary)
- `GET  /gov/runs?from=&to=&service=&status=&type=&period=&page=&pageSize=`
- `GET  /gov/runs/{runId}`

### 6.3 Reporting (exemples)
- `GET /gov/reports/overview?month=YYYY-MM`
- `GET /gov/reports/adoption?from=&to=`
- `GET /gov/reports/quality?scope=ref|finops|monitoring`
- `GET /gov/reports/compliance?from=&to=`

### 6.4 Settings / feature flags
- `GET  /gov/settings`
- `PUT  /gov/settings/{key}` (admin only)

### 6.5 RBAC
- `GET /gov/rbac/roles`
- `GET /gov/rbac/members?role=...`
- `GET /gov/rbac/changes?from=&to=` (audit_event filtré)

---

## 7) Sécurité

### AuthN
- OIDC (Keycloak/ADFS), propagation JWT via Backstage gateway.

### AuthZ
- `Rosetta_Admin` pour audit global / settings
- `Rosetta_Audit_Viewer` (optionnel) lecture seule

### Audit de l’audit
Chaque consultation du journal génère un `audit_event` : `GOV_AUDIT_READ` (filtres inclus).

### Protection
- pagination obligatoire, `pageSize` max 200
- masquage champs sensibles (whitelist)
- rétention configurable

---

## 8) Observabilité
- logs JSON + `correlation_id`
- métriques : latence endpoints, taux d’écriture, croissance DB
- traces OTel si dispo

---

## 9) Déploiement & Exploitation
- Quarkus JVM recommandé
- Postgres : schéma `rosetta_gov`
- Migrations Flyway/Liquibase
- sauvegarde Postgres standard
- rétention 24–36 mois (à adapter)

---

## 10) Roadmap MVP (incrémentale)

### MVP 1 (2–3 semaines)
- `audit_event` + endpoints GET/POST
- instrumentation FinOps (batch + admin actions)
- UI Backstage : Audit Journal + détail
- liens ELISA via correlation_id

### MVP 2 (2–3 semaines)
- `run_registry` + endpoints
- UI Runs Registry
- reporting overview (succès batch, volumes, top actions)
- settings basiques (feature flags)

### MVP 3 (3–6 semaines)
- RBAC registry + snapshots
- rapports qualité données
- exports + digest mensuel

---

## 11) Estimation globale (ordre de grandeur)
- MVP 1 : 8–12 j.h backend + 6–10 j.h front
- MVP 2 : 8–12 j.h backend + 6–10 j.h front
- MVP 3 : 12–25 j.h selon profondeur RBAC/Reporting

---

## 12) Résumé
**Rosetta Gov** = couche “gouvernance plateforme” :
- audit centralisé,
- registre des runs,
- reporting direction,
- RBAC lisible,
- settings/feature flags,
en complément d’ELISA pour le détail technique.
