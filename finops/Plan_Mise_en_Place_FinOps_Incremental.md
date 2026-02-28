# 📘 Plan de Mise en Place – FinOps Incrémental
## Architecture Unifiée Direct / Indirect (Quantity-Based Model)

---

# 1️⃣ Objectif du Plan

Mettre en place le module FinOps de manière :

- Progressive (par domaine)
- Parallélisable (Batch vs API/UI)
- Data-driven (activation via dim_domain)
- Stable contractuellement (Data Contract figé dès le départ)

Ce document décrit :

- Les jalons
- Les prérequis
- Les étapes parallélisables
- Les checklists de validation
- Les risques
- Les bonnes pratiques Data Contract

---

# 2️⃣ Vision Générale d’Implémentation

Architecture cible :

Sources → Batch (Domain Plugins) → fact_consumption → MVs → API → UI Backstage

Principe central :

cost = quantity × unit_price

Direct = consommation réelle  
Indirect = quantity abstraite (poids / coefficient)

---

# 3️⃣ Étape 0 – Pré-requis & Contrat de Données (Semaine 1)

## Objectif

Figer le modèle de données final AVANT développement parallèle.

---

## 3.1 Data Contract – Exemple de Base

### dim_domain

| Champ | Description |
|-------|------------|
| domain_id | Identifiant unique |
| domain_label | Nom affiché |
| domain_mode | DIRECT / INDIRECT |
| indirect_method_key | Clé technique (si INDIRECT) |
| indirect_label | Libellé affichable |
| is_enabled | Activation prod |
| available_from | Mois d’activation |

---

### fact_consumption

| Champ | Description |
|-------|------------|
| period_month | Mois (YYYY-MM) |
| domain_id | Domaine |
| family_id | Nullable |
| product_id | Nullable |
| application_id | Application |
| quantity | Valeur numérique |
| consumption_type | DIRECT / INDIRECT |
| consumption_metric | Ex: CPU, OPEN_WEIGHT |
| run_id | ID exécution batch |

---

### Règles du Contrat

- domain_id stable et non modifiable
- family_id/product_id NULL autorisé si INDIRECT
- 1 ligne = 1 application / 1 domaine / 1 période
- Pas de stockage du coût
- Idempotence par (period_month, domain_id)

---

## Checklist Étape 0

- Modèle validé
- Migrations SQL prêtes
- Index créés
- Documentation publiée
- Validation équipe

Estimation : 2–3 jours

---

# 4️⃣ Étape 1 – Socle Technique Parallélisable (Semaine 1–2)

## 4.1 Batch Shell

Objectif :

- Orchestrateur
- Gestion période
- Lecture dim_domain (is_enabled=true)
- Gestion run_id
- Idempotence

Checklist :

- Orchestrateur multi-domaines
- Logs structurés
- Gestion erreurs par domaine
- Mode dry-run

Estimation : 4–6 jours

---

## 4.2 Materialized Views

Créer des MVs génériques :

- mv_cost_domain_month
- mv_cost_app_month
- mv_cost_family_month (family_id NOT NULL)
- mv_history_trend

Checklist :

- MVs indexées
- Refresh planifié
- Test volumétrie

Estimation : 3–4 jours

---

## 4.3 API FinOps

Endpoints minimum :

- GET /dashboard
- GET /domains
- GET /domains/{id}
- GET /applications/{id}
- POST /aggregate

Checklist :

- Support pricingView
- Gestion filtre applications
- DTO inclut domainMode
- Gestion empty states

Estimation : 4–6 jours

---

## 4.4 UI Backstage

Pages :

- Dashboard global
- Vue domaine
- Vue application
- Rankings
- Historique

Checklist :

- Composants dynamiques
- Gestion DIRECT / INDIRECT
- Gestion loading / no data

Estimation : 6–8 jours

---

# 5️⃣ Étape 2 – Implémentation Incrémentale Domaines (Semaine 2–4)

## Domaine 1 – OPEN (DIRECT)

- Ingestion données
- Mapping famille / produit
- Insert fact_consumption

Estimation : 5–7 jours

---

## Domaine 2 – Indirect Externe

- Import coefficients
- Normalisation si nécessaire
- Insert quantity INDIRECT

Estimation : 2–4 jours

---

## Domaine 3 – Indirect basé sur Open

- Calcul poids Open
- Normalisation
- Insert quantity INDIRECT

Estimation : 3–5 jours

---

# 6️⃣ Déploiement Progressif

Activation via dim_domain :

1. Domaine inséré (is_enabled=false)
2. Tests recette
3. is_enabled=true
4. Nightly run
5. Apparition automatique UI

Checklist activation :

- Pricing View configurée
- Refresh MVs OK
- Monitoring OK

---

# 7️⃣ Risques & Mitigation

| Risque | Mitigation |
|--------|------------|
| Contrat instable | Geler modèle avant dev parallèle |
| Changement grain tardif | Validation métier précoce |
| Données incohérentes | Logging + fallback |
| Volumétrie élevée | Tests de charge |
| UI dépend trop des domaines | UI data-driven |

---

# 8️⃣ Bonnes Pratiques Data

- Documenter consumption_metric
- Ne jamais stocker le coût
- Index sur (application_id, period_month)
- Gérer mois sans données
- Versionner pricing views

---

# 9️⃣ Planning Global Estimé

| Bloc | Estimation |
|------|------------|
| Contrat & migrations | 2–3 j |
| Batch shell | 4–6 j |
| MVs | 3–4 j |
| API | 4–6 j |
| UI | 6–8 j |
| Domaines (3) | 10–15 j |

En parallèle : 3 à 4 semaines pour V1 stable en prod.

---

# 🔟 Conclusion

Stratégie progressive, parallélisable, stable.

Ajout de domaines via activation data-driven.

Architecture scalable et évolutive.
