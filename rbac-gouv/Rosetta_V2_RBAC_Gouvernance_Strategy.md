# 🔐 Rosetta V2 – Stratégie RBAC & Gouvernance
## Modèle d’autorisations, rôles AD, périmètres fonctionnels et principes de sécurité

**Auteur :** Youssef Messaoudi  
**Version :** V2 Governance Model  
**Objectif :** Définir la stratégie d’accès, de contrôle et de gouvernance transverse dans Rosetta V2 (Backstage + Microservices).

---

# 1. Principes directeurs

Rosetta V2 repose sur une séparation claire :

- 🔹 **Authentification** : gérée par Backstage via OIDC / SSO entreprise
- 🔹 **Autorisation (RBAC)** : gérée par Rosetta (Backstage + microservices)
- 🔹 **Enforcement final** : toujours côté microservices
- 🔹 **UI gating** : côté Backstage pour l’UX

Principe fondamental :

> Aucune action sensible ne repose uniquement sur l’UI.  
> Les microservices appliquent toujours le contrôle final.

---

# 2. Modèle global d’accès

## 2.1 Sources d’identité

- Active Directory (AD)
- Groupes d’entreprise synchronisés
- Mapping AD → rôles Rosetta

## 2.2 Flux d’authentification

1. Utilisateur → Backstage (OIDC)
2. Backstage récupère :
   - userId
   - email
   - groupes AD
3. Gateway Rosetta transmet :
   - identité
   - groupes
   - token ou claims
4. Microservice valide et applique RBAC

---

# 3. Rôles Rosetta (Modèle standard)

## 3.1 Rôles globaux

### 1️⃣ Rosetta_User
Accès :
- Consultation FinOps
- Consultation Monitoring
- Consultation Référentiel
- Soumission de demandes (création / modification)

Aucune action destructive.

---

### 2️⃣ Rosetta_Referentiel_Admin
Accès :
- Validation des demandes
- CRUD applications / groupes
- Gestion des pivots (Dynatrace, SN, Argo, ELISA)
- Gestion des relations

Responsabilité :
Gouvernance cartographique.

---

### 3️⃣ Rosetta_FinOps_Admin
Accès :
- Lancer batch FinOps
- Recalcul périodes
- Gestion pricing views
- Consultation logs batch
- Modification éventuelle règles FinOps

Responsabilité :
Pilotage financier technique.

---

### 4️⃣ Rosetta_Monitoring_Admin
Accès :
- Lancer batch monitoring
- Gestion mapping monitoring
- Configuration SLO
- Consultation logs ingestion

Responsabilité :
Observabilité & KPIs SRE.

---

### 5️⃣ Rosetta_Admin (Super Admin)
Accès complet :
- Tous modules
- Gestion rôles / policies
- Maintenance technique

---

# 4. Gouvernance par domaine (Option évolutive)

Possibilité future :

- Rôles scoped par domaine ou entité
- Exemple :
  - Rosetta_FinOps_Admin_Open
  - Rosetta_Monitoring_Admin_Natif

Permet délégation locale.

---

# 5. Stratégie d’Authorization – Où s’applique le contrôle ?

## 5.1 Backstage (UI Gating)

- Masquage boutons admin
- Masquage menus sensibles
- Restriction navigation

⚠️ Non suffisant seul.

---

## 5.2 Gateway Backend

- Vérification rôle pour endpoints sensibles
- Logging accès sensibles
- Refus précoce si rôle absent

---

## 5.3 Microservices (Enforcement final)

Chaque microservice :

- Vérifie rôle transmis
- Vérifie périmètre (optionnel : domaine/app)
- Applique contrôle métier

Exemple :
- POST /finops/admin/reprocess → Rosetta_FinOps_Admin obligatoire
- POST /ref/approve → Rosetta_Referentiel_Admin obligatoire

---

# 6. Gouvernance des workflows (Référentiel)

## 6.1 États des demandes

- DRAFT
- PENDING_APPROVAL
- APPROVED
- REJECTED
- DECOMMISSIONED

## 6.2 Règles

- Un utilisateur ne peut approuver sa propre demande
- Toute validation est auditée
- Historique conservé

---

# 7. Gouvernance FinOps

- Batch non déclenchable par User simple
- Recalcul historique journalisé
- Pricing views modifiables uniquement par FinOps Admin
- Historique des versions budgétaires conservé

---

# 8. Gouvernance Monitoring

- SLO modifiables uniquement par Monitoring Admin
- Historisation non supprimable
- DORA calculé automatiquement, non éditable manuellement

---

# 9. Audit & Traçabilité

Chaque action sensible génère :

- userId
- rôle utilisé
- timestamp
- action
- payload résumé

Stocké dans :
- table audit_log dédiée par microservice
- export possible pour audit conformité

---

# 10. Sécurité API & Tokens

## 10.1 Transmission identité

Option 1 (recommandée) :
- JWT OIDC validé par microservices

Option 2 :
- Token exchange + header enrichi

## 10.2 Protection interne

- Services internes protégés par réseau (Kubernetes NetworkPolicy)
- TLS interne
- Secrets via Vault / K8s Secrets

---

# 11. Séparation des responsabilités

| Domaine | Responsable |
|----------|-------------|
| Référentiel | Architecture / Gouvernance |
| FinOps | Équipe FinOps |
| Monitoring | Équipe SRE |
| Backstage | Équipe Plateforme |
| Sécurité | Équipe Sécurité IT |

---

# 12. Gestion des exceptions

- Mode maintenance (Rosetta_Admin uniquement)
- Désactivation temporaire batch
- Verrouillage module en cas d’incident critique

---

# 13. Évolutions futures RBAC

- ABAC (Attribute Based Access Control)
- Scoping par entité / groupe
- Intégration EDC avancée
- Politiques dynamiques (OPA possible)

---

# 14. Résumé stratégique

La stratégie RBAC Rosetta V2 garantit :

- 🔐 Sécurité multi-couches
- 📜 Traçabilité complète
- 🧭 Gouvernance claire par domaine
- ⚖ Séparation des responsabilités
- 🏛 Alignement conformité entreprise

Rosetta devient ainsi une plateforme gouvernée et auditée, adaptée à un environnement bancaire exigeant.
