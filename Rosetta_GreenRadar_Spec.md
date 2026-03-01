# Rosetta – Module GreenRadar  
## Spécification Fonctionnelle & Technico-Conception

---

# 1. Introduction

## 1.1 Contexte

Dans le cadre des engagements RSE et de la stratégie de décarbonation portée par le Groupe, la maîtrise des émissions liées aux infrastructures IT devient un enjeu stratégique.

Rosetta, en tant que plateforme de pilotage IT, dispose déjà d’un socle de données consolidé via le module FinOps (fact_consumption).  
Le module **GreenRadar** s’appuie sur ce socle pour proposer une vision environnementale structurée et exploitable.

GreenRadar transforme Rosetta en un outil de :

- Pilotage environnemental IT
- Suivi d’émissions CO2 liées aux usages IT
- Support aux décisions d’optimisation énergétique
- Alignement avec les objectifs RSE Groupe

---

# 2. Vision Fonctionnelle

## 2.1 Objectif du Module

GreenRadar permet de :

- Mesurer les émissions CO2 liées aux consommations IT
- Agréger les émissions par application, groupe et domaine
- Visualiser les tendances d’émissions
- Identifier les principaux contributeurs
- Soutenir les stratégies de réduction carbone

---

# 3. Périmètre Fonctionnel

## 3.1 Indicateurs Clés

Le module propose :

- Emission CO2 mensuelle par application
- Emission CO2 cumulée annuelle
- Emission CO2 par domaine
- Top émetteurs
- Evolution mensuelle
- Ratio CO2 / coût (optionnel)
- Emission par environnement (si disponible)

---

## 3.2 Vues Disponibles

### Vue Globale Entité

- Emissions totales du mois
- Evolution vs mois précédent
- Répartition par domaine
- Top 10 applications émettrices

### Vue par Application

- Emissions mensuelles
- Tendance sur 12 mois
- Contribution par domaine
- Comparaison coût vs CO2

### Vue Organisationnelle

- Emissions par groupe organisationnel
- Radar de répartition
- Indicateurs de concentration

---

# 4. Bénéfices Stratégiques

## 4.1 Pour la Direction RSE

- Mesure concrète des émissions IT
- Données fiables et historisées
- Base de reporting consolidé
- Support aux objectifs de décarbonation

## 4.2 Pour les Managers IT

- Identification des zones d’optimisation
- Corrélation coût / impact environnemental
- Priorisation des actions techniques

## 4.3 Pour les Architectes

- Indicateur supplémentaire dans les arbitrages
- Evaluation des choix d’architecture
- Support aux stratégies cloud responsable

---

# 5. Modèle Conceptuel

## 5.1 Hypothèse de Base

Chaque produit IT dispose d’un :

- Prix unitaire
- Facteur d’émission CO2 par unité d’œuvre

Formule :

CO2 = quantity × co2_factor

Le calcul repose sur la table fact_consumption existante.

---

# 6. Spécification Technico-Conception

## 6.1 Modèle de Données

Extension de la dimension produit :

Table dim_product :

- product_id
- product_name
- unit
- price
- co2_factor
- valid_from
- valid_to

La version du facteur CO2 est historisable.

---

## 6.2 Calcul CO2

Approche retenue : Calcul via Materialized View

Création d’une materialized view :

mv_co2_by_app_month

Jointure :

fact_consumption
JOIN dim_product

Agrégation :

SUM(quantity × co2_factor)

Avantages :

- Simplicité
- Pas de recalcul batch supplémentaire
- Performance optimisée via index

---

## 6.3 Materialized Views Préconisées

- mv_co2_by_app_month
- mv_co2_by_group_month
- mv_co2_by_domain_month

Index sur :

- month
- app_id
- group_id
- domain_id

---

## 6.4 APIs

Endpoints :

GET /green/summary?month=YYYY-MM  
GET /green/app/{appId}?month=YYYY-MM  
GET /green/group/{groupId}?month=YYYY-MM  

Réponses JSON structurées, prêtes pour dashboards.

---

## 6.5 Frontend

Nouvel onglet : "GreenRadar"

Widgets :

- KPI global CO2
- Graphique évolution mensuelle
- Top 10 applications
- Répartition par domaine

Séparation claire entre :
- FinOps (€)
- GreenRadar (CO2)

---

# 7. Gouvernance des Facteurs CO2

Les facteurs CO2 :

- Peuvent évoluer dans le temps
- Doivent être versionnés
- Sont gérés dans le référentiel produit
- Peuvent être mis à jour par admin FinOps

Les changements n’impactent pas rétroactivement les périodes figées.

---

# 8. Performance

Le calcul étant basé sur :

- fact_consumption déjà indexée
- join simple
- agrégation mensuelle

Impact performance estimé faible.

Refresh MV intégré au cycle existant.

---

# 9. Roadmap d’Implémentation

Etapes :

1. Ajout champ co2_factor dans dim_product
2. Création MV CO2
3. Exposition API
4. Développement dashboard
5. Validation données réelles

Effort estimé : 5 à 8 jours après FinOps V2.

---

# 10. Positionnement Stratégique

GreenRadar transforme Rosetta en :

- Plateforme FinOps & Green IT
- Outil de pilotage budgétaire et environnemental
- Support aux objectifs RSE Groupe
- Levier de transformation durable

Il renforce la valeur stratégique de Rosetta au-delà du simple pilotage financier.

---

# 11. Conclusion

GreenRadar s’intègre naturellement au socle Rosetta V2.

Il repose sur l’architecture existante,  
nécessite un effort limité,  
et apporte une forte valeur stratégique.

Il positionne Rosetta comme une plateforme moderne,  
alignée avec les enjeux financiers et environnementaux du Groupe.
