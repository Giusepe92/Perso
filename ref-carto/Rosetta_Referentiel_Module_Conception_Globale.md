# 🗺️ Rosetta V2 – Conception Globale du Module Référentiel Cartographique
## Gouvernance, Cartographie, Pivots d’Intégration & Workflows d’Approbation (Backstage-native + Rosetta)

**Auteur / porteur :** Youssef Messaoudi  
**Version :** V0 (cadre cible + feuille de route)  
**Public :** équipe Rosetta, architectes, Platform Eng, responsables produit, admins référentiel

---

# 1) Objectifs du module Référentiel Cartographique

Le module Référentiel Cartographique Rosetta V2 fournit une **source de vérité métier** sur :
- les **Applications**
- les **Composants applicatifs**
- les **Groupes / squads / entités organisationnelles**
- les **Relations** (ownership, dépendances, rattachements)
- les **pivots d’intégration** vers les outils externes (Dynatrace, ServiceNow, ArgoCD/GitLab, ELISA, CMDB…)
- les **workflows d’approbation** nécessaires à la gouvernance

Ce module est au cœur de Rosetta V2 :  
il garantit que Backstage peut rester **simple côté équipes** (minimum de YAML) tout en restant **rigoureux** et gouverné.

---

# 2) Problématique & Parti pris Rosetta

## 2.1 Le modèle Backstage “standard”
Par défaut, Backstage attend que les équipes :
- maintiennent des `catalog-info.yaml` dans Git
- déclarent owners, systèmes, composants, ressources
- gèrent les relations via YAML

Ce modèle est excellent pour une organisation “DevEx mature”, mais dans beaucoup de contextes :
- les équipes ne le font pas (charge déclarative trop forte)
- la gouvernance devient hétérogène
- la qualité des métadonnées est inégale

## 2.2 Le parti pris Rosetta (V1 → V2)
Rosetta a introduit un modèle hybride :
- **Applications & groupes** : créés dans Backstage via formulaire → stockés dans le référentiel
- **Composants applicatifs** : déclarés via Git (catalog-info.yaml) uniquement pour les services “tech” réels
- **Synchronisation** : Backstage notifie Rosetta lorsqu’un composant est découvert/actualisé

Rosetta V2 formalise et industrialise ce modèle :
- gestion d’un **référentiel transactionnel gouverné**
- extensible à **l’infrastructure** (ressources CMDB/CI)
- pivot pour FinOps, Monitoring, Delivery, Security, etc.

---

# 3) Périmètre fonctionnel (Rosetta Référentiel)

## 3.1 Données gérées
### A) Entités “Métier / Organisation”
- Applications (vision produit métier)
- Groupes (squads, équipes, entités)
- Owners (responsables, run/build)

### B) Entités “Tech / Delivery”
- Composants applicatifs (microservices, frontends, jobs…)
- Repositories (GitLab)
- Pipelines (GitLab)
- Déploiements (ArgoCD) – via pivots

### C) Entités “Infra / Run” (cible)
- Ressources infra (CI/CMDB : serveurs, VM, DB, VIP, clusters, etc.)
- Relations aux composants/apps
- Environnements (prod/non-prod, clusters, zones)

### D) Pivots & Tags d’intégration (cible)
- Dynatrace (entitySelector, tags, managementZone…)
- ServiceNow (CI id, application service, assignment group…)
- ArgoCD (appName, project, cluster…)
- ELISA (index, query template, dashboards)
- FinOps (coefficients externes, règles, exceptions)

---

## 3.2 Fonctions principales
1) CRUD Application / Groupe (gouverné)
2) Déclaration et gestion des relations (app → group, component → app…)
3) Circuit d’approbation (demande → validation admin)
4) Synchronisation avec Backstage (events de catalog)
5) Exposition d’un modèle stable pour tous les modules (FinOps/Monitoring/etc.)
6) Gestion des “mappings” (pivots) vers outils externes
7) Audit complet (qui a changé quoi, quand, et pourquoi)

---

# 4) Interaction avec Backstage (hybride et pragmatique)

## 4.1 Applications & Groupes
**Créés via UI Rosetta dans Backstage** :
- formulaire simple
- stockage dans `platform_ref_db`
- affichage dans Backstage via plugin Rosetta (et/ou ingestion vers catalog selon stratégie)

## 4.2 Composants applicatifs (catalog-info.yaml)
**Déclarés par les équipes** mais uniquement pour les composants réellement “code-based” :
- un service = un repo = un `catalog-info.yaml`
- Backstage découvre le composant via provider GitLab
- un **processor** (ou hook) notifie Rosetta :
  - “ce composant existe et voici ses métadonnées”
- Rosetta stocke et relie le composant à l’application correspondante (si possible)

## 4.3 Minimiser la charge déclarative
Objectif :
- pas de YAML partout
- seulement pour les composants qui ont un repo (c’est logique)
- le reste (apps, groupes, ressources, pivots) géré en UI + gouvernance

---

# 5) Gouvernance & Workflows d’approbation

## 5.1 Rôles
- **Rosetta_User** : consultation + soumission de demandes
- **Rosetta_Referentiel_Admin** : validation + administration référentiel
- **Rosetta_Admin** : administration globale (super-admin)

## 5.2 Types de demandes (Requests)
- Création d’une application
- Création d’un groupe
- Modification d’une application/groupe
- Association component ↔ application
- Ajout / correction d’un pivot (Dynatrace/SN/ELISA/Argo…)
- (cible) rattachement d’une ressource infra

## 5.3 Cycle de vie standard
- `DRAFT` : en construction
- `PENDING_APPROVAL` : soumis
- `APPROVED` : actif
- `REJECTED` : rejeté (avec commentaire)
- `DECOMMISSIONED` : archivé (soft delete)

**Principe :**
- L’UI masque/affiche les actions, mais la **sécurité est enforce côté API**.

## 5.4 Audit & traçabilité
- chaque décision d’approbation est journalisée
- historique des modifications (diff JSON ou événements)

---

# 6) Référentiel comme “Pivot Platform” (valeur clé)

Le référentiel est le **point de convergence** de toutes les intégrations :
- FinOps : associer coûts ↔ applications ↔ owners
- Monitoring : associer métriques/incidents ↔ applications
- Delivery : associer déploiements/pipelines ↔ composants
- Observabilité logs : associer Kibana ↔ applications
- Infra : associer CI/CMDB ↔ composants/applications

## 6.1 Exemple de “Pivot Map” par application
- `dynatrace.tag = app:myapp`
- `servicenow.ci = CI12345`
- `argocd.apps = [myapp-dev, myapp-prod]`
- `gitlab.projectId = 9876`
- `elisa.indexPattern = myapp-*`

Ces pivots rendent possible :
- dashboards automatiques
- drilling cross-domain (finops → monitoring → incidents → deploys)
- vues “direction” fiables

---

# 7) API Référentiel – contrat fonctionnel (haut niveau)

## 7.1 Endpoints “User”
- `GET /ref/applications`
- `GET /ref/applications/{id}`
- `GET /ref/groups`
- `GET /ref/components?appId=...`
- `GET /ref/relations?appId=...`

## 7.2 Endpoints “Requests / Approvals”
- `POST /ref/requests` (soumission)
- `GET /ref/requests?status=pending`
- `POST /ref/requests/{id}/approve`
- `POST /ref/requests/{id}/reject`

## 7.3 Endpoints “Admin pivots / mappings”
- `GET /ref/mappings?type=dynatrace|sn|argocd|elisa`
- `POST /ref/mappings`
- `PUT /ref/mappings/{id}`
- `DELETE /ref/mappings/{id}`

## 7.4 Endpoint “Backstage sync”
- `POST /ref/backstage/events/component-discovered`
- `POST /ref/backstage/events/component-updated`
- `POST /ref/backstage/events/component-removed`

---

# 8) Modèle de données (haut niveau) – flexibilité maîtrisée

## 8.1 Données “structurées”
- applications
- groups
- components
- relations

## 8.2 Données “semi-structurées” (pivots)
Deux approches possibles :
1) colonnes explicites pour pivots critiques + JSONB pour le reste
2) table “mappings” typée (recommandée)

**Recommandation :** table `ref_mapping` :
- `mapping_type` (dynatrace/sn/argocd/elisa/finops/etc.)
- `mapping_key`
- `mapping_value`
- `scope` (application/component/group)
- `metadata` (jsonb)

Cela permet :
- contrôle + audit
- ajout de nouveaux pivots sans migration lourde
- admin UI simple

---

# 9) Vues UI proposées (Backstage)

## 9.1 Vue “Référentiel” (catalogue Rosetta)
- Liste des applications (filtrable)
- Détails application + ownership + pivots + composants liés
- Arborescence groupe → applications

## 9.2 Formulaires
- création application
- création groupe
- ajout de pivot dynatrace/sn/argo/elisa
- association composants

## 9.3 Vue Approvals (admin)
- liste demandes
- détail demande + diff + approve/reject
- historique décisions

---

# 10) Feuille de route incrémentale (proposée)

## Phase 0 – Stabilisation V1 (2–3 semaines)
- formaliser le modèle de données V2
- sécuriser RBAC
- améliorer UI catalog Rosetta

## Phase 1 – Workflows d’approbation industrialisés (3–5 semaines)
- requests + audit
- UI admin
- règles de gouvernance

## Phase 2 – Pivots & mappings (3–5 semaines)
- UI admin mapping
- intégration monitoring/finops dépendante

## Phase 3 – Infra resources (cible) (4–8 semaines)
- ingestion CMDB/CI
- relations ressources ↔ composants
- vues infra

## Phase 4 – Automatisation & réduction déclaratif (évolution)
- suggestions auto de mapping
- découverte via CMDB/topology
- scoring qualité référentiel

---

# 11) Valeur “Direction”

Le Référentiel Rosetta V2 apporte :
- une cartographie fiable et gouvernée
- une source de vérité ownership (qui est responsable de quoi)
- une capacité de pilotage transverse (coûts, qualité, delivery)
- une réduction drastique de la charge déclarative des équipes
- une base essentielle à la stratégie plateforme engineering

---

# 12) Conclusion

Le Référentiel Cartographique Rosetta V2 est la **brique centrale** :
- transactionnelle et gouvernée
- intégrée nativement dans Backstage
- extensible à l’infra et aux pivots outils
- permettant aux autres modules (FinOps/Monitoring) de fonctionner avec une corrélation fiable.

Il rend possible une IDP “360°” sans imposer un effort massif aux équipes de développement.

---

## Annexe – Hypothèses à valider
- stratégie exacte d’injection des apps/groups dans le catalog Backstage (ou plugin-only)
- qualité des relations CI/CMDB ↔ app
- conventions de tags à standardiser (dynatrace/sn/argo/elisa)
