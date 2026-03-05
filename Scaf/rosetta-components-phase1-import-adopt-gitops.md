# Rosetta — Gestion des Components (Phase 1) : Import Parc + Adopt GitOps
> Synthèse de la solution retenue pour la **première entité** (déploiement imminent)  
> **Scope : Components uniquement** — **Scaffolder / Templates : hors scope** (on n’en parle pas ici)

---

## 1) Objectif de cette Phase 1

### Contrainte métier
- L’entité dispose d’un **référentiel cartographique legacy** (pas d’API), exportable en **Excel/CSV**.
- L’objectif n’est pas de demander aux équipes d’ajouter un `catalog-info.yaml` partout (impossible à court terme).
- On veut rendre Rosetta/Backstage **opérationnel rapidement** sur **tout le parc existant**.

### Objectif technique
1. **Importer 100% du parc** dans le référentiel Rosetta (Rock’n’Rimba) puis dans Backstage.
2. Offrir une action **Adopt GitOps** pour converger **progressivement** vers le modèle standard Backstage.
3. Conserver le support du modèle “Git catalog-info.yaml existant” pour les équipes qui l’ont déjà.

---

## 2) Modèle conceptuel : DB-Driven puis Convergence Git-Driven

### 2.1 DB-Driven (Phase 1)
- La **source de vérité initiale** pour les Components est votre **référentiel** (Rock’n’Rimba / Postgres).
- Backstage est alimenté via un **EntityProvider** qui lit l’API Référentiel et injecte les entités.

**Résultat :** Backstage contient le parc complet, sans toucher aux repos existants.

### 2.2 Convergence Git-Driven (progressif)
- Une fois qu’un composant est “Adopt GitOps”, son `catalog-info.yaml` est créé dans le repo via MR.
- Après merge, la **source de vérité Catalog** bascule vers Git.

**Résultat :** migration douce, sans effort manuel massif.

---

## 3) Règle clé : Source-of-Truth par composant

Pour éviter les conflits (drift), chaque composant porte une annotation ou un champ métier :

- `rosetta.io/source-of-truth: registry | git`

### `registry`
- L’entité est **pilotée par le référentiel**.
- Le provider Rosetta peut mettre à jour les champs “catalog” (owner, system, tags, etc.) depuis la DB.

### `git`
- L’entité est **pilotée par le repo** (`catalog-info.yaml`).
- Le provider Rosetta **n’écrase plus** les champs “catalog” (il peut continuer à enrichir des annotations runtime non conflictuelles).

---

## 4) Architecture fonctionnelle (Phase 1)

### 4.1 Ingestion (import parc)
1. Récupération de l’Excel/CSV du référentiel legacy.
2. Transformation vers le **modèle canonique Rosetta** (Rock’n’Rimba).
3. Stockage en base référentiel (Postgres).

> L’import est réalisé **une fois** (bootstrap).  
> Les mises à jour ultérieures seront traitées au cas par cas (hors scope Phase 1).

### 4.2 Exposition vers Backstage (provider)
- Un **EntityProvider** Backstage lit l’API Rock’n’Rimba et produit des entités :
  - `Component`
  - (et les liens nécessaires vers `Group` / `System` si disponibles)

### 4.3 Découverte Git existante (conservée)
- Les équipes qui possèdent déjà un `catalog-info.yaml` continuent d’être découvertes via le mécanisme Git (GitLab discovery / locations).
- Ces entités seront typiquement marquées `rosetta.io/source-of-truth=git` dès le départ.

---

## 5) Validation : “comment être sûr que c’est le bon composant ?”

Le point critique d’un import massif, c’est l’**identité**.

### 5.1 Identifiant canonique
Chaque composant importé doit avoir une clé stable (exemples) :
- `component_key` (recommandé) : clé métier stable (entité + code app + code composant)
- ou à défaut : combinaison stable (owner + application + nom)

Cette clé est utilisée pour :
- générer `metadata.name` (slug stable)
- éviter les doublons
- gérer les futures bascules GitOps

### 5.2 “Pre-flight checks” côté Rosetta (recommandés)
Avant de publier dans Backstage :
- validation du format des clés
- mapping owner → Group Backstage (table de correspondance)
- vérification optionnelle repo/projectId GitLab si fourni (GitLab API)

---

## 6) Parcours utilisateur : Adopt GitOps (détaillé)

### 6.1 Quand l’utilisateur utilise Adopt GitOps ?
Un utilisateur (ou admin) déclenche “Adopt GitOps” sur un composant importé quand :
- le repo GitLab est connu (repoUrl ou projectId)
- l’équipe accepte d’aligner la définition du composant avec Git

### 6.2 Expérience utilisateur (UI Rosetta)
L’utilisateur voit un **stepper** (wizard) :

#### Étape 1 — Préparation
- affichage des infos du composant (nom, owner, system, repo)
- choix/confirmation du repository cible (si plusieurs options)
- choix du chemin du fichier : par défaut `/catalog-info.yaml`

#### Étape 2 — Validation repository
Rosetta vérifie automatiquement :
- le repo existe
- le user/service account a le droit de créer une MR
- le chemin cible est autorisé
- option : vérifier qu’un `catalog-info.yaml` n’existe pas déjà

#### Étape 3 — Génération du `catalog-info.yaml`
Rosetta génère le YAML depuis le référentiel :
- kind: Component
- metadata.name / title / description
- spec.owner / spec.system / spec.type / lifecycle
- annotations utiles (repo, CI, etc.)

#### Étape 4 — Création de la Merge Request
Rosetta :
- crée une branche (ex: `rosetta/adopt-gitops`)
- commit le `catalog-info.yaml`
- ouvre une MR (Merge Request) vers `main`

#### Étape 5 — Résultat
L’utilisateur voit :
- **“Merge Request créée”** + lien direct GitLab
- un message de guidance :
  - “Merci de faire approuver et merger la MR pour finaliser l’Adopt GitOps.”

### 6.3 Quand la bascule source-of-truth se fait ?
**La bascule ne se fait pas à la création de la MR.**  
Elle se fait **après merge**.

Deux approches possibles (choisir une seule) :

#### Option A (recommandée) — Webhook GitLab
- GitLab envoie un événement “MR merged”
- Rosetta reçoit l’événement et :
  - marque le composant `rosetta.io/source-of-truth=git`
  - met à jour la “source location” / repo URL si besoin

#### Option B — Vérification périodique (polling)
- Rosetta vérifie périodiquement les MRs ouvertes par Rosetta
- dès qu’elle détecte “merged” :
  - bascule `source-of-truth=git`

---

## 7) Après Adopt GitOps : ce qui change

### 7.1 Mise à jour des métadonnées
- Les changements “catalog” (owner, tags, relations) sont désormais portés par Git (MRs du repo).
- Rosetta n’écrase plus ces champs depuis la DB.

### 7.2 Enrichissements “runtime” (toujours possibles)
Rosetta peut continuer à enrichir l’entité avec des données techniques :
- projectId GitLab, liens pipelines
- annotations Argo CD / Kubernetes
- FinOps / coûts
… tant que ce sont des champs non conflictuels avec Git.

---

## 8) Support du mécanisme Git natif (hors adopt)
Même en Phase 1, on conserve :
- la découverte via `catalog-info.yaml` déjà existants
- et le `catalog:register` (ou équivalent) si une équipe fournit déjà un YAML et veut s’enregistrer “proprement”.

**Important :** on ne supprime pas la possibilité Git-driven. On ajoute un chemin DB-driven pour le parc.

---

## 9) Mise en production : plan d’exécution (Phase 1)

### Étape P1 — Modèle canonique référentiel
- définir les champs minimum requis pour un Component (owner, system, type, repo optionnel)
- définir la clé canonique `component_key`

### Étape P2 — Import parc (one-shot)
- ingestion Excel/CSV
- normalisation
- stockage en Postgres référentiel

### Étape P3 — Provider Backstage
- provider lit l’API référentiel
- injection des Components importés dans Backstage
- annotation `rosetta.io/source-of-truth=registry`

### Étape P4 — Feature Adopt GitOps
- UI stepper + endpoints backend
- génération YAML
- création MR GitLab
- bascule source-of-truth après merge (webhook recommandé)

### Étape P5 — Communication / adoption
- “Vous avez accès au parc complet dans Rosetta”
- “Vous pouvez adopter GitOps via une MR générée automatiquement”
- guide court : “Comment merger la MR et finaliser l’adoption”

---

## 10) Résumé (en 5 phrases)
1. On **importe tout le parc** dans Rock’n’Rimba puis Backstage, sans toucher aux repos.
2. Les composants importés sont `source-of-truth=registry`.
3. Les équipes peuvent déclencher **Adopt GitOps** pour générer une MR ajoutant `catalog-info.yaml`.
4. La bascule vers `source-of-truth=git` se fait **uniquement après merge** (webhook recommandé).
5. On conserve la compatibilité avec les repos qui ont déjà leur YAML et la découverte Git existante.

---
**Fin.**
