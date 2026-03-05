
# Rosetta Platform – Component Management Strategy
## DB‑Driven Catalog with Progressive GitOps Convergence

---

# 1. Contexte

Dans l’écosystème Rosetta, la plateforme Backstage sert de **portail central pour l’ensemble du catalogue technique du groupe**.

Le catalogue doit permettre de :
- référencer l’ensemble des **applications**
- référencer les **composants logiciels**
- relier les **équipes, groupes, systèmes et dépendances**
- exposer les données techniques (CI/CD, déploiements, observabilité)
- offrir des capacités **self‑service** via le Scaffolder.

Aujourd’hui, l’entreprise dispose déjà d’un **référentiel central (Rock’n’Rimba)** contenant une grande partie du parc applicatif et des métadonnées.

L’enjeu est donc :

**Importer et gérer l’ensemble du parc applicatif dans Backstage sans imposer immédiatement aux équipes l’ajout d’un `catalog-info.yaml` dans tous les repositories existants.**

---

# 2. Problème initial

Dans un modèle Backstage standard :

- chaque composant est décrit par un fichier `catalog-info.yaml`
- ce fichier est stocké dans le repository Git de l’application
- Backstage scanne les repositories pour découvrir les entités.

Cependant ce modèle pose plusieurs problèmes dans un contexte entreprise :

1. Le parc applicatif existant est **très large**
2. Les équipes ne connaissent pas Backstage
3. Imposer l’ajout de YAML dans chaque repo représente un **effort organisationnel massif**
4. Le catalogue doit être disponible **immédiatement**, même pour les anciens projets.

---

# 3. Principe de la solution

La solution proposée repose sur un modèle hybride :

## DB‑Driven Catalog + Convergence Git‑Driven

Cela signifie que :

- le **catalogue initial est piloté par le référentiel interne**
- Backstage est alimenté via des **providers personnalisés**
- les nouveaux projets utilisent un modèle **GitOps natif**
- les anciens projets peuvent migrer progressivement vers GitOps.

---

# 4. Concepts clés

## 4.1 DB‑Driven Catalog

Dans ce modèle :

- les composants sont stockés dans le **référentiel Rock’n’Rimba**
- Backstage ne découvre pas les composants via Git
- un **EntityProvider** lit la base du référentiel
- le provider injecte dynamiquement les entités dans le Software Catalog.

Les entités Backstage deviennent donc une **projection du référentiel interne**.

### Avantages

- import immédiat de l’ensemble du parc
- gouvernance centralisée
- cohérence des métadonnées
- aucun changement requis dans les repositories existants.

---

## 4.2 Git‑Driven Catalog

Le modèle GitOps standard de Backstage repose sur :

- un fichier `catalog-info.yaml` dans le repository
- des modifications versionnées via Git
- des PR/MR pour modifier les métadonnées.

Ce modèle offre :

- auditabilité
- ownership distribué
- alignement avec le code source.

---

## 4.3 Convergence Git‑Driven

La convergence consiste à :

- démarrer avec un catalogue DB‑Driven
- permettre aux projets de **migrer progressivement vers GitOps**.

Cela se fait via un mécanisme appelé :

### Adopt GitOps

---

# 5. Adopt GitOps

Adopt GitOps est un mécanisme permettant à un projet existant de :

1. Générer automatiquement un `catalog-info.yaml`
2. Proposer une Merge Request dans le repository
3. Basculer la source de vérité vers Git.

Ce mécanisme permet :

- une migration progressive
- aucun effort manuel pour les équipes
- un alignement futur avec les pratiques GitOps.

---

# 6. Architecture technique

## 6.1 Référentiel Rock’n’Rimba

Le référentiel contient :

- applications
- groupes
- composants
- relations
- métadonnées techniques.

Il devient la **source de vérité initiale**.

---

## 6.2 Provider Backstage

Un provider personnalisé lit le référentiel et génère des entités :

- Group
- User
- System
- Component

Le provider :
- interroge l’API du référentiel
- transforme les données en entités Backstage
- les injecte dans le Software Catalog.

---

## 6.3 Post‑Processor

Lorsqu’un nouveau composant est créé :

1. Backstage déclenche un événement
2. un post‑processor appelle l’API Rock’n’Rimba
3. le référentiel est mis à jour.

Cela permet de maintenir la cohérence entre :

- Backstage
- le référentiel interne.

---

## 6.4 Scaffolder

Le Scaffolder devient l’outil principal pour créer de nouveaux composants.

Fonctionnement :

1. l’utilisateur lance **Create Component**
2. il sélectionne un template
3. Rosetta :
   - crée le repository
   - génère le `catalog-info.yaml`
   - enregistre l’entité dans Backstage
   - met à jour Rock’n’Rimba.

Les utilisateurs **n’ont jamais besoin d’écrire le YAML eux-mêmes**.

---

# 7. Gestion des sources de vérité

Pour éviter les conflits, chaque composant possède une annotation :

`rosetta.io/source-of-truth`

Valeurs possibles :

- `registry`
- `git`

### registry

Le référentiel Rock’n’Rimba est la source de vérité.

Le provider peut mettre à jour les données.

### git

Le repository devient la source de vérité.

Le provider ne modifie plus l’entité.

---

# 8. Cycle de vie d’un composant

## Création

1. utilisateur utilise le Scaffolder
2. repository créé
3. `catalog-info.yaml` généré
4. entité enregistrée
5. référentiel mis à jour.

---

## Import d’un composant existant

1. composant présent dans Rock’n’Rimba
2. provider l’injecte dans Backstage
3. aucune modification du repo requise.

---

## Migration GitOps

1. utilisateur lance **Adopt GitOps**
2. Rosetta génère `catalog-info.yaml`
3. MR ouverte dans le repository
4. après merge → source-of-truth devient `git`.

---

# 9. Roadmap de mise en œuvre

## Phase 1 – Import du parc

- développement du provider Rock’n’Rimba
- injection des composants dans Backstage
- catalogue complet visible.

---

## Phase 2 – Self‑Service

- templates Scaffolder
- création automatique de repository
- génération automatique des YAML.

---

## Phase 3 – Convergence GitOps

- fonctionnalité Adopt GitOps
- PR automatique dans les repos
- migration progressive.

---

# 10. Bénéfices

Cette architecture apporte :

### Adoption rapide

Backstage peut être déployé immédiatement sur tout le parc.

### Aucun effort pour les équipes

Les équipes n’ont pas besoin de comprendre Backstage.

### Gouvernance centralisée

Le référentiel reste la source de vérité organisationnelle.

### Evolution vers GitOps

Les projets peuvent progressivement adopter le modèle standard.

---

# 11. Conclusion

La stratégie DB‑Driven + GitOps Convergence permet de :

- importer immédiatement l’ensemble du parc applicatif
- conserver une gouvernance forte
- introduire progressivement les bonnes pratiques Backstage
- éviter une transformation brutale des repositories existants.

Cette approche représente un **compromis pragmatique entre industrialisation et adoption progressive** dans un environnement entreprise.

---
