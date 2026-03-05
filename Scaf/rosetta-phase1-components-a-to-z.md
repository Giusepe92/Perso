# Rosetta (platform-ref-api / platform_ref_db) — Plan d’implémentation Phase 1 (Quick Win) A→Z
## Components : Modèle cartographique minimal + Provider REGISTRY + Sync (Heartbeat/GitOps) + Adopt GitOps (MR)
> Objectif : livrer une version **opérationnelle** en quelques semaines, **compatible** avec la cible (cartographie + convergence GitOps).  
> **Scaffolder / Templates : hors scope**.  
> Hypothèses :  
> - **1 Component ↔ 1 System** (pas de table N-N : FK directe)  
> - Les **Systems Backstage = Applications** du référentiel (`RefApplications`)  
> - Les **Owners Backstage = Groups** du référentiel (`RefGroups`)  

---

# 1) État de l’existant (rappel)
Vous avez déjà dans `platform_ref_db` :
- `RefGroups` : source canonique des groupes (owners)
- `RefApplications` : source canonique des applications (systems)

Conventions recommandées (pour éviter les ambiguïtés) :
- `RefGroups.group_ref` = `group:default/<slug>` (unique)
- `RefApplications.system_ref` = `system:default/<slug>` (unique)

---

# 2) Modèle cartographique minimal à créer (Phase 1)
> On vise un **modèle query-friendly** mais minimal, qui pourra être normalisé plus tard (tags/links, relations…).

## 2.1 Table `RefComponents` (core)
Champs :
- `id` (UUID, PK)
- `component_key` (VARCHAR, UNIQUE) ✅ identifiant métier stable (clé de réconciliation)
- `name_slug` (VARCHAR, UNIQUE) ✅ utilisé comme `metadata.name` dans Backstage
- `title` (VARCHAR)
- `description` (TEXT)
- `type` (VARCHAR) (service / website / library / …)
- `lifecycle` (VARCHAR) (production / experimental / …)
- `status` (VARCHAR) (DRAFT / VALIDATED / PUBLISHED) *(optionnel mais utile)*
- `management_mode` (VARCHAR) : `REGISTRY | GITOPS_PENDING | GITOPS` ✅
- `application_id` (UUID, FK → `RefApplications.id`) ✅ 1 system
- `owner_group_id` (UUID, FK → `RefGroups.id`) ✅
- `tags_json` (JSONB, nullable) *(quick win)*
- `links_json` (JSONB, nullable) *(quick win)*
- `created_at`, `updated_at`

## 2.2 Table `RefComponentScm`
- `component_id` (UUID, PK/FK → RefComponents.id)
- `repo_url` (VARCHAR, nullable)
- `gitlab_project_id` (VARCHAR/INT, nullable)
- `catalog_info_path` (VARCHAR, default `/catalog-info.yaml`)
- `last_mr_url` (VARCHAR, nullable)
- `last_mr_id` (VARCHAR, nullable)
- `last_commit_sha` (VARCHAR, nullable)
- `gitops_adopted_at` (TIMESTAMP, nullable)

## 2.3 Table `RefComponentSyncState`
- `component_id` (UUID, PK/FK)
- `last_seen_in_backstage_at` (TIMESTAMP, nullable) ✅ heartbeat
- `last_catalog_sync_at` (TIMESTAMP, nullable) ✅ synchro GitOps snapshot
- `last_seen_entity_hash` (VARCHAR, nullable) ✅ idempotence
- `last_sync_source` (VARCHAR, nullable) (provider|processor|webhook|manual)

> V2 (plus tard) : normaliser tags/links, relations `dependsOn`, etc.

---

# 3) API Façade Backstage dans platform-ref-api (Phase 1)
> On ne fait pas consommer Backstage “direct DB”. On expose des DTO Backstage-like.

## 3.1 Provider endpoint (pull REGISTRY)
**But** : exposer uniquement les components `REGISTRY` (non GitOps).

`GET /backstage/catalog/components?managementMode=REGISTRY&status=PUBLISHED`

Réponse : liste d’entités `Component` Backstage-like.

### Mapping (REGISTRY → Backstage Entity)
- `metadata.name = RefComponents.name_slug`
- `spec.system = RefApplications.system_ref`
- `spec.owner = RefGroups.group_ref`
- `spec.type/lifecycle` depuis RefComponents

Annotations minimales :
- `rosetta.io/component-key: <component_key>` ✅
- `rosetta.io/management-mode: REGISTRY` ✅
- `backstage.io/managed-by-location: rosetta:component/<component_key>` ✅
- `backstage.io/source-location: rosetta:component/<component_key>` ✅
- repo/projectId si dispo (via RefComponentScm)

> IMPORTANT : cet endpoint ne renvoie jamais GITOPS/GITOPS_PENDING.

## 3.2 Heartbeat endpoint (processor → référentiel)
**But** : mettre à jour le “last seen” sans réécrire le catalog.

`POST /internal/backstage/heartbeat/components`

Payload :
- `componentKey`
- `entityRef`
- `managedByLocation`
- `timestamp`
- `entityHash` *(optionnel mais recommandé)*

Traitement :
- update `RefComponentSyncState.last_seen_in_backstage_at`
- stocker `last_seen_entity_hash` si fourni
- `last_sync_source = processor`

## 3.3 GitOps snapshot endpoint (processor → référentiel)
**But** : maintenir le référentiel à jour pour FinOps/monitoring quand Git est source de vérité.

`POST /internal/backstage/sync/gitops-components`

Payload :
- `componentKey`
- `entityRef`
- `entityHash`
- `timestamp`
- `catalogSnapshot` (owner/system/type/lifecycle/tags/links/annotations SCM)

Traitement :
- update heartbeat
- si hash identique : early-exit
- sinon : upsert snapshot dans RefComponents/Scm (+ tags_json/links_json)  
- update `last_catalog_sync_at` + `last_seen_entity_hash`

---

# 4) Backstage — Provider REGISTRY-only (Phase 1)
## 4.1 Implémentation
Créer un `EntityProvider` Backstage qui :
1. appelle `platform-ref-api` endpoint provider (3.1)
2. transforme la réponse en entités Backstage
3. applique via `connection.applyMutation` (ou mécanisme équivalent selon votre version)

## 4.2 Fréquence
- au démarrage
- puis toutes X minutes (scheduler provider) (quick win : 10–30 min)

---

# 5) Backstage — Processor (post-proc) : Heartbeat + Sync GitOps
> Le processor s’exécute à chaque ingestion (provider ou Git).

## 5.1 Règles de routing
Pour chaque entité `Component` ingérée :

### A) Si entité REGISTRY (managed-by-location = `rosetta:component/...`)
→ appeler **heartbeat** uniquement (3.2)

### B) Si entité GitOps (managed-by-location = Git / source-location git)
→ appeler **sync GitOps snapshot** (3.3)

> Détection recommandée :
- prioritaire : `metadata.annotations['rosetta.io/management-mode']`
- fallback : pattern `backstage.io/managed-by-location`

## 5.2 Idempotence (anti-bruit)
- calculer `entityHash` (hash stable du snapshot)
- si unchanged côté référentiel : ignorer (ou heartbeat-only)

---

# 6) Import parc (Phase 1)
## 6.1 Objectif
Peupler RefComponents/Scm/SyncState à partir de l’export cartographique legacy (Excel/CSV).

## 6.2 Pipeline import (one-shot)
1. ingestion Excel/CSV
2. mapping champs → modèle canonique
3. génération `component_key` + `name_slug` (stable)
4. résolution FK :
   - `application_id` (RefApplications) ✅ obligatoire
   - `owner_group_id` (RefGroups) ✅ obligatoire
5. insert/update RefComponents + RefComponentScm + RefComponentSyncState
6. `management_mode = REGISTRY` par défaut

> Quick win : refuser les lignes sans application/owner (ou les marquer DRAFT).

---

# 7) Adopt GitOps (MR) — Phase 1
> Action Rosetta qui crée une MR avec `catalog-info.yaml`.  
> La bascule se fait **après merge**.

## 7.1 Endpoint “command” (platform-ref-api ou service Rosetta)
`POST /components/{componentKey}/adopt-gitops`

Traitement :
1. charger component + scm + owner + application depuis DB
2. vérifier :
   - repo_url ou gitlab_project_id présent
   - `management_mode == REGISTRY`
3. générer `catalog-info.yaml` incluant :
   - `rosetta.io/component-key`
   - `rosetta.io/management-mode: GITOPS`
4. créer branche + commit + MR GitLab
5. stocker `last_mr_url`, `last_mr_id`
6. passer `management_mode = GITOPS_PENDING`

## 7.2 Actions Scaffolder ou pas ? (reco quick win)
- **Quick win** : implémenter côté **backend** (service-to-service GitLab API).
- L’UI Rosetta déclenche l’endpoint et affiche la MR.

## 7.3 Bascule après merge (recommandé : webhook GitLab)
Configurer webhook GitLab (MR merged). À réception :
1. vérifier que c’est une MR “adopt” (label / branch pattern)
2. retrouver `componentKey`
3. mettre `management_mode = GITOPS`
4. set `gitops_adopted_at = now()`
5. stocker `last_commit_sha` si dispo

## 7.4 Fin de transition côté Backstage
- Provider REGISTRY-only cesse d’émettre le composant (car `PENDING/GITOPS`)
- Git discovery ingère `catalog-info.yaml`
- Processor détecte GitOps et sync snapshot vers DB

> Option “zéro trou” : rester en `GITOPS_PENDING` tant que Backstage n’a pas ingéré l’entité Git (détectable via processor).

---

# 8) Refresh & UX (Phase 1)
## 8.1 Sans dev (quick win)
- s’appuyer sur refresh périodique (provider + git scan)

## 8.2 Avec dev (recommandé)
- bouton UI “Refresh component” qui déclenche un refresh Catalog (si endpoint dispo) ou accélère le scheduler

---

# 9) Definition of Done (DoD)
## Import + Provider
- [ ] les components PUBLISHED apparaissent dans Backstage
- [ ] chaque entity contient `rosetta.io/component-key`
- [ ] `spec.system` = application (RefApplications)

## Processor
- [ ] heartbeat maj `last_seen_in_backstage_at`
- [ ] GitOps snapshot répliqué vers DB
- [ ] idempotence via hash

## Adopt GitOps
- [ ] MR créée avec YAML correct
- [ ] `management_mode` : REGISTRY → PENDING → GITOPS
- [ ] bascule après merge (webhook)
- [ ] provider n’émet plus, Git émet, processor sync

## Anti-boucle
- [ ] provider ne renvoie jamais PENDING/GITOPS
- [ ] processor ne pousse jamais vers Backstage
- [ ] aucune boucle DB↔Catalog

---

# 10) Planning type (4 semaines)
- **S1** : DB + endpoints provider/heartbeat + import one-shot
- **S2** : provider Backstage + parc visible
- **S3** : processor heartbeat + sync GitOps snapshot
- **S4** : adopt GitOps MR + webhook merge + bascule

---

**Fin.**
