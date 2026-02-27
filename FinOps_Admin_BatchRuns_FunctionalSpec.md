# 🛠 FinOps – Admin (Batch Runs & Logs) – Spécification Fonctionnelle + UX (Haut niveau)

## 1. 🎯 Objectif

Mettre à disposition une **section Admin FinOps** permettant de :
- Consulter l’historique des exécutions du batch FinOps
- Suivre les statuts (RUNNING / SUCCESS / FAILED)
- Accéder au détail d’un run (périodes, volumes, durée, domaines traités, erreurs)
- Télécharger les **logs associés** (ou accéder à un lien centralisé)

---

## 2. 👥 Utilisateurs / Permissions

### Rôles
- **finops-admin** : accès complet
- **finops-user** : pas d’accès à l’admin (sauf lecture limitée si souhaité)

---

## 3. 🧭 Navigation Backstage

Menu FinOps :
- Dashboard
- Vue Domaine
- Vue Famille
- Vue Application
- Classements
- Historique
- **Admin**
  - **Batch Runs**

---

## 4. 📋 Écran 1 – “Batch Runs” (Liste des exécutions)

### Objectif
Visualiser rapidement :
- les derniers runs
- leur statut
- les runs en erreur
- les durées/volumes anormaux
- l’accès aux logs

### Table (colonnes recommandées)
- Run ID
- Déclencheur (CRON / MANUAL)
- Périodes (ex: 2026-02, 2026-01)
- Statut (RUNNING/SUCCESS/FAILED)
- Début / Fin / Durée
- Domaines traités (chips : Open / Private / Public / Native)
- Volumes (relevés insérés, MVs refresh)
- Erreurs (count + message court)
- Actions

### Filtres
- Statut
- Période (month picker)
- Domaine
- Déclencheur
- Plage de dates
- Recherche (Run ID)

### Actions
- Voir détail
- Télécharger logs (si disponible)
- Ouvrir logs (lien Kibana/Loki)

---

## 5. 🔎 Écran 2 – “Run Detail” (Détail d’une exécution)

### Sections
**A. Résumé**
- Run ID, statut, start/end/duration, déclencheur, version

**B. Périodes traitées**
- Liste des mois concernés + indication recalcul mois courant/N-1

**C. Détails par domaine (blocs)**
- Domaine, statut bloc, durée, volumes, erreurs

**D. Base & Agrégats**
- Relevés insérés/supprimés (si tracked)
- Liste des MVs refresh + timestamps

**E. Logs**
- Télécharger logs
- Ouvrir dans plateforme de logs
- (optionnel) extrait de log

---

## 6. 🧾 Logs – Options

### Option A (recommandée) : Logs centralisés + lien
- `etl_runs.logs_url` stocke un lien Kibana/Loki
- UI : bouton “Ouvrir logs”

### Option B : Téléchargement via API
- Stockage logs (S3/MinIO/DB)
- `GET /finops/admin/runs/{runId}/logs`

---

## 7. 🔌 Endpoints API (high-level)

- `GET /finops/admin/runs`
- `GET /finops/admin/runs/{runId}`
- `GET /finops/admin/runs/{runId}/logs` (si option B)
- (optionnel) `POST /finops/admin/runs/reprocess`

---

## 8. 💡 Recommandations UX

- Badges statut très visibles (RUNNING animé, SUCCESS vert, FAILED rouge)
- Tri défaut : start_time DESC
- Mise en avant anomalies (durée/volume)
- Logs accessibles en 1 clic
- Tooltip message court sur FAILED

---

## 9. 🧮 Effort (ordre de grandeur)

- UI liste + détail : **2 à 4 jours**
- Option A (lien logs) : **+0,5 à 1 jour**
- Option B (download) : **+2 à 5 jours**

---

## 10. 🏁 Conclusion

Cette section Admin apporte l’observabilité opérationnelle :
- historique des runs
- statuts
- détail par blocs
- accès aux logs
