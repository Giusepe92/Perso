# Rosetta – Steps d’implémentation (Phase 1)
## Components : Import Parc + Provider REGISTRY + Post-Processor (Heartbeat & Sync GitOps) + Adopt GitOps
> Document “to-do” actionnable, orienté **quick wins**.  
> **Scaffolder / Templates : hors scope**.

---

# 0) Objectif (rappel)
- Importer le parc applicatif dans `platform-ref-api` (`platform_ref_db`) puis l’exposer dans Backstage.
- Garder `platform-ref-api` comme hub (FinOps/monitoring).
- Permettre **Adopt GitOps** : création MR `catalog-info.yaml` + bascule après merge.
- Éviter toute boucle :  
  - Provider injecte **REGISTRY uniquement**  
  - Git injecte **GITOPS**  
  - Post-processor réplique vers `platform-ref-api` (heartbeat toujours, snapshot seulement pour GITOPS)

---

# 1) Data Model – platform_ref_db (à faire en premier)

## 1.1 Champs obligatoires `components`
Créer/valider la table `components` avec :

### Identité
- `component_key` (string, unique, stable) ✅
- `name_slug` (string) → sera `metadata.name` dans Backstage

### Catalog snapshot “core”
- `title`, `description`
- `owner_ref` (ex `group:default/team-a`)
- `system_ref` (ex `system:default/payments`)
- `type` (service/website/library/…)
- `lifecycle` (production/experimental/…)
- `tags` (jsonb), `links` (jsonb)

### Gestion / gouvernance
- `management_mode` enum : `REGISTRY | GITOPS | API` (API optionnel) ✅
- `status` (optionnel : DRAFT/VALIDATED/PUBLISHED)
- `catalog_info_path` (default `/catalog-info.yaml`)

### SCM
- `repo_url` (optional)
- `gitlab_project_id` (optional)

### Sync / heartbeat
- `last_seen_in_backstage_at`
- `last_catalog_sync_at`
- `last_seen_entity_hash`
- `last_sync_source` (provider|processor|webhook|manual)

> Note : vous pouvez stocker des champs “internes” (FinOps, monitoring) non consommés par Backstage.

---

# 2) Import parc (one-shot) dans platform-ref-api

## 2.1 Pipeline import
- Ingestion Excel/CSV legacy
- Normalisation vers le modèle canonique (`component_key`, mapping owner/system, etc.)
- Upsert dans `components`
- Par défaut : `management_mode = REGISTRY`

## 2.2 Pré-requis qualité (minimum viable)
- `component_key` obligatoire
- `name_slug` généré de façon stable (slug)  
- mapping owner → Group existant (ou fallback “unknown”)

---

# 3) Provider Backstage : REGISTRY-only (projection vers Catalog)

## 3.1 Endpoint provider côté platform-ref-api
Implémenter :
- `GET /components?management_mode=REGISTRY&status=PUBLISHED` (ou sans status au début)

## 3.2 Provider Backstage
Créer un `EntityProvider` (ou module équivalent) qui :
1. appelle l’endpoint ci-dessus
2. map chaque row → `kind: Component`
3. push dans le Catalog

### Annotations indispensables à injecter
- `rosetta.io/component-key: <component_key>` ✅
- `rosetta.io/management-mode: REGISTRY` ✅
- `backstage.io/source-location: rosetta:component/<component_key>`
- `backstage.io/managed-by-location: rosetta:component/<component_key>`
- si dispo : `backstage.io/repo-url` / annotation GitLab projectId

> IMPORTANT : le provider **ne doit jamais** émettre les composants `GITOPS`.

---

# 4) Git discovery (déjà existant) : GITOPS

## 4.1 Convention YAML GitOps
Quand `catalog-info.yaml` existe dans un repo, il doit contenir :
- `rosetta.io/component-key` ✅
- `rosetta.io/management-mode: GITOPS` ✅

> Rosetta doit garantir ça lors de la génération MR Adopt GitOps.

---

# 5) Post-Processor Catalog → platform-ref-api (sync + heartbeat)

## 5.1 Objectif
À chaque ingestion d’une entité `Component` dans Backstage :
- mettre à jour `last_seen_in_backstage_at` (heartbeat) **toujours**
- répliquer un snapshot “catalog” **uniquement si GITOPS**
- éviter la boucle via idempotence (hash)

## 5.2 Endpoint internal côté platform-ref-api
Implémenter :
- `POST /internal/backstage/sync/components`

Payload minimal recommandé :
- `component_key`
- `entityRef`
- `management_mode` (REGISTRY/GITOPS)
- `entity_hash`
- `timestamp`
- `catalog_snapshot` (présent si GITOPS)

Traitement :
- update heartbeat
- si `entity_hash` identique au dernier : early-exit (ou heartbeat-only)
- si `management_mode == GITOPS` : upsert snapshot (owner/system/type/lifecycle/tags/links/annotations utiles)

## 5.3 Implémentation du Processor Backstage
Ajouter un processor dans le pipeline Catalog qui :
1. filtre `kind == Component`
2. lit `component_key` depuis annotation
3. déduit `management_mode` :
   - si annotation `rosetta.io/management-mode` existe → l’utiliser
   - sinon : fallback via `managed-by-location` (git vs rosetta pseudo-location)
4. calcule `entity_hash` (hash stable du snapshot)
5. POST `/internal/backstage/sync/components`

> Remarque : le processor n’écrit jamais dans Backstage, uniquement vers platform-ref-api.

---

# 6) Adopt GitOps (MR + bascule après merge)

## 6.1 Pré-requis
- `repo_url` ou `gitlab_project_id` présent dans `platform_ref_db`
- composant en `management_mode = REGISTRY`

## 6.2 Action backend Rosetta (création MR)
Implémenter une API Rosetta qui :
1. récupère le composant depuis `platform_ref_db`
2. génère `catalog-info.yaml` avec :
   - `rosetta.io/component-key`
   - `rosetta.io/management-mode: GITOPS`
3. crée branche + commit + MR GitLab

## 6.3 Bascule management_mode après merge (recommandé : webhook)
- configurer webhook GitLab (MR merged)
- côté platform-ref-api :
  - basculer `management_mode = GITOPS`
  - remplir `gitops_adopted_at`, `last_mr_url`, etc.

### Option quick win (si webhook pas prêt)
- polling périodique des MRs “rosetta/adopt-gitops” et bascule quand merged

## 6.4 Transition sans “trou”
Option recommandée :
- introduire `GITOPS_PENDING`
- passer à `GITOPS` uniquement quand Backstage a effectivement ingéré l’entité Git (processor le verra)

(Quick win : ignorer PENDING et accepter un léger délai si votre refresh Git est fréquent.)

---

# 7) Refresh : comment obtenir des updates rapidement

## Option 1 (quick win)
- s’appuyer sur le refresh périodique du Catalog (pull providers + scan git).

## Option 2 (recommandée)
- ajouter une action Rosetta “Refresh component” :
  - déclenche un refresh Catalog sur l’entité ou la location
  - l’ingestion repasse → processor sync/heartbeat

---

# 8) Tests & critères d’acceptation

## 8.1 Import + Provider REGISTRY
- [ ] tous les components importés apparaissent dans Backstage
- [ ] chaque entity contient `rosetta.io/component-key`

## 8.2 Post-processor Heartbeat
- [ ] `last_seen_in_backstage_at` se met à jour lors des refresh
- [ ] pas de charge excessive (hash + early-exit)

## 8.3 Adopt GitOps
- [ ] MR créée avec `catalog-info.yaml` contenant `component-key` + `management-mode=GITOPS`
- [ ] après merge : `management_mode=GITOPS` dans `platform_ref_db`
- [ ] provider n’émet plus ce composant
- [ ] entité apparaît via Git
- [ ] processor réplique snapshot GITOPS vers `platform_ref_db`

## 8.4 Anti-boucle
- [ ] aucune modification référentiel ne réinjecte des entités GitOps via provider
- [ ] processor ne déclenche jamais de push vers Backstage

---

# 9) Planification “semaines à venir” (suggestion)

### Semaine 1
- modèle DB + endpoint provider + import one-shot

### Semaine 2
- provider Backstage REGISTRY-only + parc visible

### Semaine 3
- endpoint sync + processor heartbeat/snapshot

### Semaine 4
- adopt GitOps (MR) + webhook merge + bascule

---

**Fin.**
