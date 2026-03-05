# Rosetta — Intégration Backstage Scaffolder (Entreprise)
> Spécification + recommandations opérationnelles (gouvernance, implémentation, incrémental)

## 1. Contexte et objectifs

### Contexte
- Rosetta est un portail Backstage utilisé par des équipes “produit” (support, création de composants) **qui ne maîtrisent pas Backstage**.
- Les **équipes applicatives / archi** (côté entités) souhaitent créer rapidement des projets (“white apps”) conformes à leurs standards.
- L’équipe Rosetta (plateforme) doit :
  - **contrôler l’expérience** (pipeline de création, conformité, sécurité),
  - **valider** ce qui est exposé dans l’UI,
  - **maintenir la liste** des modèles disponibles,
  - sans porter la logique métier de développement.

### Objectifs
1) Fournir une expérience “Create a component” simple et fiable (Golden Path).
2) Standardiser : repo, CI, conventions, observabilité, packaging, déploiement.
3) Automatiser progressivement : de la simple création repo → jusqu’au provisioning complet (Namespace + Argo CD + secrets, etc.)
4) Assurer la gouvernance : validation, versioning, traçabilité, audit.
5) Éviter l’usine à gaz : **quick wins** d’abord, puis montée en puissance.

---

## 2. Principes d’architecture recommandés (résumé)

### Recommandation finale
- **Peu de templates visibles** dans le Scaffolder (1 à 3), classés par “type de composant” :
  - `Rosetta – Create a Service`
  - `Rosetta – Create a Frontend`
  - `Rosetta – Create an Infra Component` (optionnel)
- Les “white apps” (squelettes) sont gérées par les équipes applicatives dans un repo dédié.
- Rosetta garde la main sur :
  - les `Template` Backstage (`template.yaml`),
  - les actions (publish/register/guardrails),
  - la **liste blanche** des variants autorisés (affichés dans le formulaire).

> Résultat : UX simple + gouvernance forte + autonomie des équipes sur les squelettes.

---

## 3. Gouvernance & responsabilités (RACI)

### Rôles
- **Équipe Rosetta (plateforme)**
  - maintient Backstage & Scaffolder, templates, actions custom, sécurité, intégration CI/CD
  - valide l’exposition des modèles dans l’UI (liste blanche)
  - assure la cohérence : conventions, tagging, catalog-info, policies
- **Équipe Archi / Dev des entités**
  - propose / maintient les **white apps** (squelettes)
  - définit les standards de code (ex : Spring Boot baseline) et les évolutions
- **Sécurité / IAM**
  - valide flux OIDC, rôles, et les actions de provisioning (namespace, secrets, etc.)

### Gouvernance d’ajout d’un nouveau modèle (variant)
1) L’équipe applicative crée un nouveau squelette via MR dans `rosetta-white-apps`.
2) CI de validation (structure, lint, scans, tests basiques).
3) Review “Architecture/Dev” + Review “Rosetta”.
4) Rosetta ajoute le variant à la **liste blanche** (repo templates).
5) Le variant devient disponible dans Backstage.

---

## 4. Référentiels Git recommandés

### Repo 1 — `rosetta-templates` (contrôlé par Rosetta)
Contient les `Template` Backstage officiels + la liste blanche.

Exemple structure :
```
rosetta-templates/
  catalog/
    locations.yaml               # Location(s) Backstage
  templates/
    service/
      template.yaml              # Rosetta – Create a Service
      allowed-variants.yaml      # Liste blanche des variants
    frontend/
      template.yaml
      allowed-variants.yaml
    infra/
      template.yaml
      allowed-variants.yaml
  docs/
    scaffolder.md
```

### Repo 2 — `rosetta-white-apps` (contribution équipes applicatives)
Contient uniquement des squelettes (pas de template Backstage).

Exemple structure :
```
rosetta-white-apps/
  springboot/
    service-basic/
      skeleton/...
      meta.yaml                  # (optionnel) metadata variant
    service-kafka/
      skeleton/...
  node/
    frontend-basic/
      skeleton/...
  helm/
    infra-basic/
      skeleton/...
```

> Le dossier `skeleton/` contient les fichiers à rendre : `pom.xml`, `Dockerfile`, `helm/`, `catalog-info.yaml`, etc.

---

## 5. Intégration dans Backstage

### 5.1 Déclarer les templates via le Catalog (locations)
Backstage n’affiche dans “Create…” que les entités `kind: Template` chargées par le Catalog.

- Ajouter une location qui pointe vers le repo `rosetta-templates`.
- Exemple (conceptuel) :
  - Location → `rosetta-templates/templates/**/template.yaml`
  - ou un fichier agrégateur `locations.yaml` référencé par Backstage.

> En entreprise : préférer un fichier agrégateur unique versionné et relu.

### 5.2 Permissions / RBAC
- Restreindre :
  - qui peut **utiliser** un template (ex : seulement certaines entités),
  - qui peut **voir** certains templates (ex : templates “beta”).
- Appliquer :
  - naming policy (slug, owner),
  - destination repositories (group/subgroup),
  - branches protégées.

### 5.3 Secrets & tokens (scaffolder)
- Utiliser une intégration sécurisée (SCM token “service” + rotation).
- Interdire les URLs libres dans les formulaires.
- Chaque action sensible (création namespace, secrets) doit utiliser un compte technique et être auditée.

---

## 6. Design des templates (UX et robustesse)

### 6.1 “Peu de templates, beaucoup de variants”
- 1 template = 1 expérience d’onboarding (Service / Frontend / Infra)
- `variant` = choix du squelette (white app) via une liste déroulante contrôlée.

### 6.2 Paramètres standards (recommandés)
- `name` (slug)
- `owner` (OwnerPicker)
- `system` (optionnel)
- `description`
- `repoVisibility` (optionnel)
- `variant` (liste blanche)
- `deployTarget` (Cube/ArgoCD, optionnel selon phase)
- `database` / `messaging` (optionnels si gérés par standard)

### 6.3 Guardrails (à appliquer)
- conventions de nommage (regex)
- mapping owner → namespace / repo path
- enforcement : `catalog-info.yaml` requis
- minimal observabilité : endpoints santé, logs, tracing (selon stack)

---

## 7. Pipeline Scaffolder — étapes fonctionnelles (recommandées)

### Pipeline “Service” (exemple)
1) **Fetch skeleton** (variant) depuis `rosetta-white-apps`
2) **Render** avec valeurs (name, owner, options)
3) **Publish** repo (GitLab) + protections (main protected, MR required)
4) **Bootstrap CI/CD** (pipelines standard)
5) **Register** dans le Software Catalog (catalog-info.yaml)
6) (optionnel) **Provision** infra (namespace, Argo CD, secrets)
7) **Output** liens : repo, entité, Argo CD app, namespace, dashboards

---

## 8. Provisioning & automatisations (incrémental)

Objectif : éviter de tout automatiser trop tôt.

### Phase 1 — Quick wins (fortement recommandée)
> “Créer un composant” = repo prêt + catalog + CI + packaging

- Création repo + initial commit
- Ajout pipelines CI standard
- Ajout `catalog-info.yaml`
- Enregistrement automatique dans Catalog
- Option : création groupe GitLab / permissions standard
- Option : repo Helm minimal (chart) ou kustomize minimal

**Bénéfice** : adoption rapide, faible risque, maintenance faible.

### Phase 2 — Déploiement “semi-automatique”
> On ajoute le déploiement GitOps sans toucher à l’infra profonde

- Générer les manifests Helm/Kustomize
- Créer une “application Argo CD” (ou PR dans un repo GitOps)
- Output : lien Argo CD + instructions

**Bénéfice** : accélère la mise en prod tout en restant gouvernable.

### Phase 3 — Provisioning complet (à faire si maturité OK)
> “Create” fait aussi l’infra

- Création Namespace sur Cube
- Création NetworkPolicies / RBAC / quotas
- Création secrets (via Vault/ExternalSecrets)
- Création Argo CD App + sync policy
- (optionnel) Observabilité : dashboards Grafana, alert rules, logs routing

**Attention** : nécessite IAM solide, audit, rollback, et ownership clair.

---

## 9. Stratégie d’évolution (scaling horizontal)

### Plan incrémental recommandé (communication interne)
- “Nouveauté Rosetta #1 : Create Spring Boot Service (Cube-ready)”
- “Nouveauté Rosetta #2 : Create Frontend”
- “Nouveauté Rosetta #3 : Create Batch”
- “Nouveauté Rosetta #4 : Argo CD App auto”
- “Nouveauté Rosetta #5 : Namespace + policies auto”

Chaque étape ajoute :
- 1 template (ou amélioration d’un existant),
- 2–5 variants maximum au début,
- des contrôles qualité,
- une doc “How to use” ultra courte.

---

## 10. Qualité & conformité des white apps (CI recommandé)

### Checks minimum (repo `rosetta-white-apps`)
- structure : présence `skeleton/`
- présence : `catalog-info.yaml` (ou template pour en générer un)
- lint (formatters)
- tests minimal (compile / unit tests)
- vuln scan des dépendances (au moins baseline)
- option : scorecard / règles d’archi

### Compatibilité
Chaque squelette doit être compatible avec les standards Rosetta :
- CI pipeline standard
- conventions de packaging
- endpoints santé (si applicable)
- observabilité minimale (selon stack)

---

## 11. Observabilité & audit
- Journaliser les runs scaffolder :
  - qui a créé quoi, quand, pour quel owner
- Conserver un audit log technique :
  - création repos, création namespace, création Argo CD app, etc.
- Indicateurs utiles :
  - time-to-first-deploy
  - nombre de créations / semaine
  - taux d’échec de templates
  - % de composants conformes

---

## 12. Recommandations finales (à appliquer)
1) **Limiter** le nombre de templates affichés (1–3).
2) Laisser les équipes contribuer des **squelettes** (white apps) via MR, avec CI.
3) Exposer uniquement des variants **whitelistés** (contrôle Rosetta).
4) Démarrer par Quick wins (repo + catalog + CI) puis ajouter le provisioning.
5) Industrialiser l’incrémental : à chaque release Rosetta, un type de composant de plus.

---

## 13. Annexes — Exemple de “variant mapping” (concept)
> Le template “Service” propose `variant`. Chaque variant correspond à un path dans `rosetta-white-apps`.

- `springboot-basic` → `springboot/service-basic/skeleton`
- `springboot-kafka` → `springboot/service-kafka/skeleton`
- `quarkus-basic` → `quarkus/service-basic/skeleton`

> Implémentation : mapping dans le template (ou dans un fichier YAML lu par le template si vous centralisez la whitelist).

---

## 14. Checklist de mise en œuvre (prête à exécuter)
- [ ] Créer `rosetta-templates` + `rosetta-white-apps`
- [ ] Mettre en place protections branches + MR obligatoire
- [ ] Ajouter CI de validation sur `rosetta-white-apps`
- [ ] Créer 1er template “Rosetta – Create a Service”
- [ ] Déclarer la location Catalog vers `rosetta-templates`
- [ ] Mettre en place RBAC (qui voit/qui utilise)
- [ ] Piloter Phase 1 (quick win) jusqu’à adoption
- [ ] Étendre Phase 2 (Argo CD) puis Phase 3 (provisioning infra)

---
**Fin.**
