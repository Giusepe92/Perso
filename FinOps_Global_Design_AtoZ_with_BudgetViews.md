# 📌 Module FinOps – Conception Globale (A→Z) – Version avec Vision Budgétaire

## 1. 🎯 Objectif du module

Le module **FinOps** fournit une vision **fiable, industrialisée et pilotable** des coûts d’infrastructure et de plateformes pour l’organisation, avec une capacité d’analyse par :

- **Application**
- **Produit**
- **Famille de produits**
- **Domaine technologique**

Le module consolide des sources hétérogènes (CMDB, APIs Cloud/Plateformes, services natifs internes), produit des **consommations mensuelles normalisées** et expose des tableaux de bord Backstage performants.

### Particularité : Vision Budgétaire (Pricing View)
Le module introduit une **Vision Budgétaire** (*Pricing View*) versionnée permettant :
- d’appliquer différents **prix unitaires** aux consommations (par trimestre, version corrigée, historique)
- de comparer 2 visions (delta coût)
- de changer de vision **sans relancer** le batch

---

## 2. 🧱 Principes clés

### 2.1 Granularité temporelle
- **Grain principal : mensuel** (`period_month = YYYY-MM`)
- Exécution **nightly** : recalcul du **mois courant**, optionnellement N-1 (données tardives)

### 2.2 Hiérarchie métier
- **Produit → Famille → Domaine technologique**
- Un même applicatif peut produire plusieurs consommations (par produit consommé)

### 2.3 Séparation “Consommation” vs “Coût”
✅ **Consommation = vérité opérationnelle** (stable)  
✅ **Vision budgétaire = référentiel versionné**  
✅ **Coût = calcul dynamique** (consommation × prix selon vision)

Cette séparation garantit flexibilité et évite de figer un coût dépendant d’un budget potentiellement incomplet/corrigé.

### 2.4 Performance par design
- L’UI/Backstage ne lit **jamais** les données brutes.
- L’API s’appuie sur des **agrégats** (Materialized Views de consommation) et applique le pricing en SQL.

---

## 3. 🏗 Architecture d’ensemble

### 3.1 Chaîne complète (du brut à l’écran)

1) **Sources de données**
- **Open/Legacy** : données CMDB
- **Cloud privé** : APIs internes
- **Cloud public** : APIs fournisseurs
- **Natif** : services internes (Cube, GitLab, Artifactory, …)

2) **Zone d’atterrissage (Raw)**
- **MongoDB** reçoit les dumps CMDB (par équipe tierce)
- Objectif : audit, reprocess, absorption des formats

3) **Traitement (Batch)**
- Microservice **FinOps Batch** (Quarkus) exécute un pipeline nightly :
  - lit les sources (Mongo + APIs)
  - calcule les consommations
  - normalise les données
  - charge PostgreSQL

4) **Data Mart FinOps (PostgreSQL)**
- Tables de consommation mensuelle normalisée
- Référentiel de visions budgétaires (pricing view)
- Materialized Views de consommation (pour accélérer le calcul des coûts)

5) **Exposition (FinOps API)**
- Microservice **FinOps API** (Quarkus) :
  - calcule les coûts selon une vision budgétaire sélectionnée
  - expose dashboard, drill-down, historique, classements
  - expose admin runs & logs

6) **Présentation (Backstage UI)**
- Pages FinOps : Dashboard + vues Domaine/Famille/Application/Historique/Classements
- Sélecteur global “Vision budgétaire” (auto par défaut + comparaison)

---

## 4. 🗄 Modèle de données (niveau global)

### 4.1 MongoDB – Zone Raw
- Stockage brut des exports CMDB
- Non consommé directement par l’UI/API
- Utilisé par le batch “Open/Legacy”

### 4.2 PostgreSQL – Data Mart FinOps

#### A. Consommations (stable)
- `fact_consumption` (ou table équivalente)
  - grain : `period_month × application × product`
  - mesure : `quantity` (unités d’œuvre)

#### B. Exécutions batch
- `etl_runs` (+ optionnel `etl_run_steps`)
  - run_id, status, timings, volumes, logs_url, etc.

#### C. Vision Budgétaire (Pricing View)
- `pricing_view` : en-têtes (ex: `2024Q2_V1`, statut, défaut)
- `pricing_line` : prix unitaires par produit et par vision
- `pricing_view_mapping` : vision par défaut par mois

#### D. Agrégats (Materialized Views)
- Materialized views de **consommation** (pas de coût figé)
- L’API joint ces agrégats avec `pricing_line` pour calculer les coûts

---

## 5. ⚙️ Fonctionnement global (Run Nightly)

### Étape 0 – Initialisation
- Création `run_id`
- Insertion `etl_runs` (status=RUNNING)
- Détermination période(s) : mois courant (+ N-1 optionnel)

### Étape 1 – Calculs par domaine (blocs batch)
- **Open/Legacy** : Mongo raw CMDB → consommations normalisées
- **Cloud privé** : APIs → consommations normalisées
- **Cloud public** : APIs → consommations normalisées
- **Natif** : services internes → consommations normalisées

Chaque bloc produit une liste de lignes (application × produit × quantité).

### Étape 2 – Chargement Postgre (idempotent)
- Rebuild par période :
  - suppression des lignes `period_month` ciblées (et éventuellement par source/domaine)
  - insertion bulk dans `fact_consumption`

### Étape 3 – Refresh Materialized Views (consommation)
- Refresh ordonné des MVs (CONCURRENTLY si index uniques)

### Étape 4 – Finalisation
- Update `etl_runs` status=SUCCESS/FAILED
- Publication freshness via endpoint `GET /finops/status`

> La Vision Budgétaire n’exige pas de rerun : changer de pricing view = recalcul dynamique côté API.

---

## 6. 🖥 Écrans & parcours (rappel high-level)

### Vues utilisateur
- Dashboard principal (KPI + top + tendances)
- Vue Domaine (coûts + historique + drill-down familles)
- Vue Famille (classement + drill-down produits/apps)
- Vue Application (breakdown domaine/famille/produit + historique)
- Classements (top coût, croissance/réduction, anomalies)
- Historique & évolution (multi-séries, comparaisons)

### Vision Budgétaire (nouveau)
- Sélecteur “Vision budgétaire” global
- Mode comparaison View A / View B (delta)

### Vues admin
- Admin Runs : liste des exécutions (status, périodes, domaines, volumes)
- Run detail : détail par blocs + accès logs
- Lancer un batch manuellement (optionnel) depuis l’admin

---

## 7. ✅ Atouts de la solution

### 7.1 Industrialisation
- Pipeline nightly orchestré
- Traçabilité `etl_runs`
- Reprocess maîtrisé

### 7.2 Flexibilité (vision budgétaire)
- Affichage multi-visions instantané
- Comparaison entre deux budgets
- Ajustement de prix sans recalcul des consommations

### 7.3 Performance & UX
- Calcul coût sur agrégats (faible cardinalité)
- Temps de réponse stable pour Backstage
- Drill-down fluide

### 7.4 Extensibilité
- Ajout de domaines, produits, règles sans refonte
- Évolution vers BI/SQL possible

---

## 8. 🚀 Déploiement

### 8.1 FinOps Batch
**Recommandé : Kubernetes CronJob**
- Démarre, exécute, s’arrête
- ConcurrencyPolicy: Forbid
- Secrets (DB, OIDC, certs), logs centralisés

### 8.2 FinOps API
**Kubernetes Deployment**
- Service permanent
- OIDC (Keycloak)
- Lecture Postgres (MVs + pricing)
- Observabilité : metrics/health/logs

### 8.3 Backstage UI
- Plugin/pages FinOps
- Intégration du sélecteur vision budgétaire + compare
- Graphiques + drill-down

---

## 9. 📆 Estimation de mise en place (réaliste & par brique)

> Hypothèse : POC existant, structure maîtrisée, équipe à l’aise Quarkus/Postgres/Backstage.

### A. Data Mart Postgre (tables + migrations)
- `fact_consumption`, `etl_runs`, base dims si nécessaires
- **1 à 2 jours**

### B. Vision budgétaire (pricing tables + mapping + import)
- `pricing_view`, `pricing_line`, `pricing_view_mapping`
- endpoints lecture + import/coverage (si géré dans l’outil)
- **2 à 5 jours** (selon gestion import & admin)

### C. Materialized Views (consommation)
- socle + drill-down + indexes + refresh
- **2 à 4 jours**

### D. FinOps Batch (Quarkus CronJob)
- orchestration run + load postgres + refresh MVs + etl_runs
- connecteurs domaines (Open via Mongo + Natif + Cloud)
- **5 à 10 jours** (selon nb connecteurs & robustesse)

### E. FinOps API (Quarkus REST)
- endpoints dashboard/domaine/famille/app/historique/classements
- param `pricingView` + compare
- endpoints admin runs/logs + status
- **5 à 10 jours**

### F. Front Backstage (UI)
- restructuration écrans + intégration API + sélecteur pricing + compare
- **5 à 10 jours** (plus rapide si composants charts déjà prêts)

### G. Industrialisation / hardening
- CI/CD, Helm, secrets, policies, monitoring, alerting basique
- **3 à 6 jours**

---

## 10. 🧮 Synthèse planning

### MVP solide (incluant vision budgétaire)
- **3 à 4 semaines** (≈ 15 à 20 jours ouvrés)
  - S1 : DB + pricing + MVs + API v1 + batch v1
  - S2 : UI + intégration + stabilisation
  - S3 (si nécessaire) : connecteurs restants + compare + admin + hardening

### Si connecteurs déjà disponibles / scope réduit
- **2 à 3 semaines** possible (batch + api + ui + pricing minimal).

---

## 11. 📚 Documents produits / Références

- Conception globale FinOps (ce document)
- Spécification technique FinOps Batch (Quarkus)
- Spécification technique FinOps API (Quarkus REST)
- Spécification Materialized Views PostgreSQL
- Spécification UI/Écrans (Backstage)
- Spécification Admin Runs/Logs + UI designs
- Spécification Vision Budgétaire (Pricing View)

---

## 12. 🏁 Conclusion

La solution FinOps proposée industrialise le POC en un module complet :

- **Consommations** mensuelles normalisées (stable)
- **Vision budgétaire** versionnée (flexible)
- **Calcul de coût dynamique** performant (sur agrégats + jointure pricing)
- **Batch nightly** (Quarkus CronJob) + traçabilité
- **API dédiée** (Quarkus) sécurisée OIDC
- **UI Backstage** structurée (dashboard + drill-down + admin)

Cette conception garantit : robustesse, flexibilité (budgets), performance et évolutivité, avec un MVP réalisable dans une fenêtre réaliste de **3 à 4 semaines** selon le périmètre de connecteurs et le niveau d’industrialisation attendu.
