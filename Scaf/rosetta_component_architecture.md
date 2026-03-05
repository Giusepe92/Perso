
# Rosetta – Component Management Technical Specification
## Import Registry + Adopt GitOps + Backstage Synchronisation

---

# 1. Contexte

Dans Rosetta, le **Software Catalog Backstage** doit représenter l’ensemble du parc applicatif de l’entité.

Cependant :
- une grande partie du parc provient d’un **référentiel cartographique legacy**
- ce référentiel n’expose **pas d’API**
- les équipes ne peuvent pas ajouter immédiatement un `catalog-info.yaml` dans chaque repository.

La stratégie choisie est donc :

**Import Registry Driven → Convergence GitOps progressive**

Le référentiel interne utilisé par Rosetta est :

**Service : `platform-ref-api`  
Base de données : `platform_ref_db`**

Ce référentiel sert également de **hub interne** pour :
- FinOps
- monitoring
- cartographie technique
- corrélation CI/CD et infrastructure.

---

# 2. Principe de l’architecture

Le système repose sur trois composants principaux :

### 1️⃣ platform-ref-api (référentiel central)

Base canonique contenant :

- les components
- les métadonnées métier
- les liens FinOps
- les données runtime.

Certaines données ne sont **pas utilisées directement par Backstage** mais restent nécessaires pour d'autres services.

---

### 2️⃣ Backstage Catalog

Backstage expose les entités :

- Component
- System
- Group

Il sert de **projection** pour :
- l’UI Rosetta
- la recherche
- les relations techniques.

---

### 3️⃣ Synchronisation bidirectionnelle contrôlée

Deux mécanismes existent :

**Provider**
→ charge les composants `REGISTRY` depuis `platform-ref-api` vers Backstage.

**Post-processor**
→ réplique les modifications du Catalog vers `platform-ref-api`.

Ce modèle évite les conflits et les boucles.

---

# 3. Modes de gestion d’un composant

Chaque composant possède un champ dans `platform_ref_db` :

`management_mode`

Valeurs possibles :

| Mode | Description |
|-----|-------------|
| REGISTRY | Le composant est géré par le référentiel |
| GITOPS | Le composant est géré par un `catalog-info.yaml` |
| API | Source externe normalisée (optionnel futur) |

---

# 4. Modèle de données (platform_ref_db)

Table : `components`

## Champs catalog

- component_key (clé canonique stable)
- name_slug
- title
- description
- owner_ref
- system_ref
- type
- lifecycle
- tags (json)
- links (json)

---

## Champs SCM / GitOps

- repo_url
- gitlab_project_id
- catalog_info_path
- gitops_adopted_at
- last_mr_id
- last_mr_url
- last_git_commit_sha

---

## Champs gestion

- management_mode
- status
- source_of_truth

---

## Champs synchronisation

- last_seen_in_backstage_at
- last_catalog_sync_at
- last_runtime_sync_at
- last_seen_entity_hash
- last_sync_source

---

## Champs internes Rosetta

- cost_center
- application_code
- runtime_annotations (json)

Ces champs ne sont pas obligatoirement exposés à Backstage.

---

# 5. Provider Backstage

Le provider Backstage interroge `platform-ref-api`.

Endpoint utilisé :

```
GET /components?management_mode=REGISTRY
```

Il retourne uniquement les composants gérés par le référentiel.

---

## Mapping vers une entité Backstage

Exemple généré :

```
apiVersion: backstage.io/v1alpha1
kind: Component

metadata:
  name: payment-service
  annotations:
    rosetta.io/component-key: payment-service
    rosetta.io/management-mode: REGISTRY
    backstage.io/source-location: rosetta:component/payment-service

spec:
  owner: group:default/payments
  system: system:default/payments
  type: service
  lifecycle: production
```

---

# 6. Post Processor Backstage

Un **processor custom** est ajouté au pipeline Catalog.

Objectif :
répliquer l’état des entités vers `platform-ref-api`.

---

## Fonctionnement

À chaque ingestion d’un Component :

1. Le processor récupère l’entité
2. Il calcule un `entity_hash`
3. Il appelle l’API référentiel

```
POST /internal/backstage/catalog-events/components/upsert
```

---

## Payload envoyé

```
{
  entityRef,
  component_key,
  management_mode,
  catalog_snapshot,
  entity_hash,
  eventType
}
```

---

## Traitement côté référentiel

Le référentiel :

- compare `entity_hash`
- ignore si inchangé
- met à jour les champs synchronisés
- met à jour les timestamps

Aucune modification n’est renvoyée vers Backstage.

---

# 7. Prévention des boucles

Plusieurs mécanismes empêchent les boucles :

### Règle 1

Le **provider charge uniquement REGISTRY**.

Les composants `GITOPS` ne sont jamais réinjectés dans Backstage.

---

### Règle 2

Le **post processor ne pousse jamais vers Backstage**.

Il ne fait que synchroniser vers `platform-ref-api`.

---

### Règle 3

Le référentiel utilise un `entity_hash` pour ignorer les updates identiques.

---

# 8. Adopt GitOps

Adopt GitOps permet de migrer un composant vers Git.

---

## Étapes

1️⃣ L’utilisateur lance **Adopt GitOps** depuis Rosetta.

2️⃣ Rosetta génère un `catalog-info.yaml` basé sur le référentiel.

3️⃣ Rosetta crée une **Merge Request GitLab**.

4️⃣ L’utilisateur valide et merge la MR.

---

## Bascule de mode

Après merge :

`management_mode = GITOPS`

---

## Conséquences

- le provider ne renvoie plus ce composant
- Backstage le découvre via Git
- le processor continue à synchroniser vers le référentiel

---

# 9. Validation des composants

Chaque composant doit posséder :

`rosetta.io/component-key`

Cette clé permet :

- de réconcilier les entités Backstage
- d’éviter les duplications
- de maintenir le lien avec `platform_ref_db`

---

# 10. Plan d’implémentation (rapide)

## Phase 1

Créer le modèle `components` dans `platform_ref_db`

---

## Phase 2

Implémenter l’import initial du parc dans `platform-ref-api`

---

## Phase 3

Créer le provider Backstage `REGISTRY`

---

## Phase 4

Créer le processor de synchronisation Catalog → référentiel

---

## Phase 5

Implémenter la fonctionnalité Adopt GitOps

---

## Phase 6

Configurer le webhook GitLab pour détecter les merges

---

# 11. Résultat attendu

- le parc complet apparaît dans Backstage
- les composants peuvent migrer progressivement vers GitOps
- `platform-ref-api` reste le hub central pour FinOps et monitoring
- aucune boucle de synchronisation n’est possible

---

# Fin
