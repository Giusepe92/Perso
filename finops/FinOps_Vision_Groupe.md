# 📘 Vision Groupe -- Architecture FinOps Multi‑Entités

## 🎯 Objectif

Mettre en place une **vision FinOps Groupe** permettant :

-   D'agréger les consommations de toutes les entités du groupe
-   De consolider les coûts au niveau global
-   De permettre une analyse comparative entre entités
-   De garder l'autonomie de chaque entité locale

Cette vision groupe repose sur une architecture fédérée où chaque entité
dispose de son propre module FinOps, et alimente ensuite une base
centrale Groupe.

------------------------------------------------------------------------

# 1️⃣ Architecture Générale

Architecture cible :

Entités locales\
→ Batch FinOps local\
→ Data Mart local (facts & dimensions)\
→ Export / Sync sécurisé\
→ Base FinOps Groupe\
→ Materialized Views Groupe\
→ API Groupe\
→ Dashboard Groupe

Chaque entité reste indépendante dans ses calculs, mais publie ses
résultats consolidés.

------------------------------------------------------------------------

# 2️⃣ Principe Fondamental

Chaque entité :

-   Calcule ses propres `fact_consumption`
-   Applique ses règles Direct / Indirect
-   Gère ses Pricing Views locales
-   Maintient son historique

La base Groupe ne recalculera pas les consommations :

> Elle consolide les faits produits par les entités.

------------------------------------------------------------------------

# 3️⃣ Modèle de Données Groupe

## 3.1 Ajout de la dimension Entité

Nouvelle dimension :

  Champ          Description
  -------------- -----------------------
  entity_id      Identifiant entité
  entity_label   Nom de l'entité
  country        Optionnel
  active         Indicateur d'activité

------------------------------------------------------------------------

## 3.2 fact_consumption_group

Structure :

  Champ              Description
  ------------------ ----------------------
  period_month       Mois
  entity_id          Entité source
  application_id     Application
  domain_id          Domaine
  family_id          Famille (nullable)
  product_id         Produit (nullable)
  quantity           Poids / consommation
  consumption_type   DIRECT / INDIRECT

Grain :

(period_month, entity_id, application_id, product_id/domain_id)

------------------------------------------------------------------------

# 4️⃣ Stratégie d'Alimentation Groupe

Deux approches possibles :

### Option 1 -- Export batch mensuel

Chaque entité exporte ses facts agrégées mensuelles vers la base Groupe.

### Option 2 -- Synchronisation API

La base Groupe interroge périodiquement les APIs locales.

Recommandation :\
Export batch sécurisé, plus stable et maîtrisé.

------------------------------------------------------------------------

# 5️⃣ Materialized Views Groupe

La base Groupe implémente ses propres MVs :

-   mv_group_entity_month
-   mv_group_domain_month
-   mv_group_entity_domain_month
-   mv_group_application_month
-   mv_group_comparison_entities

Ces vues permettent :

-   Vue globale consolidée
-   Vue comparative entre entités
-   Vue par domaine à l'échelle groupe
-   Drill-down vers entité

------------------------------------------------------------------------

# 6️⃣ Cas d'Usage Fonctionnels

## Vue Groupe Globale

Total consommation groupe par mois

## Vue par Entité

Classement des entités par coût

## Vue Domaine Groupe

Consommation groupe par domaine

## Drill-down

Groupe → Entité → Domaine → Application → Produit

------------------------------------------------------------------------

# 7️⃣ Gouvernance & Cohérence

Pour garantir cohérence inter-entités :

-   Référentiel domaine harmonisé
-   Référentiel produit aligné
-   Versioning des Pricing Views
-   Contrat de données commun validé

Chaque entité reste libre de son implémentation locale mais doit
respecter le contrat groupe.

------------------------------------------------------------------------

# 8️⃣ Performance & Scalabilité

La base Groupe :

-   Agrège uniquement des données déjà calculées
-   Ne recalculera pas les règles Direct / Indirect
-   Utilise MVs indexées
-   Supporte montée en volumétrie progressive

La charge est linéaire avec le nombre d'entités.

------------------------------------------------------------------------

# 9️⃣ Sécurité & Isolation

-   Les entités ne voient que leurs données locales
-   La base Groupe est accessible uniquement aux profils consolidés
-   Séparation logique stricte des environnements

------------------------------------------------------------------------

# 🔟 Bénéfices de la Vision Groupe

-   Consolidation financière globale
-   Comparaison inter-entités
-   Pilotage stratégique
-   Scalabilité horizontale
-   Architecture fédérée et modulaire

------------------------------------------------------------------------

# Conclusion

La vision FinOps Groupe repose sur :

✔ Autonomie locale\
✔ Consolidation centrale\
✔ Modèle de données harmonisé\
✔ Agrégation via Materialized Views Groupe\
✔ Extensibilité future (reporting, forecasting, KPI groupe)

Cette approche permet de construire une architecture FinOps
multi‑entités robuste, évolutive et adaptée à une organisation
structurée en groupe.
