# Rosetta V2 — Spécifications Authentification & Autorisation (OIDC / AD / Microservices)

> Document technique décrivant le fonctionnement complet de l’authentification OIDC dans Rosetta V2, depuis Backstage jusqu’aux microservices, incluant les appels batch, cron et machine-to-machine.

---

# 1. Contexte & Terminologie

## 1.1 Composants

- Utilisateur : collaborateur authentifié via le serveur AD.
- Serveur AD (HELEX) : annuaire d’entreprise retournant les groupes au format CN=XXX,OU=YYY,...
- OIDC Provider : composant exposant OpenID Connect (connecté au serveur AD).
- Backstage (Rosetta Portal) : portail front + backend.
- Microservices Rosetta :
  - FinOps API
  - Monitoring API
  - Référentiel API
  - Rosetta Gov API
- Batch / Cron Jobs : processus planifiés sans utilisateur.
- ELISA : solution logs (corrélation technique).

---

# 2. Architecture de Sécurité Globale

## 2.1 Modèle retenu

- Authentification centralisée via OIDC
- Validation des tokens dans chaque microservice
- Propagation des tokens utilisateur
- Utilisation de Client Credentials Flow pour les appels machine-to-machine
- Journalisation centralisée via Rosetta Gov

Principe clé :
Aucun microservice ne fait confiance à Backstage implicitement. Chaque service valide le JWT.

---

# 3. Authentification Utilisateur (Login Flow)

## 3.1 Étapes Fonctionnelles

1. L’utilisateur accède à Rosetta (Backstage).
2. Backstage redirige vers l’OIDC Provider.
3. L’OIDC Provider authentifie via le Serveur AD (HELEX).
4. Le Serveur AD retourne les groupes au format :
   - CN=Rosetta_Admin,...
   - CN=Rosetta_FinOps_Admin,...
5. L’OIDC Provider génère :
   - ID Token (JWT)
   - Access Token (JWT)
6. Backstage valide le token et crée une session.

---

## 3.2 Contenu du Token (JWT)

Le Access Token contient typiquement :

- sub : identifiant utilisateur
- email
- groups : liste des CN retournés par HELEX
- roles (si mapping côté IdP)
- iss : issuer
- aud : audience
- exp : expiration
- iat
- signature

---

# 4. Propagation des Tokens vers les Microservices

## 4.1 Principe

Backstage backend agit comme passerelle :
- Reçoit requête frontend
- Ajoute header :
  Authorization: Bearer <access_token>

---

## 4.2 Validation côté Quarkus

Chaque microservice est configuré avec :

- quarkus.oidc.auth-server-url
- quarkus.oidc.client-id
- quarkus.oidc.token.audience

À réception :
1. Vérification signature JWT
2. Vérification expiration
3. Vérification audience
4. Extraction groupes CN

---

## 4.3 Mapping des Groupes HELEX

Exemple :
- CN=Rosetta_Admin → ROLE_PLATFORM_ADMIN
- CN=Rosetta_FinOps_Admin → ROLE_FINOPS_ADMIN
- CN=Rosetta_User → ROLE_USER

---

# 5. Communication Inter-Microservices (User Context)

## 5.1 Option recommandée : Propagation du Token

FinOps API appelle Monitoring API avec :
Authorization: Bearer <user_token>

Chaque service valide le token indépendamment.

---

## 5.2 Alternative : Service Account + User Context

FinOps appelle Monitoring avec :
- token machine (client credentials)
- header X-User-Context

Monitoring valide le token machine et journalise l’utilisateur initiateur.

---

# 6. Appels Batch / Cron / Scheduler

## 6.1 Absence d’utilisateur

Utilisation du OAuth2 Client Credentials Flow

---

## 6.2 Étapes Techniques

1. Batch possède client_id et client_secret
2. Appel token endpoint OIDC avec grant_type=client_credentials
3. OIDC retourne Access Token machine
4. Batch appelle API cible avec Authorization: Bearer <machine_token>

---

## 6.3 Contenu Token Machine

- sub : finops-batch
- roles : SERVICE_ACCOUNT

Audit :
- actor_type = SYSTEM
- actor_service = finops-batch
- trigger = CRON

---

# 7. Bonnes Pratiques

- Access Token court (5–15 min)
- Rotation secrets Kubernetes
- Validation JWT obligatoire dans chaque service
- Correlation_id propagé dans tous les appels

---

# 8. Résumé

- Authentification via OIDC connecté au Serveur AD (HELEX)
- Propagation JWT utilisateur
- Validation indépendante dans chaque microservice
- Client credentials pour batch
- Journalisation centralisée via Rosetta Gov

Fin du document.
