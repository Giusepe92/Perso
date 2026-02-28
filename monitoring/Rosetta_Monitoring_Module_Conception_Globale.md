# 🛰️ Rosetta V2 – Conception Globale du Module Monitoring
## Observabilité, Pilotage et SRE – Dynatrace + ServiceNow + Déploiements + Logs (ELISA)

**Auteur / porteur :** Youssef Messaoudi  
**Version :** V0 (cadre cible + feuille de route)  
**Public :** équipe Rosetta, architectes, SRE, FinOps, direction IT / programme

---

# 1) Objectifs du module Monitoring

Le module Monitoring de Rosetta V2 vise à fournir une **vue unifiée, gouvernée et actionnable** de la santé des applications et des plateformes, en s’appuyant sur des sources existantes (Dynatrace, ServiceNow, ArgoCD/GitLab, ELISA).

## Objectifs principaux
- **Observabilité** : métriques, événements, logs, traces (là où disponibles)
- **Pilotage SRE** : SLI/SLO, disponibilité, erreurs, latence, saturation
- **Pilotage Delivery** : états de déploiement (live + historisé), DORA metrics
- **Pilotage Run** : incidents, changes, problèmes, backlog opérationnel
- **Pilotage Direction** : vues consolidées, tendances, risques, conformité SLO, stabilité

## Différence avec un “monitoring apping”
Rosetta Monitoring n’est pas un outil de monitoring bas niveau.  
C’est une **couche de consolidation** et de **serving** adaptée :
- à Backstage (par application / composant / groupe)
- aux besoins des équipes produit/SRE
- au reporting et à l’administration

---

# 2) Périmètre fonctionnel (ce que couvre Rosetta Monitoring)

## 2.1 Dynatrace – métriques & events
Rosetta consomme Dynatrace pour :
- Availability / erreurs (taux 5xx, erreurs applicatives)
- Latence (p95/p99, temps de réponse)
- Saturation (CPU/memory, threads, pools… selon instrumentation)
- Throughput (req/sec)
- Golden Signals (RED / USE)
- Events : incidents Dynatrace (problèmes, anomalies, dégradations)
- (optionnel) Topology : services, hosts, process groups, k8s entities

## 2.2 ServiceNow – incidents / changes
Rosetta consomme ServiceNow pour :
- Incidents (volumes, MTTR, SLA, assignation)
- Changes (calendrier de change, taux d’échec, impact)
- Problèmes (si exposé)
- Liens entre incidents/changes et applications (via CI/CMDB mapping)

## 2.3 Déploiements – état live + historisation
Rosetta expose :
- **Live** : statut actuel ArgoCD (synced/outofsync, health), dernier pipeline GitLab
- **Historisé** : séries temporelles d’événements de déploiement
- Métriques DORA (proposées plus bas)

## 2.4 Logs – ELISA (Kibana/ELK)
Rosetta ne remplace pas ELISA :
- Il fournit des **liens contextuels** et éventuellement des **indicateurs** :
  - volume d’erreurs logs
  - présence de patterns “error” / “exception”
  - liens directs Kibana préfiltrés (app/env/time range)

---

# 3) Modèle d’intégration avec le Référentiel Rosetta

## 3.1 Pivot de corrélation
Le module monitoring repose sur un pivot stable pour lier :
- **Application / Component (Rosetta)**
- **Entités Dynatrace**
- **CI/CMDB ServiceNow**
- **Applications ArgoCD/GitLab**
- **Index ELISA / logs**

### Stratégies possibles de mapping (non exclusives)
1) **Tag standard** dans Rosetta référentiel :
   - `dynatrace.entitySelector` ou `dynatrace.tag`
   - `servicenow.ciId` / `cmdb.ciName`
   - `argocd.appName` / `gitlab.projectId`
   - `elisa.index` / `kibana.queryTemplate`
2) **Mapping table** gérée par admin monitoring (si données imparfaites)
3) **Découverte automatique** (plus tard) via CMDB / topology

**Recommandation :** démarrer avec **tags/pivots déclaratifs minimaux** + une table de mapping admin, puis automatiser progressivement.

---

# 4) Architecture logicielle cible

## 4.1 Services Rosetta
- **Backstage (1 conteneur)** : UI + backend plugins (consommateur)
- **platform-ref-api** : référentiel (apps/components/groupes + approvals + tags pivots)
- **monitoring-api** : couche serving Monitoring (REST)
- **monitoring-batch** : ingestion/historisation/calcul d’agrégats (CronJob)

## 4.2 Données
- **Raw/Landing** : Mongo (ou storage brut) pour dumps/exports
- **Data Mart** : PostgreSQL `monitoring_db`
- **Materialized Views** : `mv_*` pour accélérer les dashboards

## 4.3 Deux modes de fonctionnement
### A) Live mode (temps réel)
- monitoring-api appelle Dynatrace/ArgoCD/GitLab/ELISA à la volée
- usage : diagnostic instantané, statut actuel, navigation

### B) Historisé mode (batch)
- monitoring-batch ingère périodiquement des snapshots
- usage : tendances, reporting, DORA, SLO compliance

---

# 5) Data Mart Monitoring – principes (haut niveau)

## 5.1 Niveaux de données
1) **Facts temporels** (time series) : agrégés (minute/heure/jour)
2) **Events** : incidents, changements, déploiements
3) **KPI calculés** : SLO compliance, DORA, MTTR, taux incident, etc.

## 5.2 Stratégie de granularité
Pour rester robuste et performant :
- Démarrer par des agrégats **hourly** ou **daily** par app/component/env
- Ajouter la minute seulement si un cas exigeant apparaît

---

# 6) APIs Monitoring – contrat fonctionnel (haut niveau)

## 6.1 Endpoints “User” (lecture)
- `GET /monitoring/overview?period=last_30d`
  - score santé global, top risques, tendances
- `GET /monitoring/applications/{appId}/summary`
  - golden signals, incidents ouverts, SLO, dernier déploiement
- `GET /monitoring/applications/{appId}/timeseries?metric=latency_p95&period=...`
- `GET /monitoring/applications/{appId}/incidents?status=open`
- `GET /monitoring/applications/{appId}/changes?period=...`
- `GET /monitoring/applications/{appId}/deployments?mode=live|history`
- `GET /monitoring/applications/{appId}/logs/link?timeRange=...`

## 6.2 Endpoints “SRE / Direction” (pilotage)
- `GET /monitoring/kpis/slo?period=quarter&groupBy=domain|group|app`
- `GET /monitoring/kpis/dora?period=last_90d&groupBy=team|app`
- `GET /monitoring/risk/top?metric=error_rate&period=...`

## 6.3 Endpoints “Admin”
- `GET /monitoring/admin/batch-runs`
- `GET /monitoring/admin/mappings` (pivots Dynatrace/SN/ELISA)
- `POST /monitoring/admin/mappings` (ajout/correction)
- `POST /monitoring/admin/batch/trigger` (run manuel)
- `GET /monitoring/admin/config/sources` (état des connecteurs)

---

# 7) Vues UI proposées (Backstage)

## 7.1 Dashboard global (Direction / Plateforme)
- Score santé (rouge/orange/vert) par domaine/entité/équipe
- Tendances : incidents, disponibilité, latence, taux d’erreur
- Top applications à risque (SLO breach, incidents récurrents)
- DORA niveau groupe (si dispo)

## 7.2 Vue Application (onglet Backstage)
- Golden signals : latency, errors, traffic, saturation
- Incidents ouverts + historique court
- Changes (futurs + récents)
- Déploiement live (ArgoCD) + dernier pipeline
- Lien ELISA logs préfiltré
- SLO : objectif vs réalisé

## 7.3 Vue Composant (si vos components sont fins)
- même logique, mais au niveau component (microservice)
- utile pour équipes run

## 7.4 Vue SRE / DORA
- Deployment frequency
- Lead time for changes (si données pipelines dispo)
- Change failure rate (si corrélation incidents↔déploiements)
- MTTR

## 7.5 Vue Incidents / Run
- backlog incidents par app / équipe
- SLA breach
- heatmap incidents

---

# 8) KPIs SRE/DORA – proposition Rosetta

## 8.1 SLO
- Disponibilité (uptime)
- Latence p95/p99
- Error budget (budget d’erreur consommé)
- Erreurs 5xx / exceptions

## 8.2 DORA (si historisation delivery)
- Frequency de déploiement (deploy/day)
- Lead time (merge→prod) (si GitLab/CI)
- Change failure rate (deploy → incident lié)
- MTTR (incident→résolution)

**Note :** on peut livrer DORA en 2 étapes :
1) “DORA Light” basé sur events déploiement + incidents simples
2) “DORA Full” avec corrélations avancées

---

# 9) Materialized Views – besoin & lots (haut niveau)

## Lot A – Dashboards
- `mv_monitoring_app_day_summary`
- `mv_monitoring_domain_day_summary`
- `mv_monitoring_top_risks`

## Lot B – Incidents/Changes
- `mv_incidents_app_day`
- `mv_changes_app_day`

## Lot C – SLO/DORA
- `mv_slo_app_period`
- `mv_dora_app_period`
- `mv_dora_group_period`

**Refresh**
- Daily pour la plupart
- Hourly pour “near-real-time” si souhaité

---

# 10) Feuille de route incrémentale (proposée)

## Phase 0 – Fondations (2–3 semaines)
- Définir pivots référentiel (tags)
- Créer monitoring_db (tables de base)
- monitoring-api skeleton + endpoint live “summary”
- 1 dashboard application minimal

## Phase 1 – Historisation minimal (3–4 semaines)
- monitoring-batch hourly/daily
- ingestion Dynatrace (2–3 métriques clés)
- ingestion incidents ServiceNow
- dashboards tendances + top risks

## Phase 2 – Déploiements + DORA light (3–5 semaines)
- statut live ArgoCD
- historisation déploiements
- DORA light (frequency, failure proxy, MTTR)

## Phase 3 – SLO avancés + logs ELISA (4–6 semaines)
- error budget
- lien logs préfiltré + métrique logs
- corrélations incidents↔changes↔deploy

## Phase 4 – Automatisation mapping (évolutions)
- découverte via CMDB / topology
- réduction du déclaratif

---

# 11) Valeur “Direction” – comment ça se vend

Le module Monitoring Rosetta V2 permet :
- Pilotage de la qualité de service (SLO)
- Pilotage de la transformation / delivery (DORA)
- Transparence opérationnelle (incidents, changes)
- Identification des risques (top apps rouges)
- Gouvernance par équipe/domaine (ownership clair)
- Support à la priorisation investissement (run vs build)

---

# 12) Conclusion

Rosetta Monitoring V2 est une **couche d’observabilité et de pilotage** :
- adaptée au modèle Backstage (app/component/group)
- connectée aux outils existants (Dynatrace, ServiceNow, ELISA, ArgoCD/GitLab)
- capable de combiner **live** (diagnostic) et **historique** (reporting & KPI)
- livrable incrémentalement, avec une trajectoire SRE robuste.

---

## Annexe – Hypothèses à valider (plus tard)
- quelles APIs Dynatrace sont accessibles (metrics v2, problems, entities…)
- quel mapping CI/CMDB ServiceNow existe et sa qualité
- quels identifiants ArgoCD/GitLab sont disponibles dans le référentiel
- accès ELISA : lien seulement ou extraction d’indicateurs
