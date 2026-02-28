# Rosetta V2 — Vision Produit & Fonctionnement Global

> Document de présentation synthétique expliquant la vision, les modules et la logique de fonctionnement de Rosetta V2.  
> Destiné à un profil technique (architecture, infra, FinOps, SAM, plateforme engineering).

---

# 1. Contexte

Rosetta est un portail interne basé sur Backstage.  
La V0 a permis de démontrer rapidement de la valeur : quelques métriques, quelques calculs FinOps, des connexions à ArgoCD et Dynatrace, mais sans structuration industrielle.

La V2 correspond à une refonte architecturale et conceptuelle complète visant à transformer Rosetta en **plateforme transverse de pilotage IT**.

L’objectif n’est plus uniquement d’afficher des données, mais de :

- Structurer un modèle de données cohérent
- Industrialiser les calculs
- Centraliser la gouvernance
- Permettre un pilotage multi-dimensionnel (coûts, performance, maturité, qualité)
- Poser les bases d’un IDP 360 (Internal Developer Platform)

---

# 2. Vision Générale

Rosetta V2 repose sur plusieurs briques fonctionnelles interconnectées :

1. Référentiel cartographique
2. FinOps structuré (datamart)
3. Monitoring & SRE consolidé
4. Gouvernance & Audit
5. RBAC & Sécurité
6. Consolidation Groupe (multi-entités)

Chaque brique est autonome mais interopérable.

---

# 3. Référentiel Cartographique

Le référentiel devient la colonne vertébrale du système.

Il contient :

- Applications
- Groupes / Squads
- Composants
- Relations hiérarchiques
- Pivots techniques (tags Dynatrace, ArgoCD, CMDB, etc.)

Contrairement au catalogue Backstage natif, l’objectif est de :

- Permettre la création via formulaire
- Gérer des workflows d’approbation
- Enrichir les entités avec des métadonnées utiles aux autres modules

Il sert de pivot pour :

- Lier coûts aux applications
- Lier métriques aux composants
- Lier incidents aux équipes
- Lier déploiements aux environnements

---

# 4. Module FinOps V2

La V2 introduit un vrai datamart FinOps sous PostgreSQL.

Concepts clés :

- Domaines (ex: Cloud, Réseau, Natifs…)
- Familles (ex: Kubernetes, Licences…)
- Produits
- Fact consumption (poids / quantités)
- Fact cost (coût appliqué)
- Pricing views (visions budgétaires)
- Périodes actives / figées

La logique est :

1. Ingestion de données brutes
2. Transformation via batch
3. Écriture dans tables structurées
4. Création de materialized views optimisées
5. Affichage via dashboards

Points forts :

- Historisation propre
- Freeze budgétaire
- Comparaison périodes
- Coûts directs et indirects
- Coefficients calculés

Ce n’est plus un calcul ponctuel, mais une logique analytique structurée.

---

# 5. Monitoring & SRE

Le module monitoring consolide :

- Métriques Dynatrace
- Incidents ServiceNow
- Indicateurs DORA
- États de déploiement

Il permet :

- Vue disponibilité globale
- MTTR
- Taux d’échec déploiement
- Fréquence de release
- Heatmaps comparatives

L’idée est de rapprocher performance technique et pilotage métier.

---

# 6. Gouvernance & Audit

Rosetta V2 introduit un module dédié de gouvernance.

Il centralise :

- Journal d’audit
- Exécutions batch
- Freeze/unfreeze
- Activité admin
- Feature flags

Cela permet :

- Traçabilité
- Conformité
- Pilotage transverse
- Contrôle interne

Ce module n’est pas du logging technique, mais de la gouvernance métier.

---

# 7. Sécurité & OIDC

Authentification via OIDC connecté au serveur AD.

Principe :

- L’utilisateur se connecte via AD
- Backstage récupère un token JWT
- Les microservices valident le token
- Les batch utilisent un service account

Cela garantit :

- Séparation utilisateur / machine
- RBAC strict
- Traçabilité complète

---

# 8. Vue Groupe (Multi-Entités)

Chaque entité peut avoir sa propre instance Rosetta.

Un niveau Groupe consolide :

- Coûts
- SLO
- Maturité
- Gouvernance
- Qualité des données

La vue Groupe permet :

- Benchmark entités
- Comparaison maturité
- Pilotage budgétaire consolidé
- Vision infra transverse

Avec navigation descendante vers les Rosetta entité.

---

# 9. Cas d’Usage Clés

Rosetta V2 sert :

- Équipes FinOps (pilotage coût)
- Équipes SAM (visibilité consommation logicielle)
- Équipes SRE (performance & fiabilité)
- Équipes Infra (vision cluster & charge)
- Direction IT (pilotage transverse)
- Contrôle interne (audit & conformité)

---

# 10. Ce que change réellement la V2

Comparé à la V0 :

- Modèle de données propre
- Historisation maîtrisée
- Industrialisation des batch
- Séparation modules
- Gouvernance formalisée
- Vision multi-entités possible
- Scalabilité réelle

Ce n’est plus un outil d’affichage.  
C’est une plateforme structurée.

---

# 11. Ambition Long Terme

Rosetta V2 pose les bases pour :

- Internal Developer Platform mature
- Indicateurs de maturité digitale
- Pilotage budgétaire consolidé
- Harmonisation DevOps
- Score de performance IT
- IA prédictive sur coûts et incidents

---

# 12. Synthèse

Rosetta V2 devient :

- Un socle de cartographie
- Un moteur FinOps structuré
- Un cockpit SRE
- Une couche gouvernance transverse
- Un outil stratégique multi-entités

L’idée centrale est d’unifier :

coûts + performance + référentiel + gouvernance  
dans une architecture cohérente et industrialisée.

---

Fin du document.
