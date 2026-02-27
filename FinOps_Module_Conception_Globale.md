# 📊 Module FinOps -- Document de Conception Globale

## 1. 🎯 Objectif

Le module **FinOps** a pour objectif de :

-   Collecter des données de consommation provenant de différentes
    sources (Cloud public, Cloud privé, Open/Legacy, services natifs
    internes).
-   Transformer ces données en **relevés normalisés** par application et
    par produit.
-   Consolider les données dans une base PostgreSQL.
-   Produire des agrégations optimisées pour consommation via API
    (Backstage).
-   Garantir traçabilité, reprocessabilité et robustesse industrielle.

------------------------------------------------------------------------

# 2. 🏗 Architecture Générale

L'architecture repose sur 4 couches principales :

## 2.1 Sources de données

Les données proviennent de plusieurs familles :

### A. Domaine Open / Legacy

-   Données issues de la CMDB
-   Déversées par une équipe tierce dans MongoDB
-   Exemple : VM, disques, stockage legacy

### B. Cloud Privé

-   APIs internes
-   Données d'usage (CPU, RAM, stockage, etc.)

### C. Cloud Public

-   APIs fournisseurs
-   Consommations facturables

### D. Services Natif (interne)

-   Cube
-   GitLab
-   Artifactory
-   Autres services internes

Chaque domaine produit des données hétérogènes.

------------------------------------------------------------------------

# 3. 📦 Concept Central : Le Relevé

Quel que soit le domaine, le batch produit un **Relevé normalisé**.

Un relevé représente : - Une application - Un produit consommé - Une
période donnée - Une appartenance à : - Produit - Famille - Domaine
technologique - Une quantité - Un coût calculé - Une source - Un
identifiant de run (runId)

Un même applicatif peut produire plusieurs relevés selon les produits
consommés.

------------------------------------------------------------------------

# 4. 🧠 Architecture de Traitement (Batch)

## 4.1 Technologie choisie : Quarkus

Le batch est implémenté en **Quarkus** pour homogénéité avec
l'écosystème microservices.

------------------------------------------------------------------------

## 4.2 Orchestration Batch

Le service FinOps-Batch-MS exécute un pipeline nightly :

### Étape 0 -- Initialisation

-   Création d'un runId
-   Enregistrement dans table `etl_runs`
-   Statut RUNNING

### Étape 1 -- Batch par Domaine

Chaque domaine possède son composant : - NativeCostsBatch -
PrivateCloudBatch - PublicCloudBatch - OpenLegacyBatch

Chaque composant : 1. Lit la source 2. Transforme les données 3. Produit
des relevés normalisés 4. Insère en base PostgreSQL

### Étape 2 -- Consolidation

Insertion dans table `fact_releve`

### Étape 3 -- Refresh Agrégats

Refresh des vues matérialisées

### Étape 4 -- Finalisation

-   Mise à jour `etl_runs`
-   Statut SUCCESS / FAILED

------------------------------------------------------------------------

# 5. 🗄 Architecture Base de Données

## 5.1 MongoDB -- Zone Raw

Utilisée pour : - Stockage brut CMDB - Audit - Reprocess possible

------------------------------------------------------------------------

## 5.2 PostgreSQL -- Data Mart FinOps

### Tables principales

#### A. Table des relevés (grain fin)

`fact_releve`

Colonnes conceptuelles : - id - run_id - application_id - product_id -
family - domain - period - usage_quantity - unit_cost - total_cost -
source - created_at

#### B. Table de suivi des runs

`etl_runs` - run_id - start_time - end_time - status - volume_processed

------------------------------------------------------------------------

# 6. 📊 Agrégations

Les agrégations sont gérées via **Materialized Views** :

-   mv_cost_app_month
-   mv_cost_app_quarter
-   mv_cost_family_period
-   mv_cost_domain_period

Déclarées via migrations et rafraîchies en fin de batch.

------------------------------------------------------------------------

# 7. 🌐 API FinOps

Expose : - Coûts par application - Coûts par groupe - Coûts par
domaine - Historique par période

Lecture uniquement des agrégats.

------------------------------------------------------------------------

# 8. 🚀 Déploiement

## Option recommandée : Kubernetes CronJob

-   Le conteneur batch démarre
-   Exécute le pipeline
-   Se termine

Alternative : - Service permanent avec scheduler interne

------------------------------------------------------------------------

# 9. 🔁 Reprocess

-   Historisation des runs
-   Recalcul par période
-   Idempotence par suppression/rechargement période

------------------------------------------------------------------------

# 10. 🏁 Conclusion

Architecture : - MongoDB (raw) - Quarkus (batch) - PostgreSQL (data
mart) - Materialized Views (performance API) - Kubernetes CronJob
(exécution)
