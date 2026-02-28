# 🌌 Rosetta V2 – Architecture Cible Plateforme
## Vision Globale – Architecture Fonctionnelle, Logicielle et Infra

**Projet : Rosetta V2**  
**Portée : Plateforme d’ingénierie interne basée sur Backstage**  
**Objectif : Industrialiser, unifier et faire évoluer les modules FinOps, Référentiel et Monitoring dans une architecture cohérente, scalable et gouvernée**

---

# 1. Contexte & Vision

Rosetta V2 est une **plateforme d’ingénierie interne (Internal Developer Platform)** construite autour de Backstage.

Elle vise à :
- Centraliser la cartographie applicative
- Structurer les workflows d’approbation
- Mesurer les coûts (FinOps)
- Superviser la santé et la performance (Monitoring / Observabilité)
- Exposer des métriques SRE / DORA
- Offrir une vision transverse plateforme engineering

Rosetta V2 n’est pas un simple portail :  
C’est une **plateforme data-driven**, structurée autour d’un modèle :
```
Raw Data → Batch / Normalisation → Data Mart → APIs → Backstage UI
```

---

# 2. Architecture Générale

## 2.1 Composants principaux

### 1️⃣ Backstage (Portail Unique)
- Un seul déploiement (frontend + backend dans un même conteneur)
- Base PostgreSQL dédiée (gérée uniquement par Backstage)
- Nous n’intervenons pas directement dans sa base

Backstage :
- Gère l’authentification (OIDC / AD)
- Affiche les plugins Rosetta
- N’effectue aucun calcul métier complexe
- Consomme uniquement des APIs

---

### 2️⃣ Microservices Rosetta

#### 🔹 platform-ref-api
Responsable :
- Applications
- Components
- Groupes
- Relations applicatives
- Workflow d’approbation

Inclut :
- Module approbation (pas un MS séparé)
- Gestion des statuts
- Audit des modifications

Base : `platform_ref_db` (PostgreSQL)

---

#### 🔹 finops-api
Responsable :
- Dashboards coûts
- Drilldown domaine/famille/produit/application
- Pricing views (visions budgétaires)
- Comparaisons budgétaires
- Admin batch FinOps

Base : `finops_db` (PostgreSQL Data Mart)

---

#### 🔹 monitoring-api
Responsable :
- Métriques applicatives (Dynatrace)
- Incidents / Changes (ServiceNow)
- SLO / disponibilité
- DORA metrics
- État des déploiements (live + historisé)

Base : `monitoring_db` (PostgreSQL Data Mart)

Inclut :
- Endpoint live (interrogation directe APIs externes)
- Batch historisation métriques

---

### 3️⃣ Landing / Raw Zone

MongoDB (ou storage équivalent) :
- Données brutes CMDB
- Exports Dynatrace
- Dumps ServiceNow
- Fichiers Excel / CSV
- Payloads API bruts

Non exposé aux APIs.
Uniquement utilisé par les batchs.

---

# 3. Architecture Batch

## Principe fondamental
Un batch par domaine majeur.

### 🔹 finops-batch
- Transforme raw → fact_consumption
- Calcule coefficients indirects
- Rafraîchit materialized views
- Trace run_id

Exécution :
- CronJob Kubernetes (nightly)
- Déclenchement manuel via finops-api

---

### 🔹 monitoring-batch
- Transforme métriques Dynatrace
- Transforme incidents ServiceNow
- Historise déploiements
- Calcule DORA / SRE KPIs

Exécution :
- CronJob (hourly/daily selon métrique)
- Déclenchement manuel possible

---

# 4. Architecture Data

## Séparation des bases

Cluster PostgreSQL unique mais bases distinctes :

- backstage_db (intouchable par Rosetta)
- platform_ref_db (OLTP transactionnel)
- finops_db (Data Mart analytique)
- monitoring_db (Data Mart observabilité)

Pourquoi séparation ?
- Isolation performance
- Isolation migrations
- Sécurité
- Scalabilité future

---

# 5. Flux de Données

## FinOps

CMDB → Mongo raw  
↓  
finops-batch  
↓  
fact_consumption / fact_coefficient  
↓  
Materialized Views  
↓  
finops-api  
↓  
Backstage Dashboard

---

## Monitoring

Dynatrace live → monitoring-api (live endpoint)

Dynatrace export → raw → monitoring-batch → Data Mart

ServiceNow → raw → monitoring-batch → Data Mart

---

# 6. Temps réel vs Historisation

| Type | Mode | Exemple |
|------|------|----------|
| Live | API directe | Statut déploiement ArgoCD |
| Historisé | Batch | DORA, MTTR, tendances |
| Hybride | Live + stockage | État actuel + historique |

---

# 7. Gouvernance & Sécurité

## Authentification
- OIDC vers AD
- Backstage gère login

## Groupes AD

- Rosetta_Admin
- Rosetta_FinOps_Admin
- Rosetta_Referentiel_Admin
- Rosetta_User

Mapping :
- FinOps Admin → accès admin finops-api
- Referentiel Admin → CRUD référentiel
- User → lecture dashboards

---

# 8. Cas d’usage couverts

## Référentiel
- Création applications
- Approbation admin
- Cartographie complète

## FinOps
- Coût mensuel par application
- Indirect vs direct
- Comparaison budget
- Vue par environnement

## Monitoring
- Santé applicative
- SLO
- Incidents
- DORA metrics
- Déploiement live + historique

---

# 9. Vision Plateforme Engineering

Rosetta V2 permet :

- Ownership clair des applications
- Transparence des coûts
- Transparence des performances
- Pilotage SRE
- Pilotage budgétaire
- Pilotage transformation cloud

---

# 10. Migration vers V2

Approche incrémentale :

1. Migrer FinOps vers Data Mart
2. Stabiliser API + MVs
3. Migrer Monitoring
4. Consolider autorisations AD
5. Décommissionner anciens POCs

---

# 11. Cohérence Admin / User

Backstage :
- UI adaptée au rôle
- Boutons admin visibles uniquement si autorisé

APIs :
- Contrôle RBAC côté backend
- Audit des actions

---

# 12. Conclusion

Rosetta V2 n’est pas un portail.

C’est une plateforme d’ingénierie interne :
- modulaire
- data-driven
- scalable
- gouvernée
- orientée valeur métier

Elle permet d’industrialiser FinOps, Observabilité et Cartographie dans une architecture cohérente et évolutive.

---

# 🚀 Prochaine étape

Implémentation brique par brique :
- FinOps V2
- Référentiel V2
- Monitoring V2
- Consolidation RBAC & gouvernance
