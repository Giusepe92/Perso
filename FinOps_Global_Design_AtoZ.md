# 📌 Module FinOps – Conception Globale (A→Z)

## 1. 🎯 Objectif du module

Le module **FinOps** a pour but de fournir une vision **fiable, industrialisée et exploitable** des coûts d’infrastructure et de plateformes, par :

- **Application**
- **Produit**
- **Famille de produits**
- **Domaine technologique**

Le module transforme des données hétérogènes (CMDB, APIs Cloud/Plateformes, services natifs internes) en **relevés mensuels normalisés**, consolide ces relevés dans **PostgreSQL**, puis expose des **vues agrégées** via une **API dédiée** pour alimenter des **écrans Backstage** (dashboard & drill-down).

Ce document introduit la conception globale ; les détails techniques (Batch, MVs, API, UI) sont documentés séparément.

---

## 2. 🧱 Principes clés

### 2.1 Granularité temporelle
- **Grain principal : mensuel** (`period_month = YYYY-MM`)
- Exécution **nightly** : recalcul du **mois courant**, optionnellement du mois précédent (gestion données tardives)

### 2.2 Hiérarchie métier des coûts
- **Produit → Famille → Domaine technologique**
- Un coût est toujours rattaché à un **produit** (le reste est déduit du référentiel)

### 2.3 Contrat unique de sortie : “Relevé”
Quel que soit le domaine d’entrée, le module produit une sortie uniforme : un **relevé** par application et par produit.

### 2.4 Performance
- Les écrans Backstage ne lisent **jamais** les données brutes.
- L’API s’appuie exclusivement sur des **agrégats** (Materialized Views) pour une UX fluide.

---

## 3. 🏗 Architecture d’ensemble

### 3.1 Vue macro

1) **Ingestion / Sources**
- Domaine Open/Legacy : données CMDB (déversées en MongoDB par une équipe tierce)
- Domaine Cloud privé : APIs internes
- Domaine Cloud public : APIs fournisseurs
- Domaine Natif : plateformes internes (Cube, GitLab, Artifactory, …)

2) **Traitement (Batch)**
- Un microservice **FinOps Batch (Quarkus)** orchestre la transformation/calcule.
- Il produit des relevés mensuels normalisés et les charge dans PostgreSQL.

3) **Consolidation & agrégation (PostgreSQL)**
- `fact_releve` (grain fin : app x produit x mois)
- Materialized Views (agrégats pour les écrans)

4) **Exposition (API)**
- Microservice **FinOps API (Quarkus)**
- Endpoints dédiés aux écrans Backstage (dashboard, domaine, famille, application, classements, historique)

5) **Présentation (Backstage UI)**
- Pages FinOps : Dashboard + vues analytiques
- Drill-down : Domaine → Famille → Produit → Application + historique

---

## 4. 🗄 Modèle de données (niveau global)

### 4.1 MongoDB (Raw / Zone d’atterrissage)
- Stocke les données brutes CMDB (et éventuellement autres raw si utile)
- Sert à l’audit et au reprocess
- Non consommé directement par l’API/UI

### 4.2 PostgreSQL (Data mart FinOps)
- `fact_releve` : table des relevés normalisés
- `etl_runs` : table de suivi des exécutions batch (traçabilité, succès/échec, volumes)
- Materialized Views : agrégats optimisés

---

## 5. ⚙️ Fonctionnement global (run nightly)

### Étape 0 – Initialisation
- Création `run_id`
- Insertion `etl_runs` status=RUNNING
- Définition période(s) ciblée(s) (mois courant, option N-1)

### Étape 1 – Calculs par domaine
- Chaque domaine est un “bloc” du batch (modules internes)
- Chaque bloc :
  - Lit sa source (Mongo ou API)
  - Transforme / calcule
  - Produit des relevés normalisés

### Étape 2 – Chargement Postgre
- Stratégie idempotente :
  - suppression / rebuild par période (et éventuellement par domaine/source)
  - insertion bulk

### Étape 3 – Refresh des Materialized Views
- Refresh ordonné après insert
- Utilisation de `CONCURRENTLY` si indexes uniques présents

### Étape 4 – Finalisation
- Update `etl_runs` status=SUCCESS/FAILED
- Exposition “freshness” via FinOps API

---

## 6. 🖥 Écrans & parcours (rappel high-level)

Les écrans sont structurés autour de la hiérarchie :

- Dashboard principal (KPI, top domaines/familles/apps, tendance globale)
- Vue Domaine (coûts + historique + drill-down familles)
- Vue Famille (coûts + classement + drill-down produits/apps)
- Vue Application (summary + breakdown domaine/famille/produit + historique)
- Vue Classements (top coûts, croissance, réduction, anomalies)
- Vue Historique (multi-séries, comparaisons, plage temporelle)

➡️ Les spécifications UI détaillées sont référencées dans un document dédié.

---

## 7. ✅ Atouts de la solution

### 7.1 Industrialisation
- Pipeline nightly orchestré
- Traçabilité `etl_runs`
- Reprocess maîtrisé

### 7.2 Performance & UX
- Lecture API uniquement sur agrégats
- Temps de réponse stable pour Backstage
- Drill-down fluide

### 7.3 Extensibilité
- Ajout de nouveaux domaines ou produits sans refonte
- Ajout de nouvelles MVs / endpoints sans toucher à la raw
- Évolution vers BI/SQL possible

### 7.4 Robustesse
- Idempotence par période
- Stratégie “mois courant glissant”
- Isolation batch vs API

---

## 8. 🚀 Déploiement

### 8.1 FinOps Batch
**Recommandé : Kubernetes CronJob**
- Démarre, exécute, s’arrête
- `ConcurrencyPolicy: Forbid` (pas de run parallèle)
- Observabilité : logs + metrics + statut run en DB

### 8.2 FinOps API
**Kubernetes Deployment** (service permanent)
- Expose REST
- Sécurisé OIDC
- Lit Postgres (MVs)

### 8.3 Backstage UI
- Plugin / pages existantes (POC) à restructurer selon nouvelles vues
- Consomme FinOps API

---

## 9. 📆 Estimation de mise en place (réaliste & par brique)

> Hypothèse : POC existant, modèles clarifiés, composants UI déjà amorcés, équipe maîtrisant Quarkus/Postgres/Backstage.

### 9.1 Brique A – Modèle Postgre + migrations + tables (fact_releve, etl_runs)
- **1 à 2 jours**

### 9.2 Brique B – Materialized Views (socle + drill-down)
- MV socle (domain/family/app) + drill-down (app-domain/app-family/app-product)
- **2 à 4 jours** (incluant indexes + tests + refresh)

### 9.3 Brique C – FinOps Batch (Quarkus CronJob)
- Skeleton + orchestration run + etl_runs + load postgres + refresh MVs
- Connecteurs domaines (open via Mongo + natif via APIs + cloud via APIs)
- **5 à 10 jours**
  - v1 : 1–2 domaines + run stable
  - v2 : tous domaines + robustesse (retries, timeouts)

### 9.4 Brique D – FinOps API (Quarkus REST)
- Endpoints dashboard/domaine/famille/app/historique/classements
- Pagination, filtres, sécurité OIDC, endpoint status
- **4 à 7 jours**

### 9.5 Brique E – Front Backstage (UI)
- Restructuration menus + écrans selon specs
- Intégration des endpoints + charts
- **5 à 10 jours** (plus rapide si composants charts déjà prêts)

### 9.6 Brique F – Industrialisation (CI/CD, Helm, observabilité, hardening)
- Pipelines, secrets, network policy, dashboards, alerting basique
- **3 à 6 jours**

---

## 10. 🧮 Synthèse planning

### Scenario “réaliste” (MVP solide)
- **2 à 3 semaines** (10 à 15 jours ouvrés)
  - 1 semaine : DB + MVs + Batch v1 + API v1
  - 1 semaine : UI + intégration + stabilisation
  - + quelques jours : hardening/observabilité

### Scenario “industrialisation complète” (tous domaines + résilience)
- **3 à 5 semaines** selon nombre de connecteurs/API, règles métiers, volumes.

---

## 11. 📚 Documents de référence (déjà produits)

- Spécification technique FinOps Batch (Quarkus)
- Spécification technique FinOps API (Quarkus REST)
- Spécification Materialized Views PostgreSQL (liste + SQL)
- Spécification UI/Écrans (Backstage)
- Maquettes / designs d’écrans (images)

---

## 12. 🏁 Conclusion

La conception proposée industrialise le POC existant en un module FinOps robuste :

- **Batch nightly** (Quarkus CronJob) : calcule et charge des relevés mensuels
- **PostgreSQL** : data mart + MVs pour performance
- **FinOps API** : exposition sécurisée et stable
- **Backstage UI** : dashboards et drill-down alignés sur la hiérarchie Produit→Famille→Domaine

L’ensemble est cohérent, extensible et réalisable dans une **fenêtre de 2 à 3 semaines** pour un MVP solide, avec montée en robustesse progressive.
