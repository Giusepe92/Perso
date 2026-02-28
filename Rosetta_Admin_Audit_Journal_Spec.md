# Spécification Fonctionnelle & Technique – Journal d’Audit Admin (Rosetta V2)

## 1. Objectif

Mettre à disposition, dans Rosetta (Backstage), une page **Journal d’Audit Admin** permettant au **Super Admin** (et uniquement lui) de consulter l’historique des actions sensibles réalisées sur la plateforme.

Ce journal vise à :
- rendre les opérations administratives **auditables**,
- faciliter l’investigation (qui a fait quoi, quand, avec quel résultat),
- offrir une vue unifiée des événements critiques (FinOps / Référentiel / Monitoring / RBAC),
- **compléter** (et non remplacer) la centralisation ELISA/Kibana.

---

# 2. Positionnement (UI vs ELISA)

Le journal UI n’a pas vocation à remplacer ELISA (logs techniques).

✅ UI Audit Journal = **journal métier / gouvernance**
- action, auteur, cible, statut, contexte
- filtrable, lisible, exportable

✅ ELISA = **logs techniques détaillés**
- stacktraces, logs bas niveau, timings détaillés, debug

Le Journal UI pointe vers ELISA via des liens (run_id, correlation_id), sans y dupliquer le détail.

---

# 3. Périmètre des événements auditables

Le journal couvre toutes les actions sensibles effectuées par des profils admin :

## 3.1 FinOps Admin
- Déclenchement batch (RUN / REPROCESS)
- Freeze / Unfreeze (périodes)
- Refresh materialized views
- Modification pricing views / activation
- Annulation d’une requête admin
- Déverrouillage exceptionnel d’une période

## 3.2 Référentiel Admin
- Approbation / rejet demandes (application, groupe, pivot)
- Création / modification / suppression entités référentielles
- Changement ownership / rattachements
- (Option) décommissionnement d’une application ou d’un groupe

## 3.3 Monitoring Admin
- Lancement batch monitoring
- Changement mappings (Dynatrace / ServiceNow / Elisa)
- Définition / modification SLO (si applicable)
- Refresh agrégats / recalcul KPI

## 3.4 Super Admin (Rosetta Admin)
- Gestion des rôles (assign / revoke)
- Activation / désactivation de domaines
- Paramètres plateforme (feature flags, maintenance)
- Actions exceptionnelles (unlock hard, purge logique)

---

# 4. Acteurs & droits

## 4.1 Rôles autorisés
- `Rosetta_Admin` (Super Admin) : accès complet
- Optionnel : `Rosetta_Audit_Viewer` (lecture seule) si besoin conformité

## 4.2 Règle
- Aucun autre rôle ne peut consulter le journal complet.
- Les admins de domaine peuvent consulter uniquement leurs propres runs/demandes dans leurs écrans métiers, mais pas le journal global.

---

# 5. Modèle de données (Audit Log)

## 5.1 Table `audit_event` (data mart gouvernance)

Champs recommandés :

- `event_id` (UUID, PK)
- `occurred_at` (timestamp)
- `actor_user_id` (string)
- `actor_email` (string)
- `actor_groups` (string[] ou JSON)
- `actor_role_effective` (string) — rôle ayant autorisé l’action
- `source` (enum) : `UI | API | CRON | SYSTEM`
- `client_ip` (string, optionnel)
- `correlation_id` (string) — propagé dans les logs ELISA
- `domain` (enum) : `FINOPS | REFERENTIEL | MONITORING | PLATFORM`
- `action` (string) — ex: `FINOPS_FREEZE_PERIOD`
- `target_type` (string) — ex: `PERIOD`, `PRICING_VIEW`, `APPLICATION`, `REQUEST`
- `target_ref` (string) — id ou nom fonctionnel
- `payload_summary` (json) — champs utiles (période, PV, mois…)
- `result_status` (enum) : `SUCCESS | FAILED | DENIED | CANCELED`
- `result_message` (string) — erreur courte / raison rejet
- `duration_ms` (integer, optionnel)
- `links` (json) — `run_id`, `request_id`, URL ELISA, etc.

Index :
- `(occurred_at desc)`
- `(domain, occurred_at desc)`
- `(actor_user_id, occurred_at desc)`
- `(action, occurred_at desc)`
- `(target_ref)`

---

# 6. Production des événements (qui écrit ?)

Principe : **les événements sont écrits côté microservices (enforcement)**, pas côté front.

## 6.1 Points d’instrumentation obligatoires
- À chaque endpoint admin : écrire un `audit_event`
- À chaque transition d’approbation : écrire un `audit_event`
- À chaque run batch (start/end) : écrire au minimum 2 events :
  - `RUN_STARTED`
  - `RUN_FINISHED` (SUCCESS/FAILED)

## 6.2 Corrélation ELISA
Chaque action admin génère un `correlation_id` :
- stocké dans audit_event
- injecté dans les logs du run / API

Le journal UI propose un lien “Voir logs ELISA” basé sur ce `correlation_id`.

---

# 7. Écrans Backstage (UI)

## 7.1 Page “Audit Admin” (Journal global)

### Objectif
Afficher un tableau paginé et filtrable de tous les événements auditables.

### Contenu principal
- tableau paginé (server-side)
- filtre global + filtres avancés
- actions de consultation détails

### Colonnes recommandées
- Date/heure
- Domaine
- Action
- Cible (type + ref)
- Auteur
- Source (UI/API/CRON)
- Statut (SUCCESS/FAILED/DENIED)
- Durée
- Lien “Détails”

### Filtres
- période (date from/to)
- domaine
- action
- statut
- auteur
- cible (recherche texte)
- source
- correlation_id / run_id

### Actions
- ouvrir détail (drawer/modal)
- export CSV (optionnel)
- lien vers ELISA (si correlation_id présent)

---

## 7.2 Détail d’un événement (drawer/modal)

### Sections
1) Résumé
- action, domaine, statut, date
- auteur (user + groupes)
- source + ip (si dispo)

2) Cible
- type + ref + contexte
- liens vers écran métier (ex: run_id ouvre page run)

3) Contexte / payload
- rendu JSON lisible
- champs clés mis en évidence

4) Observabilité
- correlation_id
- lien ELISA
- durée

---

# 8. API (Audit)

## 8.1 Endpoint de lecture (global)
`GET /admin/audit/events`
Paramètres :
- `from`, `to`
- `domain`
- `action`
- `status`
- `actor`
- `target`
- `source`
- `page`, `pageSize`
- `sort=occurred_at:desc`

Retour :
- `items[]`
- `total`
- `page`, `pageSize`

## 8.2 Endpoint détail
`GET /admin/audit/events/{eventId}`

## 8.3 Sécurité
- rôle requis : `Rosetta_Admin`
- audit obligatoire des accès à l’audit (audit de l’audit)

---

# 9. Rétention & conformité

## 9.1 Rétention
Recommandé :
- 13 mois minimum (usage FinOps)
- idéal : 24 à 36 mois selon politique groupe

## 9.2 Minimisation des données
- minimiser PII : email optionnel si userId suffit
- conserver uniquement ce qui est nécessaire à l’audit

---

# 10. Performance

- Table append-only
- Pagination server-side obligatoire
- Index sur occurred_at et domain

---

# 11. Estimation (ordre de grandeur)

- Backend (audit table + endpoints + instrumentation) : 3–6 jours
- Front Backstage (page + filtres + détail) : 3–5 jours
- Intégration ELISA + corrélation : 1–3 jours

Total : ~2 semaines (tests + durcissement RBAC inclus).

---

# 12. Résumé

Le Journal d’Audit Admin de Rosetta V2 :
- offre une vue unifiée des actions admin (batch, approvals, changements sensibles),
- est gouverné par RBAC strict (Super Admin),
- conserve un audit métier lisible,
- référence ELISA pour le détail technique,
- améliore la maîtrise opérationnelle et la conformité.
