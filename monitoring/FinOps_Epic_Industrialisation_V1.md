# EPIC — Industrialisation FinOps Rosetta (V1 + socle évolutif)

## Vision de l’Epic

Mettre en place un module FinOps industrialisé, extensible et performant, permettant :
- le pilotage financier par Domaine / Application / Environnement
- le drill-down multi-niveaux cohérent
- la gestion de différentes pricing views
- l’historisation fiable des coûts
- une UI décisionnelle exploitable par management & équipes techniques

Cette Epic couvre :
- Data Contract
- Batch de calcul / ingestion
- Materialized Views
- API (niveau 1 + analytics)
- UI (Dashboard / Domaine / Application)
- Espace Admin
- Préparation des évolutions (historique figé, optimisations)

---
# STRUCTURE DE L’EPIC
---

# US-01 — Data Contract FinOps

## Description
En tant qu’architecte plateforme,  
Je veux définir un data contract stable et évolutif,  
Afin que toutes les briques (batch, MV, API, UI) reposent sur un socle cohérent.

## Critères d’acceptance
- Le grain de la fact est documenté
- Tous les pivots nécessaires au drill-down sont présents
- La fact permet :
  - Domaine → Application
  - Application → Domaine
- Les champs sont normalisés
- La documentation est validée par l’équipe

---

# US-02 — Batch FinOps (Ingestion & Consolidation)

## Description
En tant que système FinOps,  
Je veux un batch d’ingestion et d’agrégation,  
Afin d’alimenter la fact de manière fiable.

## Critères d’acceptance
- DIRECT et INDIRECT respectent la logique quantity × unit_price
- Un run batch est traçable
- Un mode reprocessing d’un mois est possible

---

# US-03 — Materialized View Drill-Base

## Description
En tant que développeur backend,  
Je veux une MV socle contenant tous les pivots,  
Afin de supporter tous les drill-down.

## Critères d’acceptance
- Permet WHERE domain_id
- Permet WHERE app_id
- Support GROUP BY famille et environnement
- Performance acceptable sur 24 mois

---

# US-04 — Materialized Views Agrégées

## Description
En tant que backend,  
Je veux des MVs d’agrégation optimisées,  
Afin d’accélérer les widgets principaux.

## Critères d’acceptance
- Chaque MV sert au moins 2 widgets
- Aucune perte de capacité drill-down
- Requêtes dashboard < 300ms cible

---

# US-05 — API FinOps (Low 1 — Drill Down)

## Description
En tant que frontend,  
Je veux des APIs stables et paramétrables,  
Afin d’afficher les données du dashboard et des pages drill-down.

## Critères d’acceptance
- Tous les endpoints acceptent month + pricingViewId
- Format JSON standardisé
- Les drill-down conservent les filtres parents
- Tests d’intégration validés

---

# US-06 — API Analytics & Variations

## Description
En tant que contrôleur FinOps,  
Je veux visualiser les tendances et variations,  
Afin d’identifier les dérives budgétaires.

## Critères d’acceptance
- Calcul correct M vs M-1
- Support 12 mois minimum
- Gestion des cas sans historique

---

# US-07 — UI FinOps (Low 1 — Drill Down)

## Description
En tant qu’utilisateur métier,  
Je veux naviguer du Dashboard vers Domaine puis Application,  
Afin d’analyser les coûts intuitivement.

## Critères d’acceptance
- 3 pages : Dashboard, Domaine, Application
- Drill-down fonctionnel
- Paramètres globaux persistés
- Chargement < 1s cible

---

# US-08 — UI Analytics (Top / Historique / Variation)

## Description
En tant que management,  
Je veux voir les tendances et top variations,  
Afin de piloter stratégiquement les coûts.

## Critères d’acceptance
- Graphiques 12 mois
- Top hausses / baisses
- Navigation directe vers l’élément concerné

---

# US-09 — Espace Admin FinOps

## Description
En tant qu’admin plateforme,  
Je veux administrer les pricing views et relancer les batchs,  
Afin de garantir la fiabilité des données.

## Critères d’acceptance
- Une pricing view active unique
- Batch relançable sans corruption
- Traçabilité complète

---

# US-10 — Historisation & Optimisation (Préparation V2)

## Description
En tant qu’architecte,  
Je veux préparer le système à supporter l’historique figé,  
Afin d’assurer la cohérence budgétaire dans le temps.

## Critères d’acceptance
- Design documenté
- Aucun impact sur V1
- Facilité d’activation future

---

# US-11 — Performance & Observabilité

## Description
En tant qu’équipe plateforme,  
Je veux monitorer les performances et les requêtes SQL,  
Afin d’assurer la scalabilité.

## Critères d’acceptance
- Logs temps de requêtes
- Monitoring batch
- Index adaptés sur MVs
- Stratégie refresh nightly définie

---

# Découpage suggéré en Sprints

Sprint 1 :
- US-01
- US-02
- US-03
- US-05 (partiel)

Sprint 2 :
- US-04
- US-05 complet
- US-07

Sprint 3 :
- US-06
- US-08
- US-09

Sprint 4 :
- US-10
- US-11
