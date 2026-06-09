# Backstage — Mise en place des permissions Rosetta via un module du plugin `permission`

## Objectif

Ce document décrit une solution Backstage pour restreindre l’accès aux écrans et fonctionnalités ajoutés par nos modules internes, par exemple :

- FinOps
- Referential / Référentiel
- Admin Rosetta
- Import Excel
- Recalcul de coûts
- Écrans techniques internes

La logique ne doit pas modifier les permissions du Software Catalog pour l’instant. Les entités `Component`, `System`, `Group`, `Resource`, etc. restent visibles par tout le monde.

La restriction porte uniquement sur nos fonctionnalités custom.

La solution s’appuie sur le **new backend system** de Backstage, donc on évite de modifier directement le code source du backend Backstage dans un dossier `extensions`. On crée plutôt un vrai module backend dédié qui étend le plugin `permission`.

Références utiles :

- Backstage Permissions — Concepts : https://backstage.io/docs/permissions/concepts
- Backstage Permissions — Getting Started : https://backstage.io/docs/permissions/getting-started
- Backstage Permissions — Frontend Integration : https://backstage.io/docs/next/permissions/frontend-integration
- Backstage Backend System — Modules : https://backstage.io/docs/backend-system/architecture/modules
- Backstage Permissions Service : https://backstage.io/docs/backend-system/core-services/permissions

---

## 1. Principe général

Backstage sépare trois notions :

1. **La permission**  
   Exemple : `rosetta.finops.read`.

2. **La policy**  
   Code backend central qui décide si un utilisateur a le droit ou non d’utiliser une permission.

3. **L’enforcement**  
   Le code qui applique réellement la décision :
   - côté frontend : masquer ou bloquer une page avec `RequirePermission`
   - côté backend : refuser l’appel API avec `permissions.authorize(...)`

Dans notre cas, on veut faire une logique simple de type RBAC :

```txt
Groupe AD dans le JWT  ->  rôle Rosetta  ->  permissions Backstage
```

Exemple :

```txt
AD-GRP-BACKSTAGE-FINOPS      -> rôle FinOps      -> rosetta.finops.read
AD-GRP-BACKSTAGE-REFERENTIAL -> rôle Referential -> rosetta.referential.read
AD-GRP-BACKSTAGE-ADMIN       -> rôle Admin       -> toutes les permissions Rosetta
```

---

## 2. Architecture cible

Architecture recommandée :

```txt
packages/
  app/
    src/
      App.tsx

plugins/
  rosetta-permissions-common/
    src/
      permissions.ts
      index.ts

  permission-backend-module-rosetta-policy/
    src/
      module.ts
      RosettaPermissionPolicy.ts
      config.ts
      index.ts

  rosetta-finops-backend/
    src/
      routes.ts

  rosetta-finops/
    src/
      pages/
        FinopsPage.tsx
```

Le découpage est volontaire :

- `rosetta-permissions-common` contient les permissions partagées entre frontend et backend.
- `permission-backend-module-rosetta-policy` contient la policy globale Rosetta.
- Les plugins métier comme FinOps ou Referential utilisent les permissions définies dans le package commun.

---

## 3. Configuration applicative

Dans `app-config.yaml`, activer le framework de permissions :

```yaml
permission:
  enabled: true
```

Ajouter une configuration Rosetta pour mapper les rôles fonctionnels vers les groupes AD reçus dans le JWT :

```yaml
rosetta:
  permissions:
    roles:
      admin:
        groups:
          - AD-GRP-BACKSTAGE-ADMIN

      finops:
        groups:
          - AD-GRP-BACKSTAGE-FINOPS

      referential:
        groups:
          - AD-GRP-BACKSTAGE-REFERENTIAL
```

On peut aussi prévoir plusieurs groupes AD pour un même rôle :

```yaml
rosetta:
  permissions:
    roles:
      finops:
        groups:
          - AD-GRP-BACKSTAGE-FINOPS
          - AD-GRP-BACKSTAGE-FINOPS-READONLY
```

---

## 4. Récupération des groupes depuis le JWT OIDC

Dans le `signInResolver`, on décode l’ID token et on récupère le claim `groups`.

Exemple de type TypeScript :

```ts
interface RosettaIdTokenClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  samAccountName?: string;
  groups?: string[];
}
```

Exemple dans le resolver :

```ts
const decodedIdToken = jwtDecode<RosettaIdTokenClaims>(idToken);

const jwtGroups = decodedIdToken.groups ?? [];
```

Ensuite, on injecte ces groupes dans les ownership refs Backstage.

Exemple :

```ts
const normalizedGroups = jwtGroups.map(group =>
  `group:default/${group.toLowerCase()}`,
);

return ctx.issueToken({
  claims: {
    sub: `user:default/${userName}`,
    ent: [
      `user:default/${userName}`,
      ...normalizedGroups,
    ],
  },
});
```

L’idée importante : dans la policy, on pourra lire les groupes via :

```ts
user?.info.ownershipEntityRefs
```

Exemple de valeur attendue :

```ts
[
  'user:default/youssef',
  'group:default/ad-grp-backstage-finops',
  'group:default/ad-grp-backstage-referential'
]
```

Attention : pour éviter les erreurs de casse, il est conseillé de tout normaliser en minuscules.

---

## 5. Créer le package commun des permissions

Créer un package commun, par exemple :

```bash
yarn new
```

Choisir un package de type `common-library` ou créer manuellement :

```txt
plugins/rosetta-permissions-common
```

### Fichier `plugins/rosetta-permissions-common/src/permissions.ts`

```ts
import { createPermission } from '@backstage/plugin-permission-common';

export const rosettaFinopsReadPermission = createPermission({
  name: 'rosetta.finops.read',
  attributes: { action: 'read' },
});

export const rosettaFinopsRecalculatePermission = createPermission({
  name: 'rosetta.finops.recalculate',
  attributes: { action: 'update' },
});

export const rosettaReferentialReadPermission = createPermission({
  name: 'rosetta.referential.read',
  attributes: { action: 'read' },
});

export const rosettaReferentialImportPermission = createPermission({
  name: 'rosetta.referential.import',
  attributes: { action: 'create' },
});

export const rosettaAdminPermission = createPermission({
  name: 'rosetta.admin',
  attributes: { action: 'create' },
});

export const rosettaPermissions = [
  rosettaFinopsReadPermission,
  rosettaFinopsRecalculatePermission,
  rosettaReferentialReadPermission,
  rosettaReferentialImportPermission,
  rosettaAdminPermission,
];
```

### Fichier `plugins/rosetta-permissions-common/src/index.ts`

```ts
export * from './permissions';
```

---

## 6. Créer le module backend qui étend le plugin `permission`

Créer un package backend module :

```txt
plugins/permission-backend-module-rosetta-policy
```

Ce module va étendre le plugin Backstage `permission` via son extension point `policyExtensionPoint`.

Dans le new backend system, un module est créé avec `createBackendModule`.

---

## 7. Lecture de la configuration des groupes

### Fichier `plugins/permission-backend-module-rosetta-policy/src/config.ts`

```ts
import { Config } from '@backstage/config';

export interface RosettaPermissionRoleMapping {
  adminGroups: string[];
  finopsGroups: string[];
  referentialGroups: string[];
}

function normalizeGroup(group: string): string {
  return `group:default/${group.toLowerCase()}`;
}

export function readRosettaPermissionConfig(
  config: Config,
): RosettaPermissionRoleMapping {
  const rolesConfig = config.getOptionalConfig('rosetta.permissions.roles');

  const adminGroups =
    rolesConfig
      ?.getOptionalStringArray('admin.groups')
      ?.map(normalizeGroup) ?? [];

  const finopsGroups =
    rolesConfig
      ?.getOptionalStringArray('finops.groups')
      ?.map(normalizeGroup) ?? [];

  const referentialGroups =
    rolesConfig
      ?.getOptionalStringArray('referential.groups')
      ?.map(normalizeGroup) ?? [];

  return {
    adminGroups,
    finopsGroups,
    referentialGroups,
  };
}
```

---

## 8. Implémenter la policy Rosetta

### Fichier `plugins/permission-backend-module-rosetta-policy/src/RosettaPermissionPolicy.ts`

```ts
import {
  AuthorizeResult,
  PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';

import {
  rosettaAdminPermission,
  rosettaFinopsReadPermission,
  rosettaFinopsRecalculatePermission,
  rosettaReferentialImportPermission,
  rosettaReferentialReadPermission,
} from '@internal/plugin-rosetta-permissions-common';

import { RosettaPermissionRoleMapping } from './config';

export class RosettaPermissionPolicy implements PermissionPolicy {
  constructor(
    private readonly roleMapping: RosettaPermissionRoleMapping,
  ) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const userGroups = user?.info.ownershipEntityRefs ?? [];

    const isAdmin = this.hasAnyGroup(
      userGroups,
      this.roleMapping.adminGroups,
    );

    const isFinops = this.hasAnyGroup(
      userGroups,
      this.roleMapping.finopsGroups,
    );

    const isReferential = this.hasAnyGroup(
      userGroups,
      this.roleMapping.referentialGroups,
    );

    if (request.permission.name === rosettaAdminPermission.name) {
      return this.allowIf(isAdmin);
    }

    if (request.permission.name === rosettaFinopsReadPermission.name) {
      return this.allowIf(isAdmin || isFinops);
    }

    if (request.permission.name === rosettaFinopsRecalculatePermission.name) {
      return this.allowIf(isAdmin || isFinops);
    }

    if (request.permission.name === rosettaReferentialReadPermission.name) {
      return this.allowIf(isAdmin || isReferential);
    }

    if (request.permission.name === rosettaReferentialImportPermission.name) {
      return this.allowIf(isAdmin || isReferential);
    }

    // Important : on ne bloque pas les autres permissions Backstage.
    // Donc le Catalog reste visible pour tout le monde.
    return { result: AuthorizeResult.ALLOW };
  }

  private hasAnyGroup(
    userGroups: string[],
    requiredGroups: string[],
  ): boolean {
    return requiredGroups.some(group => userGroups.includes(group));
  }

  private allowIf(condition: boolean): PolicyDecision {
    return {
      result: condition ? AuthorizeResult.ALLOW : AuthorizeResult.DENY,
    };
  }
}
```

Point clé :

```ts
return { result: AuthorizeResult.ALLOW };
```

pour toutes les permissions non Rosetta.

C’est ce qui garantit qu’on ne modifie pas le comportement du Catalog pour l’instant.

---

## 9. Déclarer le module backend

### Fichier `plugins/permission-backend-module-rosetta-policy/src/module.ts`

```ts
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';

import { readRosettaPermissionConfig } from './config';
import { RosettaPermissionPolicy } from './RosettaPermissionPolicy';

export const permissionModuleRosettaPolicy = createBackendModule({
  pluginId: 'permission',
  moduleId: 'rosetta-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ policy, config, logger }) {
        const roleMapping = readRosettaPermissionConfig(config);

        logger.info(
          `Rosetta permission policy loaded. adminGroups=${roleMapping.adminGroups.length}, finopsGroups=${roleMapping.finopsGroups.length}, referentialGroups=${roleMapping.referentialGroups.length}`,
        );

        policy.setPolicy(new RosettaPermissionPolicy(roleMapping));
      },
    });
  },
});
```

### Fichier `plugins/permission-backend-module-rosetta-policy/src/index.ts`

```ts
export { permissionModuleRosettaPolicy as default } from './module';
```

---

## 10. Installer le module dans le backend

Dans le backend principal, par exemple `packages/backend/src/index.ts` :

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@internal/plugin-permission-backend-module-rosetta-policy'));

backend.start();
```

Le point important :

```ts
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@internal/plugin-permission-backend-module-rosetta-policy'));
```

Le module Rosetta étend le plugin `permission`. Il doit donc être chargé dans la même instance backend que le plugin `permission`.

---

## 11. Protéger une route frontend FinOps

Dans le frontend, utiliser `RequirePermission`.

Exemple dans `packages/app/src/App.tsx` :

```tsx
import { Route } from 'react-router-dom';
import { RequirePermission } from '@backstage/plugin-permission-react';
import { rosettaFinopsReadPermission } from '@internal/plugin-rosetta-permissions-common';
import { FinopsPage } from '@internal/plugin-rosetta-finops';

<Route
  path="/finops"
  element={
    <RequirePermission permission={rosettaFinopsReadPermission}>
      <FinopsPage />
    </RequirePermission>
  }
/>
```

Effet :

- si l’utilisateur appartient au groupe AD FinOps ou Admin, il accède à la page ;
- sinon, Backstage bloque l’accès côté frontend.

---

## 12. Protéger un bouton ou une action frontend

Exemple : bouton de recalcul des coûts FinOps.

```tsx
import { usePermission } from '@backstage/plugin-permission-react';
import { rosettaFinopsRecalculatePermission } from '@internal/plugin-rosetta-permissions-common';

export function RecalculateCostButton() {
  const { loading, allowed } = usePermission({
    permission: rosettaFinopsRecalculatePermission,
  });

  if (loading) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return (
    <Button variant="contained" color="primary">
      Recalculer les coûts
    </Button>
  );
}
```

Cette logique est utile pour masquer uniquement certaines actions sensibles, sans masquer toute la page.

---

## 13. Protéger les routes backend FinOps

Masquer une page côté frontend ne suffit pas. Il faut aussi protéger les APIs backend.

Dans un plugin backend custom, injecter les services suivants :

- `coreServices.permissions`
- `coreServices.httpAuth`
- `coreServices.httpRouter`

Exemple :

```ts
import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { NotAllowedError } from '@backstage/errors';
import Router from 'express-promise-router';

import {
  rosettaFinopsReadPermission,
  rosettaFinopsRecalculatePermission,
} from '@internal/plugin-rosetta-permissions-common';

export const rosettaFinopsBackendPlugin = createBackendPlugin({
  pluginId: 'rosetta-finops',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, httpAuth, permissions }) {
        const router = Router();

        router.get('/costs', async (req, res) => {
          const credentials = await httpAuth.credentials(req);

          const [decision] = await permissions.authorize(
            [{ permission: rosettaFinopsReadPermission }],
            { credentials },
          );

          if (decision.result !== AuthorizeResult.ALLOW) {
            throw new NotAllowedError('Access denied to FinOps costs');
          }

          res.json({ costs: [] });
        });

        router.post('/recalculate', async (req, res) => {
          const credentials = await httpAuth.credentials(req);

          const [decision] = await permissions.authorize(
            [{ permission: rosettaFinopsRecalculatePermission }],
            { credentials },
          );

          if (decision.result !== AuthorizeResult.ALLOW) {
            throw new NotAllowedError('Access denied to FinOps recalculation');
          }

          res.json({ status: 'recalculation started' });
        });

        httpRouter.use(router);
      },
    });
  },
});
```

---

## 14. Exemple complet pour le module FinOps

### Rôle

```txt
finops
```

### Groupe AD associé

```txt
AD-GRP-BACKSTAGE-FINOPS
```

### Permissions Backstage

```txt
rosetta.finops.read
rosetta.finops.recalculate
```

### Règles

```txt
Admin peut tout faire.
FinOps peut voir la page FinOps.
FinOps peut lancer le recalcul des coûts.
Les autres utilisateurs n’ont pas accès à la page FinOps.
Les autres utilisateurs ne peuvent pas appeler les APIs FinOps.
```

### Frontend

```tsx
<RequirePermission permission={rosettaFinopsReadPermission}>
  <FinopsPage />
</RequirePermission>
```

### Backend

```ts
const [decision] = await permissions.authorize(
  [{ permission: rosettaFinopsReadPermission }],
  { credentials: await httpAuth.credentials(req) },
);

if (decision.result !== AuthorizeResult.ALLOW) {
  throw new NotAllowedError('Access denied');
}
```

---

## 15. Exemple complet pour le module Referential

### Rôle

```txt
referential
```

### Groupe AD associé

```txt
AD-GRP-BACKSTAGE-REFERENTIAL
```

### Permissions Backstage

```txt
rosetta.referential.read
rosetta.referential.import
```

### Règles

```txt
Admin peut tout faire.
Referential peut voir le référentiel.
Referential peut importer un fichier référentiel.
Les autres utilisateurs n’ont pas accès à la page Referential.
Les autres utilisateurs ne peuvent pas appeler les APIs Referential.
```

---

## 16. Ne pas toucher aux entités du Catalog

Pour l’instant, on ne crée pas de règle comme :

```txt
user X peut voir component Y
user X peut voir system Z
group A peut voir application B
```

Parce qu’on n’a pas encore de mapping fiable :

```txt
user -> group métier -> application -> component
```

Donc la policy doit laisser passer les permissions non Rosetta :

```ts
return { result: AuthorizeResult.ALLOW };
```

Cela permet de garder visibles :

- les Components
- les Systems
- les Groups
- les Resources
- les APIs
- les pages natives du Catalog

---

## 17. Bonnes pratiques de nommage

Utiliser un préfixe clair pour nos permissions :

```txt
rosetta.<module>.<action>
```

Exemples :

```txt
rosetta.finops.read
rosetta.finops.recalculate
rosetta.referential.read
rosetta.referential.import
rosetta.admin
```

Éviter des noms trop génériques :

```txt
read
admin
import
```

Préférer :

```txt
rosetta.finops.read
rosetta.referential.import
```

---

## 18. Gestion des rôles Admin

Le rôle Admin doit être traité comme un rôle transverse.

Dans la policy :

```ts
const isAdmin = this.hasAnyGroup(
  userGroups,
  this.roleMapping.adminGroups,
);
```

Puis :

```ts
if (isAdmin) {
  return { result: AuthorizeResult.ALLOW };
}
```

Alternative plus contrôlée : autoriser Admin uniquement pour les permissions Rosetta.

Exemple recommandé :

```ts
if (request.permission.name.startsWith('rosetta.')) {
  // appliquer logique Rosetta
}

return { result: AuthorizeResult.ALLOW };
```

Cela évite que notre rôle Admin Rosetta influence des permissions natives Backstage ou des permissions d’autres plugins.

---

## 19. Variante plus propre : centraliser la matrice rôle / permission

Au lieu de faire beaucoup de `if`, on peut définir une matrice.

Exemple :

```ts
const permissionRoleMapping: Record<string, string[]> = {
  'rosetta.finops.read': ['admin', 'finops'],
  'rosetta.finops.recalculate': ['admin', 'finops'],
  'rosetta.referential.read': ['admin', 'referential'],
  'rosetta.referential.import': ['admin', 'referential'],
  'rosetta.admin': ['admin'],
};
```

Puis résoudre dynamiquement les rôles de l’utilisateur.

Cette version est plus maintenable si le nombre de modules augmente.

---

## 20. Tests manuels à réaliser

### Cas 1 — utilisateur sans groupe Rosetta

JWT :

```json
{
  "groups": []
}
```

Résultat attendu :

```txt
Catalog visible
FinOps refusé
Referential refusé
Admin refusé
```

### Cas 2 — utilisateur FinOps

JWT :

```json
{
  "groups": ["AD-GRP-BACKSTAGE-FINOPS"]
}
```

Résultat attendu :

```txt
Catalog visible
FinOps autorisé
Referential refusé
Admin refusé
```

### Cas 3 — utilisateur Referential

JWT :

```json
{
  "groups": ["AD-GRP-BACKSTAGE-REFERENTIAL"]
}
```

Résultat attendu :

```txt
Catalog visible
FinOps refusé
Referential autorisé
Admin refusé
```

### Cas 4 — utilisateur Admin

JWT :

```json
{
  "groups": ["AD-GRP-BACKSTAGE-ADMIN"]
}
```

Résultat attendu :

```txt
Catalog visible
FinOps autorisé
Referential autorisé
Admin autorisé
```

---

## 21. Points d’attention

### 21.1 Le frontend seul ne suffit pas

`RequirePermission` permet de masquer ou bloquer une page, mais un utilisateur peut toujours essayer d’appeler directement l’API backend.

Donc toute route backend sensible doit appeler :

```ts
permissions.authorize(...)
```

### 21.2 Les groupes du JWT doivent être stables

Il faut vérifier le contenu réel du token :

```ts
console.log(JSON.stringify(decodedIdToken, null, 2));
```

Puis confirmer que le claim est bien :

```ts
groups: string[]
```

### 21.3 Attention à la casse

Normaliser les groupes :

```ts
group.toLowerCase()
```

Sinon :

```txt
AD-GRP-BACKSTAGE-FINOPS
```

et :

```txt
ad-grp-backstage-finops
```

risquent de ne pas matcher.

### 21.4 Attention aux groupes volumineux

Certains fournisseurs OIDC limitent la taille des tokens. Si l’utilisateur appartient à beaucoup de groupes, le token peut ne pas contenir tous les groupes. Dans ce cas, il faudra peut-être récupérer les groupes via un endpoint utilisateur ou via Microsoft Graph / API interne.

---

## 22. Checklist d’implémentation

```txt
[ ] Activer permission.enabled=true
[ ] Ajouter la configuration rosetta.permissions.roles dans app-config.yaml
[ ] Décoder le JWT OIDC dans le signInResolver
[ ] Extraire le claim groups
[ ] Injecter les groupes dans les ownershipEntityRefs du token Backstage
[ ] Créer le package rosetta-permissions-common
[ ] Définir les permissions rosetta.finops.*, rosetta.referential.*, rosetta.admin
[ ] Créer le module permission-backend-module-rosetta-policy
[ ] Implémenter RosettaPermissionPolicy
[ ] Lire les groupes AD depuis la config
[ ] Enregistrer la policy via policyExtensionPoint.setPolicy(...)
[ ] Ajouter le plugin permission backend dans packages/backend/src/index.ts
[ ] Ajouter le module Rosetta dans packages/backend/src/index.ts
[ ] Protéger les routes frontend avec RequirePermission
[ ] Protéger les boutons/actions avec usePermission
[ ] Protéger toutes les routes backend sensibles avec permissions.authorize(...)
[ ] Vérifier que le Catalog reste visible pour tous
[ ] Tester avec utilisateur sans rôle, FinOps, Referential, Admin
```

---

## 23. Résumé final

La solution recommandée est :

```txt
JWT OIDC groups
      ↓
signInResolver
      ↓
ownershipEntityRefs Backstage
      ↓
module permission-backend-module-rosetta-policy
      ↓
RosettaPermissionPolicy
      ↓
permissions rosetta.*
      ↓
RequirePermission côté frontend
      ↓
permissions.authorize côté backend
```

On obtient ainsi une gestion propre, modulaire et compatible avec le new backend system de Backstage.

La logique reste limitée à nos modules internes Rosetta, sans impacter les entités du Software Catalog.
