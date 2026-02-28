# 📘 Plan de Transition -- Passage du FinOps Legacy vers FinOps Platform V2

## Découpage des tâches, stratégie de communication et plan sprint par sprint

------------------------------------------------------------------------

# 1️⃣ Plan Concret de Découpage des Tâches

## 🎯 Objectif global

Mettre en place l'architecture FinOps V2 (Data Mart + Batch + MVs +
API + UI) tout en continuant la clarification métier via le module
Legacy.

Approche : - Legacy = laboratoire métier temporaire - V2 = socle cible
industriel

------------------------------------------------------------------------

## 🔹 Axe 1 -- Stabilisation Métier (Rail POC)

Responsable : Référent métier / Dev Legacy

Tâches : - Finaliser les règles de calcul par domaine - Formaliser les
règles en documentation claire - Identifier les dépendances
inter-domaines - Documenter Direct vs Indirect - Produire un Data
Contract cible

Livrables : - Document règles validées - Contrat de données signé

------------------------------------------------------------------------

## 🔹 Axe 2 -- Mise en place Socle Data (V2)

Responsable : Architecte / Backend

Tâches : - Création schéma PostgreSQL - Tables dimensions (domain,
family, product, application) - Table fact_consumption - Table
pricing_view - Indexation stratégique - Migrations versionnées

Livrable : - Data Mart opérationnel en DEV

------------------------------------------------------------------------

## 🔹 Axe 3 -- Batch FinOps V2

Tâches : - Skeleton Quarkus Batch - Orchestrateur par domaine -
Implémentation domaine pilote (Open) - Idempotence & gestion erreurs -
Table batch_runs

Livrable : - 1 domaine calculé automatiquement

------------------------------------------------------------------------

## 🔹 Axe 4 -- Materialized Views

Tâches : - MV Dashboard global - MV par domaine - MV historique - Index
MV - Script refresh orchestré

Livrable : - Requêtes optimisées (\<500ms cible)

------------------------------------------------------------------------

## 🔹 Axe 5 -- API FinOps V2

Tâches : - Endpoints summary - Endpoints breakdown - Endpoints history -
Paramétrage pricing_view - Tests de performance

Livrable : - API REST stable

------------------------------------------------------------------------

## 🔹 Axe 6 -- UI Progressive

Tâches : - Menu "FinOps V2" - Dashboard V2 minimal - Comparaison Legacy
vs V2 - Feature flag activation

Livrable : - UI V2 visible en parallèle

------------------------------------------------------------------------

# 2️⃣ Stratégie de Communication Interne

## 🎯 Message clé

"Passage d'un POC démonstratif à une plateforme industrielle durable."

Ce n'est pas un abandon. C'est une maturation et une sécurisation avant
mise en production.

------------------------------------------------------------------------

## 📢 Argumentaire Direction

1.  Réduction dette technique
2.  Meilleure performance & scalabilité
3.  Architecture durable
4.  Sécurisation du Go-Live
5.  Capacité future multi-entités

------------------------------------------------------------------------

## 📢 Message Équipe

-   Legacy continue pour stabiliser règles
-   V2 est la cible officielle
-   Migration progressive par domaine
-   Pas de Big Bang

------------------------------------------------------------------------

# 3️⃣ Plan Sprint par Sprint (6 semaines)

## 🔵 Sprint 1 (Semaines 1--2)

-   Finalisation Data Contract
-   Création schéma PostgreSQL
-   Batch skeleton
-   Domaine pilote (Open)

Résultat : Open calculé en V2

------------------------------------------------------------------------

## 🔵 Sprint 2 (Semaine 3)

-   Materialized Views principales
-   API summary + breakdown
-   UI V2 dashboard minimal
-   Comparaison Legacy vs V2

Résultat : Dashboard V2 pour 1 domaine

------------------------------------------------------------------------

## 🔵 Sprint 3 (Semaine 4)

-   Ajout domaine indirect simple
-   Pricing View V1
-   Monitoring & logs

Résultat : 2 domaines opérationnels

------------------------------------------------------------------------

## 🔵 Sprint 4 (Semaine 5)

-   Ajout 3e domaine
-   Optimisation performances
-   Tests charge simples

Résultat : V2 majoritaire

------------------------------------------------------------------------

## 🔵 Sprint 5 (Semaine 6 -- Pré Go-Live)

-   Feature flag bascule
-   Validation métier
-   Documentation finale
-   Plan extinction Legacy

Résultat : V2 prête pour production

------------------------------------------------------------------------

# 🎯 Stratégie de Bascule

1.  Legacy maintenu en lecture
2.  V2 activée par défaut
3.  Validation résultats
4.  Extinction progressive Legacy

------------------------------------------------------------------------

# 🏁 Conclusion

✔ Continuité métier\
✔ Industrialisation progressive\
✔ Réduction du risque production\
✔ Positionnement architectural clair

Transition maîtrisée sans Big Bang, sécurisant la trajectoire long terme
FinOps.
