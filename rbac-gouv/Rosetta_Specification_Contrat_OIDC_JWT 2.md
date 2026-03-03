# Rosetta – Spécification du Contrat d’Authentification & d’Autorisation (OIDC / JWT)

## 1. Objectif du document

Ce document spécifie les besoins de **Rosetta** concernant :

- L’intégration avec un fournisseur d’identité OIDC d’entreprise
- La fédération avec les annuaires Active Directory
- Le contrat JWT attendu
- La définition des rôles applicatifs Rosetta
- Les règles d’autorisation côté microservices

Ce document constitue la **fiche de raccordement IAM** pour Rosetta.

---

# 2. Vue d’ensemble de l’architecture attendue

## 2.1 Principe général


## 2.2 Flux d’authentification « service → service »

Rosetta repose sur **deux types de flux** :

1) **Flux “utilisateur” (interactive)**  
- L’utilisateur s’authentifie sur Backstage (OIDC).  
- Backstage reçoit un **JWT utilisateur** avec des *claims* (identité + rôles/groupes).  
- Backstage appelle les microservices Rosetta en transmettant ce JWT (propagation) **ou** en effectuant un **token exchange** (*on-behalf-of*) si l’IdP le permet.

2) **Flux “technique” (non-interactive)**  
Exemples : batchs nightly, recalculs, freeze/défreeze déclenchés côté admin, jobs planifiés, traitements asynchrones.
- Un **compte technique** (client OIDC) obtient un **JWT technique** via le flow **Client Credentials**.
- Ce JWT est utilisé pour appeler les APIs Rosetta avec des droits limités (scopes/roles “service”).

> Objectif : conserver une séparation claire entre **droits humains** (RBAC) et **droits techniques** (service account), tout en restant simple à opérer.

### 2.2.1 Propagation du token utilisateur (recommandé par défaut)
- Backstage transmet le JWT utilisateur aux microservices (header `Authorization: Bearer …`).
- Chaque microservice vérifie : signature, expiration, `aud`, et **rôles**.
- Avantage : traçabilité “qui a fait quoi” bout-en-bout.
- Variante entreprise : si un microservice doit appeler un autre microservice, **il propage le même JWT utilisateur** (et on garde l’identité de l’utilisateur).

### 2.2.2 Token exchange (optionnel)
- Si l’IdP le propose, un microservice peut échanger un JWT utilisateur contre un JWT “downstream” à audience spécifique.
- Avantage : contrôle fin de l’audience et réduction de surface.
- Inconvénient : complexité IdP.

### 2.2.3 Client credentials pour les batchs et automatisations (obligatoire)
- Les batchs ne doivent **pas** utiliser de token utilisateur.
- Ils utilisent un **client OIDC technique** (service account) + secret/certificat.
- Le JWT technique inclut typiquement :
  - `sub` = identifiant technique,
  - `azp` = client id,
  - `client_id` (selon IdP),
  - un *claim* de **rôle technique** (ex : `rosetta:service`, `rosetta:finops-batch`).


- L’Active Directory reste la source de vérité des utilisateurs et groupes.
- Le fournisseur d’identité OIDC :
  - Authentifie l’utilisateur via AD
  - Récupère ses appartenances groupes
  - Applique un mapping vers des rôles applicatifs Rosetta
  - Émet un JWT signé
- Rosetta (Backstage + microservices) :
  - Consomme le JWT
  - Valide la signature
  - Applique les contrôles RBAC basés sur les rôles présents dans le token

Rosetta ne génère, ne modifie ni ne re-signe aucun token.

---

# 3. Rôles applicatifs Rosetta

Rosetta repose sur un modèle RBAC simple et explicite.

## 3.1 Liste des rôles

| Rôle | Identifiant technique | Description |
|------|----------------------|------------|
| Rosetta User | `rosetta_user` | Accès en lecture à l’ensemble des modules Rosetta |
| Rosetta Admin | `rosetta_admin` | Administration globale de la plateforme |
| Rosetta FinOps Admin | `rosetta_finops_admin` | Administration du module FinOps |
| Rosetta Monitoring Admin | `rosetta_monitoring_admin` | Administration du module Monitoring |
| Rosetta Referential Admin | `rosetta_referential_admin` | Administration du référentiel / catalogues |

## 3.2 Principes

- Les rôles sont cumulatifs.
- Un utilisateur peut avoir plusieurs rôles.
- Les rôles sont portés dans le JWT.
- Les noms techniques doivent rester stables dans le temps.

---

# 4. Mapping attendu (AD → Rôles Rosetta)

Le fournisseur d’identité doit :

1. Récupérer les groupes AD pertinents
2. Mapper ces groupes vers les rôles Rosetta
3. Injecter les rôles dans le JWT

## 4.1 Exemple de mapping

| Groupe AD | Rôle Rosetta |
|------------|--------------|
| GRP_ROSETTA_USERS | rosetta_user |
| GRP_ROSETTA_ADMIN | rosetta_admin |
| GRP_ROSETTA_FINOPS_ADMIN | rosetta_finops_admin |
| GRP_ROSETTA_MONITORING_ADMIN | rosetta_monitoring_admin |
| GRP_ROSETTA_REFERENTIAL_ADMIN | rosetta_referential_admin |

La gestion des DN / CN / OU reste interne au fournisseur d’identité.

## 4.2 Comptes techniques (service accounts) et rôles techniques

En plus des rôles “humains”, Rosetta a besoin d’au moins **un rôle technique** pour exécuter les batchs et automatisations.

### Rôle technique minimal (pour démarrer)
- `rosetta_service` : rôle “service account” permettant :
  - exécuter/relancer des batchs (FinOps/Monitoring),
  - opérer les actions d’admin technique (freeze/défreeze si piloté par batch),
  - rafraîchir des vues matérialisées si cette action est exposée par API.

### Mapping côté IdP
Deux options acceptables :
1) **Client OIDC dédié** dont le JWT contient `roles: ["rosetta_service"]`  
2) Groupe AD technique mappé vers `rosetta_service` (si votre IdP gère des “users techniques” via AD)

> Pour la V1/V2 bêta en environnement dev, on privilégie l’option 1 (client credentials), plus simple et plus proche des patterns Kubernetes.



---

# 5. Contrat JWT attendu

## 5.1 Format général

Rosetta attend un JWT signé (RS256 ou équivalent), conforme OIDC.

## 5.2 Claims obligatoires

| Claim | Description |
|--------|------------|
| iss | Issuer du fournisseur d’identité |
| sub | Identifiant unique utilisateur |
| aud | Audience correspondant au client Rosetta |
| exp | Date d’expiration |
| iat | Date d’émission |
| preferred_username | Identifiant lisible |
| roles ou groups | Liste des rôles Rosetta |

## 5.3 Claim des rôles

Deux formats acceptables :

### Option A (recommandée)
```json
"roles": [
  "rosetta_user",
  "rosetta_finops_admin"
]
```

### Option B
```json
"groups": [
  "rosetta_user",
  "rosetta_finops_admin"
]
```

Rosetta doit connaître explicitement le nom du claim utilisé.

---

# 6. Claims complémentaires souhaités

| Claim | Utilité |
|--------|--------|
| email | Contact utilisateur |
| given_name | Prénom |
| family_name | Nom |
| entity | Entité / tenant (si multi-entité futur) |
| scope | Scopes applicatifs si nécessaires |

---

# 7. Clients OIDC attendus

Les clients suivants doivent être configurés :

## 7.1 Client Frontend (Backstage)
- Type : Confidential
- Flow : Authorization Code
- Redirect URI : URL Rosetta Backstage
- Audience : Rosetta APIs

## 7.2 Client APIs Rosetta
- Type : Resource Server
- Vérification signature via JWKS
- Audience validée

## 7.3 Client Service Account (optionnel)
- Pour batchs ou traitements automatisés
- Flow : Client Credentials

---

# 8. Sécurité côté Rosetta


## 8.1 Simplification recommandée pour démarrer (environnement DEV / intégration)

Pour limiter la complexité au lancement (et éviter de multiplier les secrets), Rosetta accepte une approche “**un client technique unique**” :

- **Un seul client OIDC technique** (ex : `rosetta-service-dev`)
- Un **seul secret** (ou paire cert/clé) géré dans Vault / Kubernetes Secret
- Utilisé par :
  - Backstage backend (Gateway interne) lorsqu’il déclenche des opérations techniques,
  - les batchs Quarkus (FinOps Batch / Monitoring Batch),
  - tout job planifié (CronJob Kubernetes si utilisé).

Ce client porte le rôle `rosetta_service` (cf. §4.2) et des scopes restreints.

### Évolution cible (production / durcissement)
Dès que l’industrialisation est stabilisée, on évolue vers :
- 1 client technique **par service** (principe du moindre privilège)  
  ex : `finops-batch`, `monitoring-batch`, `gov-audit-writer`, etc.
- séparation des secrets et rotation indépendante
- `aud` spécifique par API quand possible



Les microservices Rosetta :

- Vérifient la signature JWT
- Vérifient l’audience
- Lisent le claim `roles` ou `groups`
- Appliquent les annotations de sécurité (ex: @RolesAllowed)

Rosetta ne :
- Ne transforme pas les groupes AD
- Ne contacte pas l’AD directement
- Ne modifie pas le JWT

---

# 9. Durée de vie des tokens

Recommandations :

- Access Token : 5 à 15 minutes
- Refresh Token : selon politique entreprise
- Support refresh côté Frontend

---

# 10. Journalisation & Audit

Le fournisseur d’identité doit permettre :

- Audit des authentifications
- Audit des émissions de token
- Traçabilité des appartenances groupes

---

# 11. Résumé des attentes Rosetta

Rosetta attend :

1. Un JWT signé OIDC standard
2. Un claim stable contenant les rôles Rosetta
3. Un mapping AD → rôles effectué côté fournisseur d’identité
4. Une validation audience & issuer cohérente
5. Une configuration multi-environnement (dev / preprod / prod)

---

# 12. Évolutions possibles

À anticiper :

- Multi-tenant / multi-entités
- ABAC futur (permissions fines)
- Scope par module
- Policy-based authorization

---

Fin du document.


---

> Document mis à jour le 2026-03-03 15:33 (ajout des contrats service accounts)
