# Backstage — Gestion des accès par groupes AD récupérés depuis le JWT OIDC

## Objectif

Mettre en place une logique d’accès dans Backstage basée sur les groupes AD présents dans l’`id_token` OIDC.

Exemple cible :

- Le token OIDC contient une propriété `groups`.
- Chaque groupe AD est mappé vers un rôle fonctionnel Backstage.
- Le resolver OIDC ajoute ces rôles dans l’identité Backstage.
- Le backend Backstage applique les règles d’autorisation via une `PermissionPolicy`.
- Le frontend masque ou bloque les fonctionnalités selon les permissions.

---

## 1. Principe général

Le flux recommandé est le suivant :

```text
Utilisateur connecté
        │
        ▼
OIDC Provider / AD
        │
        ▼
ID Token JWT avec claim groups
        │
        ▼
Backstage signInResolver
        │
        ▼
Mapping groupe AD → rôle Backstage
        │
        ▼
Backstage token avec ownershipEntityRefs
        │
        ▼
PermissionPolicy
        │
        ▼
ALLOW / DENY
        │
        ├── Backend : protège vraiment les APIs
        └── Frontend : masque ou bloque les écrans/actions
```

Point important : le frontend ne doit jamais être la seule protection.  
Il sert à améliorer l’expérience utilisateur, mais la vraie sécurité doit être côté backend via le système de permissions Backstage.

---

## 2. Déclarer les groupes AD dans `app-config.yaml`

Tu peux déclarer tes groupes AD dans la configuration Backstage.

Exemple :

```yaml
rosetta:
  permissions:
    roles:
      admin:
        adGroups:
          - "CN=BACKSTAGE_ADMIN,OU=Groups,DC=example,DC=com"
          - "BACKSTAGE_ADMIN"
      finops:
        adGroups:
          - "CN=ROSETTA_FINOPS,OU=Groups,DC=example,DC=com"
          - "ROSETTA_FINOPS"
      referential:
        adGroups:
          - "CN=ROSETTA_REFERENTIAL,OU=Groups,DC=example,DC=com"
          - "ROSETTA_REFERENTIAL"
```

Tu peux adapter selon le format réel du claim `groups`.

Parfois le token contient :

```json
{
  "groups": [
    "ROSETTA_FINOPS",
    "ROSETTA_REFERENTIAL"
  ]
}
```

Parfois il contient des DN LDAP :

```json
{
  "groups": [
    "CN=ROSETTA_FINOPS,OU=Groups,DC=example,DC=com"
  ]
}
```

Parfois Azure / Entra ID renvoie plutôt des IDs de groupes :

```json
{
  "groups": [
    "7f3a2b1c-xxxx-xxxx-xxxx-xxxxxxxx"
  ]
}
```

Dans ce cas, tu dois mapper les IDs de groupes dans la configuration.

---

## 3. Définir des rôles Backstage internes

L’idée est de transformer les groupes AD en rôles Backstage simples.

Exemple :

| Rôle fonctionnel | Groupe AD | Rôle Backstage interne |
|---|---|---|
| Admin | `BACKSTAGE_ADMIN` | `group:default/rosetta-admin` |
| FinOps | `ROSETTA_FINOPS` | `group:default/rosetta-finops` |
| Référentiel | `ROSETTA_REFERENTIAL` | `group:default/rosetta-referential` |

Pourquoi utiliser `group:default/...` ?

Parce que Backstage manipule déjà les appartenances via des `ownershipEntityRefs`, par exemple :

```ts
[
  'user:default/youssef',
  'group:default/rosetta-finops',
  'group:default/rosetta-admin'
]
```

Ensuite, dans la `PermissionPolicy`, tu peux vérifier si l’utilisateur possède tel rôle.

---

## 4. Typer le JWT décodé

Dans ton resolver OIDC, tu peux typer seulement les propriétés utiles.

```ts
interface RosettaIdToken {
  sub: string;
  email?: string;
  preferred_username?: string;
  samAccountName?: string;
  groups?: string[];
}
```

Puis :

```ts
const decodedIdToken = jwtDecode<RosettaIdToken>(idToken);

const jwtGroups = decodedIdToken.groups ?? [];
```

Tu n’es pas obligé de déclarer tous les claims du token.

---

## 5. Mapper les groupes AD vers des rôles Backstage

Exemple de fonction utilitaire :

```ts
import { Config } from '@backstage/config';

type RoleName = 'admin' | 'finops' | 'referential';

const ROLE_ENTITY_REFS: Record<RoleName, string> = {
  admin: 'group:default/rosetta-admin',
  finops: 'group:default/rosetta-finops',
  referential: 'group:default/rosetta-referential',
};

export function resolveRolesFromAdGroups(
  config: Config,
  jwtGroups: string[],
): string[] {
  const normalizedJwtGroups = new Set(
    jwtGroups.map(group => group.trim().toLowerCase()),
  );

  const rolesConfig = config.getConfig('rosetta.permissions.roles');

  const resolvedRoleRefs: string[] = [];

  for (const role of Object.keys(ROLE_ENTITY_REFS) as RoleName[]) {
    const adGroups =
      rolesConfig.getOptionalStringArray(`${role}.adGroups`) ?? [];

    const hasRole = adGroups.some(adGroup =>
      normalizedJwtGroups.has(adGroup.trim().toLowerCase()),
    );

    if (hasRole) {
      resolvedRoleRefs.push(ROLE_ENTITY_REFS[role]);
    }
  }

  return resolvedRoleRefs;
}
```

---

## 6. Adapter le `signInResolver`

Exemple simplifié dans ton module OIDC :

```ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import { createOAuthProviderFactory } from '@backstage/plugin-auth-node';
import { stringifyEntityRef, DEFAULT_NAMESPACE } from '@backstage/catalog-model';
import { jwtDecode } from 'jwt-decode';
import { resolveRolesFromAdGroups } from './resolveRolesFromAdGroups';

interface RosettaIdToken {
  sub: string;
  email?: string;
  preferred_username?: string;
  samAccountName?: string;
  groups?: string[];
}

export const authModuleRosettaOidc = createBackendModule({
  pluginId: 'auth',
  moduleId: 'rosetta-oidc',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ providers, config }) {
        providers.registerProvider({
          providerId: 'rosetta',
          factory: createOAuthProviderFactory({
            authenticator: rosettaAuthenticator,
            async signInResolver(info, ctx) {
              const userinfo = info.result.fullProfile.userinfo as any;
              const idToken = info.result.session.idToken as string;

              const decodedIdToken = jwtDecode<RosettaIdToken>(idToken);

              const login =
                userinfo.preferred_username ??
                userinfo.samAccountName ??
                userinfo.email?.split('@')[0] ??
                decodedIdToken.preferred_username ??
                decodedIdToken.email?.split('@')[0] ??
                decodedIdToken.sub;

              if (!login) {
                throw new Error('Unable to resolve user login from OIDC token');
              }

              const userName = String(login).toLowerCase();

              const userEntityRef = stringifyEntityRef({
                kind: 'User',
                namespace: DEFAULT_NAMESPACE,
                name: userName,
              });

              const jwtGroups = decodedIdToken.groups ?? [];

              const roleEntityRefs = resolveRolesFromAdGroups(
                config,
                jwtGroups,
              );

              const ownershipEntityRefs = [
                userEntityRef,
                ...roleEntityRefs,
              ];

              return ctx.issueToken({
                claims: {
                  sub: userEntityRef,
                  ent: ownershipEntityRefs,
                },
              });
            },
          }),
        });
      },
    });
  },
});
```

> À adapter selon ton code exact, car les imports peuvent varier selon ta version Backstage et ton provider OIDC.

---

## 7. Déclarer les permissions du plugin FinOps

Pour protéger une fonctionnalité custom, commence par déclarer une permission.

Exemple dans un package commun du plugin :

```ts
// plugins/rosetta-finops-common/src/permissions.ts

import { createPermission } from '@backstage/plugin-permission-common';

export const rosettaFinopsReadPermission = createPermission({
  name: 'rosetta.finops.read',
  attributes: {
    action: 'read',
  },
});

export const rosettaFinopsManagePermission = createPermission({
  name: 'rosetta.finops.manage',
  attributes: {
    action: 'update',
  },
});

export const rosettaFinopsPermissions = [
  rosettaFinopsReadPermission,
  rosettaFinopsManagePermission,
];
```

Exemples de permissions :

| Permission | Usage |
|---|---|
| `rosetta.finops.read` | Voir la page FinOps |
| `rosetta.finops.manage` | Importer des fichiers, recalculer des coûts, modifier les profils |
| `rosetta.referential.read` | Voir le référentiel |
| `rosetta.referential.manage` | Modifier le référentiel |
| `rosetta.admin.access` | Accès administration Backstage/Rosetta |

---

## 8. Écrire la `PermissionPolicy`

Créer ou modifier :

```text
packages/backend/src/extensions/permissionsPolicyExtension.ts
```

Exemple complet :

```ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  PolicyDecision,
  isPermission,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';

import {
  rosettaFinopsReadPermission,
  rosettaFinopsManagePermission,
} from '@internal/plugin-rosetta-finops-common';

const ROLE_ADMIN = 'group:default/rosetta-admin';
const ROLE_FINOPS = 'group:default/rosetta-finops';
const ROLE_REFERENTIAL = 'group:default/rosetta-referential';

function hasRole(user: PolicyQueryUser | undefined, role: string): boolean {
  return user?.info.ownershipEntityRefs?.includes(role) ?? false;
}

function hasOneRole(
  user: PolicyQueryUser | undefined,
  roles: string[],
): boolean {
  return roles.some(role => hasRole(user, role));
}

class RosettaPermissionPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const isAdmin = hasRole(user, ROLE_ADMIN);

    if (isAdmin) {
      return { result: AuthorizeResult.ALLOW };
    }

    if (isPermission(request.permission, rosettaFinopsReadPermission)) {
      return hasOneRole(user, [ROLE_FINOPS])
        ? { result: AuthorizeResult.ALLOW }
        : { result: AuthorizeResult.DENY };
    }

    if (isPermission(request.permission, rosettaFinopsManagePermission)) {
      return hasOneRole(user, [ROLE_FINOPS])
        ? { result: AuthorizeResult.ALLOW }
        : { result: AuthorizeResult.DENY };
    }

    return { result: AuthorizeResult.DENY };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'rosetta-permission-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
      },
      async init({ policy }) {
        policy.setPolicy(new RosettaPermissionPolicy());
      },
    });
  },
});
```

Dans `packages/backend/src/index.ts` :

```ts
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('./extensions/permissionsPolicyExtension'));
```

Et dans `app-config.yaml` :

```yaml
permission:
  enabled: true
```

Important : si tu as encore le module `allow-all-policy`, il faut le retirer, sinon il peut court-circuiter ta politique personnalisée.

---

## 9. Protéger une route backend FinOps

Exemple dans ton plugin backend `rosetta-finops-backend`.

```ts
import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import Router from 'express-promise-router';

import {
  rosettaFinopsReadPermission,
  rosettaFinopsManagePermission,
} from '@internal/plugin-rosetta-finops-common';

export const rosettaFinopsPlugin = createBackendPlugin({
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
            throw new NotAllowedError('Not allowed to read FinOps data');
          }

          res.json({
            message: 'FinOps costs data',
          });
        });

        router.post('/recalculate', async (req, res) => {
          const credentials = await httpAuth.credentials(req);

          const [decision] = await permissions.authorize(
            [{ permission: rosettaFinopsManagePermission }],
            { credentials },
          );

          if (decision.result !== AuthorizeResult.ALLOW) {
            throw new NotAllowedError('Not allowed to manage FinOps data');
          }

          res.json({
            message: 'Recalculation started',
          });
        });

        httpRouter.use(router);
      },
    });
  },
});
```

Avec ça :

- même si quelqu’un appelle directement `/api/rosetta-finops/recalculate`,
- même si le bouton est caché côté frontend,
- même si l’utilisateur manipule le navigateur,

le backend refuse l’action si la permission n’est pas accordée.

---

## 10. Protéger une page frontend complète

Exemple : protéger la page FinOps.

```tsx
// packages/app/src/App.tsx

import { RequirePermission } from '@backstage/plugin-permission-react';
import { rosettaFinopsReadPermission } from '@internal/plugin-rosetta-finops-common';

<Route
  path="/rosetta-finops"
  element={
    <RequirePermission permission={rosettaFinopsReadPermission}>
      <RosettaFinopsPage />
    </RequirePermission>
  }
/>
```

Si l’utilisateur n’a pas `rosetta.finops.read`, la page ne s’affiche pas.

Tu peux aussi fournir une page d’erreur custom :

```tsx
<RequirePermission
  permission={rosettaFinopsReadPermission}
  errorPage={<PermissionDeniedPage />}
>
  <RosettaFinopsPage />
</RequirePermission>
```

---

## 11. Protéger un bouton ou une action frontend

Exemple : afficher le bouton “Recalculer les coûts” seulement si l’utilisateur a le droit de gérer FinOps.

```tsx
import { Button } from '@material-ui/core';
import { usePermission } from '@backstage/plugin-permission-react';
import { rosettaFinopsManagePermission } from '@internal/plugin-rosetta-finops-common';

export function RecalculateCostsButton() {
  const { loading, allowed } = usePermission({
    permission: rosettaFinopsManagePermission,
  });

  if (loading) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        // appel API backend /recalculate
      }}
    >
      Recalculer les coûts
    </Button>
  );
}
```

Variante : bouton visible mais désactivé.

```tsx
<Button
  variant="contained"
  color="primary"
  disabled={!allowed}
>
  Recalculer les coûts
</Button>
```

---

## 12. Protéger un menu sidebar

Exemple :

```tsx
import { SidebarItem } from '@backstage/core-components';
import { usePermission } from '@backstage/plugin-permission-react';
import AssessmentIcon from '@material-ui/icons/Assessment';
import { rosettaFinopsReadPermission } from '@internal/plugin-rosetta-finops-common';

export function FinopsSidebarItem() {
  const { loading, allowed } = usePermission({
    permission: rosettaFinopsReadPermission,
  });

  if (loading || !allowed) {
    return null;
  }

  return (
    <SidebarItem
      icon={AssessmentIcon}
      to="rosetta-finops"
      text="FinOps"
    />
  );
}
```

---

## 13. Exemple complet : rôle FinOps de A à Z

### Étape 1 — Configuration

```yaml
rosetta:
  permissions:
    roles:
      finops:
        adGroups:
          - "ROSETTA_FINOPS"
```

### Étape 2 — Token JWT

```json
{
  "preferred_username": "ymessaoudi",
  "email": "youssef@example.com",
  "groups": [
    "ROSETTA_FINOPS"
  ]
}
```

### Étape 3 — Resolver

Le resolver détecte `ROSETTA_FINOPS` et ajoute :

```ts
'group:default/rosetta-finops'
```

dans :

```ts
ownershipEntityRefs
```

### Étape 4 — PermissionPolicy

```ts
if (isPermission(request.permission, rosettaFinopsReadPermission)) {
  return hasRole(user, 'group:default/rosetta-finops')
    ? { result: AuthorizeResult.ALLOW }
    : { result: AuthorizeResult.DENY };
}
```

### Étape 5 — Frontend

```tsx
<RequirePermission permission={rosettaFinopsReadPermission}>
  <RosettaFinopsPage />
</RequirePermission>
```

### Étape 6 — Backend

```ts
const [decision] = await permissions.authorize(
  [{ permission: rosettaFinopsReadPermission }],
  { credentials },
);

if (decision.result !== AuthorizeResult.ALLOW) {
  throw new NotAllowedError('Not allowed');
}
```

Résultat :

| Utilisateur | Groupe AD | Rôle Backstage | Accès page FinOps | Accès API FinOps |
|---|---|---|---|---|
| Youssef | `ROSETTA_FINOPS` | `group:default/rosetta-finops` | Oui | Oui |
| Autre user | Aucun | Aucun | Non | Non |
| Admin | `BACKSTAGE_ADMIN` | `group:default/rosetta-admin` | Oui | Oui |

---

## 14. Variante avec groupes catalogués dans Backstage

Si tu veux être plus aligné avec Backstage, tu peux créer de vraies entités `Group` dans le Software Catalog :

```yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: rosetta-finops
spec:
  type: team
  profile:
    displayName: Rosetta FinOps
  children: []
```

Et éventuellement :

```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: ymessaoudi
spec:
  profile:
    displayName: Youssef Messaoudi
    email: youssef@example.com
  memberOf:
    - rosetta-finops
```

Mais si tu récupères déjà les groupes depuis le JWT, tu peux aussi injecter directement les rôles dans `ent`.

Le mieux à terme :

- AD / LDAP / Entra ID = source de vérité des groupes ;
- Backstage Catalog = représentation lisible des groupes ;
- Resolver OIDC = mapping d’identité ;
- PermissionPolicy = décision d’autorisation.

---

## 15. Recommandation d’architecture

Pour ton cas Rosetta / Backstage / CAGIP, je recommande :

```text
app-config.yaml
  └── mapping rôles fonctionnels → groupes AD

authModuleRosettaOidc
  └── decode JWT
  └── récupère groups
  └── mappe vers group:default/rosetta-xxx
  └── issueToken avec ent

plugin-rosetta-finops-common
  └── déclare rosetta.finops.read
  └── déclare rosetta.finops.manage

permissionsPolicyExtension.ts
  └── admin = accès total
  └── finops = accès FinOps
  └── referential = accès référentiel
  └── deny par défaut

rosetta-finops-backend
  └── vérifie permissions.authorize() sur chaque endpoint sensible

rosetta-finops-frontend
  └── RequirePermission sur la route
  └── usePermission sur les boutons/actions
```

---

## 16. Bonnes pratiques

### 16.1 Ne pas faire confiance uniquement au frontend

Mauvais :

```tsx
if (user.groups.includes('ROSETTA_FINOPS')) {
  return <Button>Recalculer</Button>;
}
```

Correct :

```tsx
const { allowed } = usePermission({
  permission: rosettaFinopsManagePermission,
});
```

Et côté backend :

```ts
await permissions.authorize(...)
```

### 16.2 Mettre un `DENY` par défaut

Pour une logique stricte :

```ts
return { result: AuthorizeResult.DENY };
```

Cela évite d’exposer par erreur une nouvelle permission.

### 16.3 Garder les noms de permissions stables

Évite de renommer souvent :

```ts
rosetta.finops.read
rosetta.finops.manage
```

Ces noms deviennent des contrats entre frontend, backend et policy.

### 16.4 Séparer les rôles des permissions

Un rôle n’est pas une permission.

Exemple :

```text
Rôle : rosetta-finops
Permissions :
  - rosetta.finops.read
  - rosetta.finops.manage
```

Ça te permet ensuite de changer les droits d’un rôle sans changer le resolver.

### 16.5 Éviter de mettre toute la logique dans le resolver

Le resolver doit faire :

```text
Groupes AD → rôles Backstage
```

La policy doit faire :

```text
Rôles Backstage → permissions Backstage
```

C’est plus propre et maintenable.

---

## 17. Checklist d’implémentation

### Auth / OIDC

- [ ] Décoder le `id_token`.
- [ ] Vérifier le nom exact du claim : `groups`, `roles`, `wids`, etc.
- [ ] Ajouter une interface TypeScript minimale.
- [ ] Récupérer `decodedIdToken.groups ?? []`.
- [ ] Mapper les groupes AD vers des rôles Backstage.
- [ ] Ajouter ces rôles dans `ownershipEntityRefs`.
- [ ] Émettre le token Backstage avec `ctx.issueToken`.

### Permissions backend

- [ ] Activer `permission.enabled: true`.
- [ ] Ajouter `@backstage/plugin-permission-backend`.
- [ ] Supprimer `allow-all-policy`.
- [ ] Créer `permissionsPolicyExtension.ts`.
- [ ] Implémenter `RosettaPermissionPolicy`.
- [ ] Faire un `DENY` par défaut.

### Plugin FinOps

- [ ] Créer `rosettaFinopsReadPermission`.
- [ ] Créer `rosettaFinopsManagePermission`.
- [ ] Protéger les routes backend avec `permissions.authorize`.
- [ ] Protéger la route frontend avec `RequirePermission`.
- [ ] Protéger les boutons avec `usePermission`.

### Tests

- [ ] User sans groupe : accès refusé.
- [ ] User avec groupe FinOps : accès FinOps OK.
- [ ] User avec groupe Referential : accès référentiel OK.
- [ ] User admin : accès total.
- [ ] Appel direct API sans droit : HTTP 403.
- [ ] Bouton frontend masqué ou désactivé sans droit.

---

## 18. Exemple de structure de fichiers

```text
packages/
  backend/
    src/
      index.ts
      extensions/
        permissionsPolicyExtension.ts

plugins/
  rosetta-finops/
    src/
      plugin.ts
      routes.tsx
      components/
        RecalculateCostsButton.tsx

  rosetta-finops-backend/
    src/
      plugin.ts

  rosetta-finops-common/
    src/
      permissions.ts
      index.ts
```

---

## 19. Sources Backstage utiles

- Backstage — Sign-in identities and resolvers  
  https://backstage.io/docs/auth/identity-resolver

- Backstage — Permissions getting started  
  https://backstage.io/docs/permissions/getting-started/

- Backstage — Writing a permission policy  
  https://backstage.io/docs/permissions/writing-a-policy/

- Backstage — Frontend integration  
  https://backstage.io/docs/permissions/frontend-integration/

- Backstage — `RequirePermission` / `usePermission`  
  https://backstage.io/docs/reference/plugin-permission-react

- Backstage — Permissions service côté backend  
  https://backstage.io/docs/backend-system/core-services/permissions

---

## 20. Résumé final

La bonne approche est :

```text
AD groups dans le JWT
        ↓
Mapping dans le signInResolver
        ↓
Rôles Backstage dans ownershipEntityRefs
        ↓
PermissionPolicy centralisée
        ↓
Contrôles backend obligatoires
        ↓
Contrôles frontend pour l’UX
```

Pour un premier rôle FinOps :

```text
Groupe AD : ROSETTA_FINOPS
Rôle Backstage : group:default/rosetta-finops
Permission lecture : rosetta.finops.read
Permission gestion : rosetta.finops.manage
Frontend : RequirePermission + usePermission
Backend : permissions.authorize()
Policy : ALLOW si user contient group:default/rosetta-finops
```
