# Rosetta V2 – Module Pilotage de Programmes
## Spécification Fonctionnelle & Positionnement Stratégique
### Entité CAGIP – Crédit Agricole Groupe Infrastructure Plateforme

---

# 1. Contexte & Vision

Dans le cadre de la transformation IT portée par **CAGIP (Crédit Agricole Groupe Infrastructure Plateforme)**, les programmes transverses se multiplient :

- Adoption Cloud
- SRE & fiabilité
- FinOps & maîtrise des coûts
- Conformité & sécurité
- Rationalisation applicative
- Standardisation DevOps

Aujourd’hui, le pilotage de ces programmes repose souvent sur :

- Des reportings Excel
- Des consolidations manuelles
- Des dashboards ad hoc
- Des indicateurs hétérogènes selon les entités

Le module **Pilotage de Programmes** de Rosetta V2 propose une approche structurée, industrialisée et intégrée.

---

# 2. Objectif du Module

Permettre à une entité (CAGIP ou autre entité) de :

- Déclarer des programmes de transformation
- Définir des KPI configurables sans développement spécifique
- Mesurer automatiquement l’adoption
- Identifier les écarts
- Suivre l’évolution dans le temps
- Donner à la direction une vision consolidée et fiable

Ce module transforme Rosetta en véritable cockpit de pilotage stratégique.

---

# 3. Principes Fonctionnels

## 3.1 Un Programme = Une Initiative Stratégique

Un Programme représente :

- Une ambition (ex : 100% apps monitorées)
- Un périmètre (ex : toutes les apps critiques)
- Une période
- Un sponsor
- Un ensemble de KPI mesurables

Exemples :

- Programme “Adoption Monitoring”
- Programme “Conformité SLO”
- Programme “FinOps Readiness”

---

## 3.2 Les KPI = Mesures Déclaratives

Les KPI sont configurables via Rosetta, sans développement spécifique.

Ils se basent sur :

- Le référentiel cartographique (applications, groupes, attributs)
- Les données FinOps
- Les données Monitoring
- Les données de gouvernance

Exemples :

- Tag Dynatrace non vide
- SLO ≥ 99.9%
- Budget FinOps défini
- Owner renseigné

Chaque KPI produit un statut par application (OK / KO).

---

# 4. Mode de Fonctionnement

## 4.1 Création d’un Programme

Un administrateur programme :

1. Crée le programme
2. Définit le périmètre
3. Configure les KPI via un builder déclaratif
4. Prévisualise les résultats
5. Active le programme

---

## 4.2 Évaluation Automatique

- Scan initial automatique lors de l’activation
- Refresh nightly par batch centralisé
- Possibilité de relancer un scan manuellement
- Journalisation complète des exécutions

---

## 4.3 Snapshot Historique

Chaque nuit :

- Calcul du taux global
- Calcul du nombre d’applications conformes
- Enregistrement snapshot

Permet :

- Courbe d’évolution
- Suivi de trajectoire
- Mesure d’efficacité du programme

---

# 5. Vues Disponibles

## 5.1 Vue Liste des Programmes

- Nom
- Statut
- Période
- Taux de conformité
- Dernière exécution
- Actions admin

---

## 5.2 Vue Détail d’un Programme

- Taux global
- KPI détaillés
- Liste des applications non conformes
- Courbe d’évolution
- Filtres organisationnels

---

## 5.3 Vue Application

Dans la fiche application :

- Onglet “Programmes”
- Statut par programme
- Historique

---

# 6. Valeur pour la Direction CAGIP

Ce module permet :

- Vision consolidée des programmes
- Comparabilité interne
- Mesure objective des progrès
- Identification rapide des écarts
- Support aux arbitrages budgétaires
- Traçabilité des actions

Il s’inscrit pleinement dans la stratégie de transformation portée par CAGIP.

---

# 7. Valeur pour les Équipes Techniques

- Visibilité claire des attentes
- Indicateurs transparents
- Feedback immédiat
- Priorisation facilitée
- Alignement avec les objectifs stratégiques

---

# 8. Gouvernance & Sécurité

- Rôles dédiés (Programme Admin / Lecture)
- Journal des exécutions
- Historisation des modifications
- Intégration RBAC Rosetta

---

# 9. Intégration dans Rosetta V2

Le module :

- S’appuie sur le référentiel existant
- Utilise le moteur batch Monitoring
- N’introduit pas de dépendance externe
- Est extensible vers multi-entités (V3)

---

# 10. Positionnement Stratégique

Rosetta V2 devient :

- Un cockpit FinOps
- Un cockpit SRE
- Un cockpit Gouvernance
- Et désormais un cockpit de pilotage des Programmes

Cela permet à CAGIP de :

- Centraliser le pilotage des transformations
- Standardiser les indicateurs
- Industrialiser la mesure d’adoption
- Réduire les reportings manuels

---

# 11. Conclusion

Le module Pilotage de Programmes n’est pas un simple dashboard.

C’est :

- Un cadre structuré
- Une industrialisation des KPI
- Un levier stratégique
- Un outil d’alignement entre IT et Direction

Il renforce la position de Rosetta comme plateforme centrale de pilotage IT au sein de CAGIP.

---

Fin du document.
