# Rosetta V2
# Spécification Fonctionnelle & Technique
# Module Programmes & KPI (Mono-Entité)

---

# 1. Décision d’Architecture

Le module **Programmes & KPI** est intégré à Rosetta V2 au sein du périmètre Entité.

Décisions structurantes :

- Pivot unique : **Application**
- Drill-down : lien vers fiche application (catalogue)
- Snapshot nightly obligatoire
- Évaluation batch centralisée
- Module rattaché au domaine Monitoring (extension fonctionnelle)
- Pas de multi-entité en V2
- Pas de KPI custom codés (100% déclaratif)

---

# 2. Objectif

Permettre à l’entité de :

- Créer des Programmes
- Définir des KPI déclaratifs
- Lancer et planifier l’évaluation
- Visualiser les résultats
- Suivre l’évolution temporelle
- Auditer les exécutions

---

# 3. Concepts Fonctionnels

## 3.1 Programme

Un Programme contient :

- id
- nom
- description
- sponsor
- date_debut
- date_fin
- statut (DRAFT | ACTIVE | CLOSED)
- périmètre (filtre applications)
- fréquence_refresh (CRON ou preset : nightly par défaut)
- created_by
- created_at

---

## 3.2 KPI

Chaque KPI contient :

- id
- programme_id
- nom
- dataset_source
- rule_json (règles déclaratives)
- result_type (BOOLEAN | NUMERIC | ENUM)
- weight (optionnel)
- created_at

---

# 4. Administration & Batch

## 4.1 Règle d’Exécution

À la création d’un programme :

- Sauvegarde en DRAFT
- Test preview
- Activation → déclenchement immédiat d’un batch d’évaluation

Ensuite :

- Refresh nightly automatique (batch global)
- Possibilité lancement manuel via interface admin

---

## 4.2 Interface Admin

Vue Admin Programmes :

- Liste programmes
- Statut
- Dernière exécution
- Durée
- Nb applications évaluées
- Nb erreurs
- Bouton : “Lancer scan maintenant”
- Bouton : “Voir journal”

---

## 4.3 Table programme_batch_run

- id
- programme_id
- execution_type (AUTO | MANUAL)
- triggered_by
- start_time
- end_time
- status (RUNNING | SUCCESS | FAILED)
- nb_applications
- nb_kpi_evaluated
- error_count
- log_reference

---

# 5. Mécanisme Technique d’Évaluation

## 5.1 Process Batch

Étapes :

1. Charger programme actif
2. Charger périmètre applications
3. Pour chaque KPI :
   - Traduire rule_json → SQL sécurisé
   - Évaluer sur dataset source
4. Produire résultat par application
5. Écrire dans programme_kpi_application_result
6. Calculer agrégations
7. Écrire snapshot
8. Journaliser exécution

---

## 5.2 Table programme_kpi_application_result

- programme_id
- kpi_id
- application_id
- result_value
- result_status (OK | KO)
- evaluated_at

---

## 5.3 Snapshot Historique

Table programme_snapshot :

- programme_id
- date_snapshot
- total_applications
- nb_ok
- nb_ko
- compliance_rate
- score_global (si pondéré)

Snapshot nightly obligatoire.

---

# 6. Scheduling

Par défaut :

- Refresh nightly global (02:00)

Option :

- Programme peut définir fréquence personnalisée :
  - Daily
  - Weekly
  - Custom CRON

Implémentation :

- Batch central Rosetta Monitoring
- Lecture programmes actifs
- Vérification schedule
- Exécution séquentielle

Pas de CronJob Kubernetes par programme.

---

# 7. UX Décisions

## 7.1 Pas de drill-down composant natif

Décision :

- Calcul = application
- Drill-down = lien vers fiche application
- Composants visibles uniquement dans fiche application
- Pas de KPI calculé séparément au niveau composant

Cela évite double modèle.

---

## 7.2 Fiche Application

Ajout onglet “Programmes” :

- Liste programmes actifs
- Statut par programme
- Liste KPI
- Historique (si disponible)

---

# 8. Sécurité & RBAC

Rôles :

- Programme Admin
  - CRUD programme
  - Lancer scan manuel
  - Modifier fréquence

- Lecteur
  - Consultation uniquement

Toutes actions journalisées.

---

# 9. Intégration Monitoring

Le module est intégré au backend Monitoring car :

- Déjà logique batch
- Déjà logique snapshot
- Déjà logique métriques

Mais logique métier séparée (namespace propre).

---

# 10. Performances

Hypothèse :

- 800 applications
- 5 programmes actifs
- 6 KPI par programme

Volume évaluation :

800 x 6 x 5 = 24 000 évaluations nightly

Charge faible pour PostgreSQL.

Temps estimé < 1–2 secondes par programme.

---

# 11. Gestion des Erreurs

- Si un KPI échoue :
  - Log erreur
  - Continuer autres KPI
- Si programme échoue totalement :
  - Status FAILED
  - Pas de snapshot écrit

---

# 12. Cas d’Usage V2

- Adoption Monitoring
- Conformité SLO
- Adoption FinOps
- Complétude Référentiel
- Conformité sécurité basique

---

# 13. Évolutions Futures (Hors V2)

- KPI composite avancé
- Score maturité pondéré complexe
- Multi-entité
- Benchmark groupe
- Alerting automatique

---

# 14. Résumé Décisions

- Pivot application unique
- Pas de KPI par composant
- Snapshot nightly obligatoire
- Batch centralisé
- Scheduling configurable
- Interface admin dédiée
- Module intégré Monitoring backend
- Architecture compatible V3 multi-entité

---

Fin du document.
