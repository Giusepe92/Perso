# Module FinOps -- Spécification Fonctionnelle des Écrans (Vue Backstage)

## 1. 🎯 Objectif

Définir les écrans, vues et dashboards du module FinOps permettant de
: - Visualiser les coûts par domaine, famille, produit et application -
Explorer l'historique des coûts - Identifier les tendances et
variations - Offrir une navigation intuitive adaptée à Backstage

Ce document décrit une **vision fonctionnelle de haut niveau**.

------------------------------------------------------------------------

# 2. 🧭 Navigation Générale

Deux approches sont possibles :

## Option recommandée : Navigation hybride

-   Un **Dashboard principal**
-   Des vues dédiées accessibles via menus secondaires :
    -   Vue Domaine
    -   Vue Famille
    -   Vue Application
    -   Vue Classements
    -   Vue Historique

La navigation doit permettre : - Filtres globaux persistants (période,
domaine, famille) - Drill-down hiérarchique (Domaine → Famille → Produit
→ Application)

------------------------------------------------------------------------

# 3. 🏠 Dashboard Principal

## Objectif

Vue synthétique globale des coûts.

## Contenu

-   Coût total période courante
-   Comparaison avec période précédente (% variation)
-   Top 5 domaines par coût
-   Top 5 familles par coût
-   Top 5 applications par coût
-   Graphique d'évolution globale (12 mois glissants)

## Visualisations recommandées

-   KPI Cards
-   Bar charts (Top N)
-   Line chart (historique mensuel)
-   Pie chart (répartition par domaine)

------------------------------------------------------------------------

# 4. 🌐 Vue par Domaine Technologique

## Objectif

Visualiser les coûts consolidés par domaine (Open, Cloud Privé, Cloud
Public, Natif).

## Contenu

-   Liste des domaines avec :
    -   Coût total
    -   Variation vs mois précédent
    -   Nombre d'applications actives
-   Drill-down vers familles du domaine
-   Historique mensuel du domaine sélectionné

## Graphiques

-   Line chart historique
-   Bar chart comparatif entre domaines
-   Heatmap mensuelle possible

------------------------------------------------------------------------

# 5. 🗂 Vue par Famille

## Objectif

Analyser la répartition des coûts à l'intérieur d'un domaine.

## Contenu

-   Liste des familles
-   Coût total par famille
-   Classement décroissant
-   Variation mensuelle
-   Répartition par application

## Drill-down

Famille → Produits → Applications

------------------------------------------------------------------------

# 6. 🧩 Vue par Application

## Objectif

Vision détaillée des coûts d'une application.

## Contenu

-   Coût total mensuel
-   Historique 12 mois
-   Répartition par domaine
-   Répartition par famille
-   Répartition par produit

## Graphiques

-   Stacked bar chart (répartition produits)
-   Line chart historique
-   Table détaillée des relevés agrégés

------------------------------------------------------------------------

# 7. 📊 Vue Classements (Top & Variations)

## Objectif

Identifier les outliers et tendances.

## Écrans possibles

### A. Top Applications

-   Top 10 par coût
-   Top 10 par croissance
-   Top 10 par réduction

### B. Top Familles

### C. Top Domaines

### D. Variations Anormales

-   Détection variation \> X%
-   Affichage delta absolu et relatif

------------------------------------------------------------------------

# 8. 📈 Vue Historique & Évolution

## Objectif

Explorer les tendances longues.

## Fonctionnalités

-   Sélection plage temporelle
-   Sélection niveau d'analyse :
    -   Domaine
    -   Famille
    -   Application
-   Comparaison multi-périodes

## Graphiques

-   Courbe multi-séries
-   Comparaison N-1
-   Analyse cumulée annuelle

------------------------------------------------------------------------

# 9. 🎛 Filtres Globaux

Filtres transverses applicables à toutes les vues :

-   Période (mois, trimestre, année)
-   Domaine
-   Famille
-   Application
-   Produit
-   Environnement (si applicable)
-   Source (Natif / Open / Cloud)

Les filtres doivent être combinables.

------------------------------------------------------------------------

# 10. 📑 Vue Détail Relevé (Optionnel Avancé)

Accessible depuis une application ou famille.

Affiche : - Liste des relevés consolidés - Source du calcul - RunId -
Date de calcul - Métrique d'usage - Coût unitaire - Coût total

------------------------------------------------------------------------

# 11. 📌 Expérience Utilisateur

## UX recommandée

-   Navigation hiérarchique intuitive
-   Drill-down dynamique
-   Mise à jour temps réel des graphiques
-   Temps de réponse rapide (via materialized views)
-   Interface cohérente avec Backstage

------------------------------------------------------------------------

# 12. 🔮 Évolutions Futures Possibles

-   Export CSV / Excel
-   Intégration BI externe
-   Alerting automatique
-   Prévisions (forecasting)
-   Comparaison budgétaire

------------------------------------------------------------------------

# 13. 🏁 Conclusion

Le module FinOps doit proposer :

-   Une vue synthétique globale
-   Une navigation hiérarchique Domaine → Famille → Produit →
    Application
-   Des classements dynamiques
-   Un historique riche
-   Une capacité de drill-down rapide

Le design doit reposer sur les agrégats PostgreSQL pour garantir
performance et scalabilité.
