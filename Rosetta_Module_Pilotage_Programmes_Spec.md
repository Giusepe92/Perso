# Rosetta V2 — Spécification Fonctionnelle  
# Module Pilotage de Programmes (Niveau Entité & Groupe)

> Objectif : permettre le pilotage transverse de programmes stratégiques (ex : Cloud Migration, Sécurisation, FinOps Adoption, Observabilité, DevOps Maturity, etc.)  
> Conception réutilisable, générique, sans développement spécifique par programme.

---

# 1. Vision Générale

Le module **Pilotage de Programmes** permet :

- Aux entités d’associer des métriques de progression à leurs applications.
- Au niveau Groupe de consolider ces métriques.
- À la direction de visualiser l’adoption et la complétude d’un programme.
- De créer un nouveau programme sans développement spécifique.

Principe fondamental :
> Un programme est une configuration, pas du code.

---

# 2. Problème Résolu

Aujourd’hui, lorsqu’un programme stratégique est lancé (ex : migration cloud, adoption SRE, rationalisation licences), il faut :

- Créer des reporting ad hoc
- Consolider des fichiers Excel
- Refaire des dashboards spécifiques

Ce module permet :

- De définir un programme comme une structure paramétrable
- D’associer des indicateurs à des applications
- De générer automatiquement des vues consolidées

---

# 3. Modèle Conceptuel

## 3.1 Entités Métier

### Programme
- id
- nom
- description
- date_debut
- date_fin
- sponsor
- statut (actif / clos)
- niveau_pilotage (entité / groupe / global)

### Indicateur Programme
- id
- programme_id
- nom_indicateur
- type (booléen, pourcentage, score, statut, numérique)
- mode_calcul (manuel, import, calcul automatique)
- poids (optionnel)

### Association Application → Programme
- application_id
- programme_id
- valeur_indicateur
- date_mise_a_jour
- statut_validation

---

# 4. Fonctionnement Fonctionnel

## 4.1 Création d’un Programme (Admin Groupe)

Un admin peut :

- Créer un programme
- Définir ses indicateurs
- Définir la méthode de calcul
- Définir les règles d’agrégation

Exemple :

Programme : "Cloud Transformation"
Indicateurs :
- % workloads migrés
- Présence tag cloud-ready
- Score conformité sécurité

---

## 4.2 Mise à Jour Côté Entité

Chaque entité peut :

- Déclarer la progression par application
- Ou laisser le système calculer automatiquement
- Ou importer depuis une source externe

---

## 4.3 Agrégation Automatique

Le système permet :

- Agrégation par application
- Agrégation par groupe
- Agrégation par entité
- Agrégation niveau Groupe (multi-entités)

---

# 5. Visualisations Disponibles

## 5.1 Vue Entité

- Taux complétude programme
- Histogramme progression applications
- Classement équipes
- Heatmap adoption

## 5.2 Vue Groupe

- Comparaison entités
- Classement maturité
- Courbe progression globale
- Radar maturité programme

## 5.3 Vue Organisationnelle

- Par domaine
- Par direction
- Par groupe hiérarchique
- Par application

---

# 6. Caractéristiques Clés (Sans Dev Spécifique)

Le système doit :

- Permettre création dynamique programme
- Permettre création dynamique indicateurs
- Permettre association applications sans code
- Générer dashboards génériques
- Supporter plusieurs programmes simultanément
- Être extensible sans développement backend spécifique

---

# 7. Intégration avec Modules Existants

## 7.1 Référentiel

- Applications comme pivot
- Groupes organisationnels
- Relations hiérarchiques

## 7.2 FinOps

Exemple :
- Programme “Optimisation coûts” basé sur seuils FinOps

## 7.3 Monitoring

Exemple :
- Programme “SRE Maturity” basé sur SLO + DORA

---

# 8. Indicateurs Types Supportés

- Booléen (oui/non)
- Pourcentage
- Score sur 100
- Statut (non démarré / en cours / terminé)
- Multi-niveau (bronze / silver / gold)
- Calcul pondéré

---

# 9. Cas d’Usage Stratégiques

## 9.1 Transformation Cloud
- % applications migrées
- % infra modernisée

## 9.2 Adoption FinOps
- % applications avec visibilité coût
- % applications avec budget défini

## 9.3 Sécurisation
- % applications avec SAST
- % avec scans actifs

## 9.4 Observabilité
- % applications monitorées
- % avec SLO définis

---

# 10. Gouvernance

- Programme défini au niveau Groupe
- Déclinaison locale par entité
- Validation possible par admin
- Audit des modifications
- Historisation progression

---

# 11. Bénéfices

- Réutilisable pour tous programmes futurs
- Pas de développement spécifique à chaque initiative
- Vision transverse cohérente
- Comparabilité multi-entités
- Support à la décision stratégique

---

# 12. Évolutions Futures

- Score automatique de maturité
- Détection retard programme
- Alertes direction
- Benchmark externe
- IA prédictive sur complétion

---

# 13. Conclusion

Le module Pilotage de Programmes transforme Rosetta en outil stratégique :

- Pilotage transformation IT
- Mesure adoption initiatives
- Alignement entités
- Suivi transversal Groupe

Un programme devient une configuration déclarative,  
pas un projet technique spécifique.

Fin du document.
