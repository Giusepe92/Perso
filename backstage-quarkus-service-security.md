# Sécurisation Backstage → Microservices Quarkus (Service Account Pattern)

## 🎯 Objectif

Mettre en place une sécurisation simple et robuste des appels backend
Backstage → microservices Quarkus, en utilisant un **Service Account
(Client Credentials)** dans Keycloak.

-   Tous les appels aux microservices doivent être refusés sans JWT
    valide.
-   Backstage backend s'authentifie via `client_credentials`.
-   L'identité utilisateur peut être transmise pour audit (optionnel).
-   Architecture évolutive vers Token Exchange plus tard si nécessaire.

------------------------------------------------------------------------

# 1️⃣ Configuration Keycloak

## 1.1 Créer un client service

Realm : `corp`\
Client ID : `backstage-service`\
Protocol : `openid-connect`

### Paramètres :

-   Client authentication : ON
-   Standard Flow : OFF
-   Direct Access Grants : OFF
-   Service Accounts Enabled : ON
-   Authorization : OFF

## 1.2 Récupérer le secret

Clients → backstage-service → Credentials\
Copier le **Client Secret** (à stocker en secret K8s / GitLab CI /
Vault).

## 1.3 (Optionnel) Ajouter un rôle technique

Créer un rôle Realm :

-   `backstage-caller`

Puis :

Clients → backstage-service → Service Account Roles → assigner
`backstage-caller`

------------------------------------------------------------------------

# 2️⃣ Configuration Backstage Backend

## 2.1 Configuration app-config.yaml

``` yaml
integrations:
  keycloak:
    issuer: http://localhost:8888/realms/corp
    tokenUrl: http://localhost:8888/realms/corp/protocol/openid-connect/token
    clientId: backstage-service
    clientSecret: ${KEYCLOAK_BACKSTAGE_SERVICE_SECRET}
```

## 2.2 Implémenter un Token Manager (avec cache)

Logique :

-   POST vers tokenUrl avec grant_type=client_credentials
-   Stocker access_token + expires_in
-   Réutiliser le token jusqu'à expiration - 60s

## 2.3 Ajouter le header lors des appels microservices

    Authorization: Bearer <service_token>

## 2.4 (Optionnel) Propagation audit utilisateur

Ajouter en headers :

    X-Backstage-User: user:default/<username>
    X-Backstage-Groups: group:default/backstage-admin

⚠️ À utiliser uniquement pour audit, pas pour autorisation.

------------------------------------------------------------------------

# 3️⃣ Configuration Microservices Quarkus

## 3.1 Config OIDC (application.properties)

``` properties
quarkus.oidc.auth-server-url=http://localhost:8888/realms/corp
quarkus.oidc.application-type=service

quarkus.http.auth.permission.authenticated.paths=/*
quarkus.http.auth.permission.authenticated.policy=authenticated
```

## 3.2 Vérifier que seul backstage-service est accepté

Option simple : vérifier claim `azp == backstage-service`

Option propre :

    @RolesAllowed("backstage-caller")

------------------------------------------------------------------------

# 4️⃣ Sécurisation Réseau

-   Microservices accessibles uniquement en réseau interne
-   Pas d'exposition publique directe
-   Idéalement : service mesh / ingress restreint

------------------------------------------------------------------------

# 5️⃣ Tests

## 5.1 Récupérer un token service

``` bash
curl -X POST "http://localhost:8888/realms/corp/protocol/openid-connect/token"   -H "Content-Type: application/x-www-form-urlencoded"   -d "grant_type=client_credentials"   -d "client_id=backstage-service"   -d "client_secret=<SECRET>"
```

## 5.2 Test microservice

Sans token → 401\
Avec token → 200

------------------------------------------------------------------------

# 6️⃣ Déploiement

-   Stocker le secret en Secret Kubernetes
-   Injecter en variable d'environnement
-   Mettre en place rotation si nécessaire

------------------------------------------------------------------------

# 7️⃣ Évolution future

Quand besoin RBAC fin par utilisateur :

-   Implémenter Token Exchange (On-Behalf-Of)
-   Microservices valident tokens user
-   Gestion fine des rôles/groupes AD

------------------------------------------------------------------------

# ✅ Checklist

-   [ ] Client Keycloak service créé
-   [ ] Secret sécurisé
-   [ ] Token manager backend implémenté
-   [ ] Header Authorization propagé
-   [ ] Quarkus configuré OIDC
-   [ ] Tests 401/200 validés
-   [ ] Services non exposés publiquement
