# Rosetta V2 — Découpage Agile Global (Epics → Features → User Stories)

> Découpage structuré du programme Rosetta V2 couvrant : Gouvernance, OIDC, FinOps, Référentiel, Monitoring, Architecture, RBAC, Batch, Data Platform.
> Format : Domaine → Epic → Feature → User Stories (titres uniquement).
> Les dépendances sont indiquées en fin de document.

---

# D0 — Fondations Plateforme & Sécurité

## E0.1 — OIDC & Intégration Serveur AD (HELEX)

### F0.1.1 — Configuration OIDC Backstage
- US0.1.1.1 Configurer provider OIDC dans Backstage
- US0.1.1.2 Mapper groupes CN HELEX vers rôles Rosetta
- US0.1.1.3 Gérer refresh token et expiration session

### F0.1.2 — Validation JWT dans Microservices
- US0.1.2.1 Activer OIDC Quarkus sur chaque MS
- US0.1.2.2 Vérifier signature & audience
- US0.1.2.3 Implémenter extraction groupes CN

### F0.1.3 — Client Credentials Flow
- US0.1.3.1 Déclarer service accounts
- US0.1.3.2 Implémenter token machine pour batch
- US0.1.3.3 Sécuriser secrets Kubernetes

---

## E0.2 — RBAC & Gouvernance des Rôles

### F0.2.1 — Définition des rôles Rosetta
- US0.2.1.1 Définir Rosetta_Admin
- US0.2.1.2 Définir Rosetta_FinOps_Admin
- US0.2.1.3 Définir Rosetta_Ref_Admin
- US0.2.1.4 Définir Rosetta_Monitoring_Admin
- US0.2.1.5 Définir Rosetta_User

### F0.2.2 — Contrôles d’accès API
- US0.2.2.1 Restreindre endpoints admin
- US0.2.2.2 Restreindre endpoints batch
- US0.2.2.3 Tester séparation des privilèges

---

# D1 — Rosetta Gov (Gouvernance & Audit)

## E1.1 — Journal d’Audit Global

### F1.1.1 — Modèle audit_event
- US1.1.1.1 Créer table audit_event
- US1.1.1.2 Implémenter indexation optimisée
- US1.1.1.3 Implémenter rétention configurable

### F1.1.2 — API Audit
- US1.1.2.1 POST audit_event
- US1.1.2.2 GET audit filtré paginé
- US1.1.2.3 Détail audit_event

### F1.1.3 — UI Audit Backstage
- US1.1.3.1 Liste filtrable
- US1.1.3.2 Vue détail
- US1.1.3.3 Export CSV

---

## E1.2 — Run Registry Centralisé

### F1.2.1 — Modèle run_registry
- US1.2.1.1 Table run_registry
- US1.2.1.2 Normaliser run summary

### F1.2.2 — API Runs
- US1.2.2.1 Publier résumé run
- US1.2.2.2 Consulter runs par service
- US1.2.2.3 KPI taux succès

---

## E1.3 — Feature Flags & Settings

- US1.3.1 Créer table gov_setting
- US1.3.2 Implémenter API settings
- US1.3.3 UI Settings Admin

---

# D2 — Référentiel Cartographique V2

## E2.1 — Modèle Entités Métier

### F2.1.1 — Applications
- US2.1.1.1 CRUD applications
- US2.1.1.2 Historisation modifications

### F2.1.2 — Groupes
- US2.1.2.1 CRUD groupes
- US2.1.2.2 Relations parent/enfant

### F2.1.3 — Composants
- US2.1.3.1 Synchronisation catalogue Backstage
- US2.1.3.2 Association repo Git

---

## E2.2 — Workflow d’Approbation

- US2.2.1 Demande création entité
- US2.2.2 Validation admin
- US2.2.3 Rejet avec justification
- US2.2.4 Audit approbations

---

## E2.3 — Pivots & Tags Techniques

- US2.3.1 Stocker tags Dynatrace
- US2.3.2 Stocker tags ArgoCD
- US2.3.3 Stocker tags ELISA
- US2.3.4 Exposer pivots API

---

# D3 — FinOps V2 (Datamart & Domaines)

## E3.1 — Data Platform FinOps

### F3.1.1 — Data Contract Postgres
- US3.1.1.1 Tables dim_domain/family/product
- US3.1.1.2 Tables fact_consumption
- US3.1.1.3 Tables fact_cost
- US3.1.1.4 Table pricing_view

### F3.1.2 — Historisation Produits
- US3.1.2.1 Gestion produits actifs/inactifs
- US3.1.2.2 Gestion historisation

---

## E3.2 — Batch FinOps

### F3.2.1 — Ingestion Raw Data
- US3.2.1.1 Lire Mongo raw
- US3.2.1.2 Normaliser données
- US3.2.1.3 Journaliser run

### F3.2.2 — Calcul Domaines Directs
- US3.2.2.1 Calcul fact_consumption
- US3.2.2.2 Calcul fact_cost

### F3.2.3 — Calcul Domaines Indirects
- US3.2.3.1 Générer coefficients
- US3.2.3.2 Appliquer coefficients

---

## E3.3 — Freeze & Périodes

- US3.3.1 Implémenter statut période active/figée
- US3.3.2 Générer snapshot figé
- US3.3.3 Restreindre modification période figée
- US3.3.4 Journaliser freeze/unfreeze

---

## E3.4 — Materialized Views & Reporting

- US3.4.1 MV par domaine
- US3.4.2 MV par application
- US3.4.3 MV par groupe
- US3.4.4 Refresh sécurisé MV

---

# D4 — Monitoring V2

## E4.1 — Intégration Dynatrace

- US4.1.1 Récupérer métriques applicatives
- US4.1.2 Mapper composants référentiel
- US4.1.3 Stocker métriques agrégées

---

## E4.2 — Intégration ServiceNow

- US4.2.1 Import incidents
- US4.2.2 Import changes
- US4.2.3 Calcul MTTR

---

## E4.3 — DORA & SRE Metrics

- US4.3.1 Calcul deployment frequency
- US4.3.2 Calcul lead time
- US4.3.3 Calcul failure rate
- US4.3.4 Calcul MTTR

---

## E4.4 — Historisation & Batch Monitoring

- US4.4.1 Batch nightly métriques
- US4.4.2 Stockage historique
- US4.4.3 API reporting monitoring

---

# D5 — UI & Plugins Backstage

## E5.1 — Plugin FinOps
- US5.1.1 Dashboard global
- US5.1.2 Vue par domaine
- US5.1.3 Vue par application
- US5.1.4 Vue par groupe

## E5.2 — Plugin Monitoring
- US5.2.1 Dashboard SRE
- US5.2.2 Vue incidents
- US5.2.3 Vue DORA

## E5.3 — Plugin Référentiel
- US5.3.1 CRUD entités
- US5.3.2 Workflow approbation

## E5.4 — Plugin Admin
- US5.4.1 Audit Journal
- US5.4.2 Run Registry
- US5.4.3 Feature Flags

---

# D6 — Architecture & Exploitation

## E6.1 — CI/CD & Déploiement
- US6.1.1 Pipelines build microservices
- US6.1.2 Déploiement Kubernetes
- US6.1.3 Gestion secrets

## E6.2 — Observabilité Technique
- US6.2.1 Intégrer logs ELISA
- US6.2.2 Tracing OpenTelemetry
- US6.2.3 Monitoring performance DB

---

# Dépendances Structurantes

1. OIDC (D0) → prérequis pour tous les domaines sécurisés.
2. RBAC (D0.2) → requis pour Gov, FinOps, Référentiel, Monitoring.
3. Référentiel (D2) → prérequis FinOps & Monitoring (pivots).
4. Data Contract FinOps (D3.1) → prérequis Batch FinOps.
5. Gov (D1) → requis pour audit des autres modules.
6. Plugins UI (D5) → dépendent des APIs correspondantes.
7. Freeze (D3.3) → dépend Data Contract + Batch FinOps.
8. DORA (D4.3) → dépend Dynatrace + CI/CD.

---

Fin du découpage.
