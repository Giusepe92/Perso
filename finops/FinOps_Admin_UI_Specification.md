# 🛠 FinOps – Spécification UI / UX & Technique – Partie Admin

---

# 1. 🎯 Objectifs de la partie Admin

La section **Admin FinOps** permet :

- Superviser les exécutions du Batch FinOps
- Vérifier la fraîcheur des données
- Diagnostiquer les erreurs
- Accéder aux logs
- Déclencher manuellement un run
- Reprocesser une période spécifique

Elle constitue la couche **RunOps / Exploitation** du module FinOps.

---

# 2. 👥 Utilisateurs & Permissions

## 2.1 Rôles

### finops-admin
- Accès complet
- Consultation runs
- Détail d’exécution
- Téléchargement logs
- Lancement manuel
- Reprocess

### finops-user
- Aucun accès à la section Admin

---

# 3. 🧭 Navigation Backstage

Menu FinOps :

- Dashboard
- Domaines
- Familles
- Applications
- Classements
- Historique
- **Admin**
  - Batch Runs
  - Lancer une exécution

La section Admin est accessible uniquement si rôle `finops-admin`.

---

# 4. 📋 Écran 1 – Batch Runs (Liste des exécutions)

## Objectif

Visualiser l’historique des exécutions et identifier rapidement :
- Runs en échec
- Runs longs
- Runs en cours
- Volumes anormaux

---

## Table principale

Colonnes recommandées :

- Run ID
- Déclencheur (CRON / MANUAL)
- Périodes traitées
- Statut (RUNNING / SUCCESS / FAILED)
- Début
- Fin
- Durée
- Domaines traités (chips Open / Private / Public / Native)
- Volumes insérés
- Nombre d’erreurs
- Version (image tag / git sha)
- Actions

---

## Filtres

- Statut
- Période
- Domaine
- Déclencheur
- Intervalle de dates
- Recherche Run ID

---

## Actions par ligne

- 👁 Voir détail
- 📥 Télécharger logs (si stockage interne)
- 🔗 Ouvrir logs (lien Kibana / Loki)
- 🔁 Relancer (optionnel)

---

## UX Recommandée

- Badge coloré pour statut
  - RUNNING (bleu animé)
  - SUCCESS (vert)
  - FAILED (rouge)
- Tooltip message erreur court
- Tri par défaut : start_time DESC
- Indicateur durée anormale (badge orange)

---

# 5. 🔎 Écran 2 – Détail d’une exécution

## Objectif

Comprendre précisément ce qui s’est passé durant le run.

---

## Section A – Résumé

- Run ID
- Statut
- Start / End / Duration
- Déclencheur
- Version déployée

---

## Section B – Périodes traitées

- Liste des mois
- Indication si N-1 recalculé

---

## Section C – Détails par domaine

Table ou cartes :

- Domaine
- Statut bloc
- Durée bloc
- Nombre de lignes générées
- Erreurs éventuelles

---

## Section D – Base & Agrégats

- Nombre de consommations insérées
- Nombre supprimé
- Liste des MVs refresh
- Durée refresh par MV

---

## Section E – Logs

Options :

- 📥 Télécharger logs
- 🔗 Ouvrir logs plateforme centralisée
- Extrait dernière erreur (optionnel)

---

## UX Recommandée

- Sections collapsibles
- Timeline visuelle du run
- Badge réussite par bloc
- Affichage synthétique + bouton “Voir détails techniques”

---

# 6. 🚀 Écran 3 – Lancer une exécution Batch

## Objectif

Permettre à un admin de déclencher un run manuellement.

---

## Contenu

### Bandeau information

- Message d’avertissement (priorité sur CRON)
- Impact sur consommation + refresh MVs

---

### Déclencheur

- Lancer immédiatement
- Planifier (date/time picker)

---

### Plage temporelle

- Mois courant
- Mois courant + N-1
- Période personnalisée

---

### Domaines traités

- Multi-select (Open / Private / Public / Native)
- Bouton sélectionner/désélectionner tout

---

### Périmètre optionnel

- Multi-select applications
- Si vide → recalcul global

---

### Options avancées

- Forcer recalcul
- Skip refresh MVs (optionnel technique)
- Mode dry-run (future)

---

### Actions

- Lancer Exécution Batch
- Annuler

---

## UX Recommandée

- Validation obligatoire champs critiques
- Confirmation modale avant lancement
- Toast confirmation avec Run ID
- Redirection vers liste filtrée sur le run

---

# 7. 🔌 Endpoints nécessaires côté API

## Runs

- GET /finops/admin/runs
- GET /finops/admin/runs/{runId}
- GET /finops/admin/runs/{runId}/logs
- POST /finops/admin/runs (lancement manuel)

## Données batch à stocker

Table `etl_runs` :

- run_id
- status
- trigger_type
- periods
- start_time
- end_time
- duration
- domains_processed
- records_inserted
- records_deleted
- errors_count
- error_summary
- logs_url
- version

Optionnel : `etl_run_steps`

---

# 8. 📊 Recommandations UX générales

- Pas surcharger visuellement
- Priorité à la lisibilité
- Indicateurs clairs de succès/échec
- Logs accessibles en 1 clic
- Historique stable et paginé

---

# 9. 🧮 Estimation effort

UI Batch Runs + Détail : 3–5 jours  
Lancement manuel : 2–4 jours  
Endpoints backend + sécurité : 3–5 jours  
Logs download si stockage interne : +2–4 jours  

Total réaliste : 1 à 2 semaines selon maturité existante.

---

# 10. 🏁 Conclusion

La section Admin complète le module FinOps en apportant :

- Supervision des runs
- Traçabilité technique
- Reprocess maîtrisé
- Observabilité centralisée

Elle garantit robustesse opérationnelle et transparence vis-à-vis des équipes.
