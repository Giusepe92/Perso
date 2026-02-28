# 🚀 Rosetta – Roadmap Post-V2
## Vision d’évolution vers une IDP 360° Enterprise

Auteur : Youssef Messaoudi  
Version : Post-V2 Strategy  
Objectif : Définir les évolutions futures possibles de Rosetta après V2, leurs dépendances, leur valeur business et leur niveau de maturité.

---

# 1. Contexte

Avec Rosetta V2, nous disposons désormais de :

- Référentiel cartographique gouverné
- Module FinOps structuré (Data Mart + Pricing Views)
- Module Monitoring (Dynatrace + ServiceNow + Deployments + Logs)
- Architecture microservices propre (API + Batch + Materialized Views)
- Pivot applicatif central (mapping multi-outils)
- Intégration Backstage native

Cette base permet d’évoluer vers une IDP 360° structurée autour de la gouvernance, de la performance, du coût et de l’expérience développeur.

---

# 2. Logique d’évolution

La roadmap est structurée selon :

1. Quick Wins post-V2 (réalisables rapidement)
2. Extensions naturelles (pilotage avancé)
3. Transformation stratégique (Platform as a Product)
4. Vision long terme / innovation

Chaque use case mentionne :
- Objectif
- Prérequis
- Dépendances techniques
- Estimation
- Contraintes / enjeux

---

# 3. Phase 1 – Quick Wins (3 à 6 mois)

## 3.1 Application Health Score

Objectif :
Créer un score global combinant :
- SLO
- Incidents
- Déploiements
- Coûts

Prérequis :
- Monitoring stable
- FinOps stable
- Référentiel complet (ownership)

Dépendances :
- Materialized views cross-modules
- Endpoint agrégateur

Estimation :
3–4 semaines

Contraintes :
- Définition claire des pondérations
- Validation métier

---

## 3.2 Vue Direction consolidée

Objectif :
Dashboard portefeuille :
- Coût total
- Disponibilité moyenne
- Taux incident
- Fréquence déploiement

Prérequis :
- Agrégations domaine/groupe
- Mapping entité stable

Estimation :
2–3 semaines

Contraintes :
- Cohérence KPI inter-domaines

---

## 3.3 DORA Metrics (Version Light)

Objectif :
- Deployment frequency
- MTTR
- Change failure rate (approximée)

Prérequis :
- Historisation déploiements
- Historisation incidents

Estimation :
4–6 semaines

Contraintes :
- Corrélation incident ↔ déploiement

---

# 4. Phase 2 – Extensions Naturelles (6 à 12 mois)

## 4.1 Capacity Planning

Objectif :
Projection :
- Saturation cluster
- Prévision coût infra

Prérequis :
- Historique métriques long terme
- Historique coûts

Estimation :
6–8 semaines

Contraintes :
- Qualité métriques
- Complexité modèles prédictifs

---

## 4.2 Radar technologique

Objectif :
Cartographier :
- Versions frameworks
- Obsolescence
- Vulnérabilités

Prérequis :
- Extraction métadonnées repo
- Intégration SCA/SAST

Estimation :
8–10 semaines

---

## 4.3 Score DevEx

Objectif :
Mesurer :
- Temps onboarding
- Friction pipeline
- Temps build

Prérequis :
- Historique CI/CD
- Historique déploiement

Estimation :
6 semaines

---

# 5. Phase 3 – Platform as a Product (12 à 24 mois)

## 5.1 Self-Service Infrastructure

Objectif :
Provisionnement via Rosetta :
- Namespace
- Repo template
- Monitoring activation
- Tagging FinOps

Prérequis :
- Templates GitLab
- APIs infra automatisées

Estimation :
3–6 mois

Contraintes :
- Gouvernance forte
- Automatisation robuste

---

## 5.2 Marketplace interne

Objectif :
Catalogue composants certifiés :
- Templates validés
- Golden paths
- Services standards

Prérequis :
- Référentiel mature
- Process certification

Estimation :
6 mois

---

## 5.3 Enforcement Governance

Objectif :
Bloquer :
- Déploiement sans owner
- Application non conforme SLO
- Absence tagging FinOps

Prérequis :
- Intégration pipelines
- API policies

Estimation :
8 semaines

---

# 6. Phase 4 – Vision Long Terme / Innovation

## 6.1 Intelligence Platform (IA)

Objectif :
- Détection anomalie coût
- Détection anomalie incidents
- Corrélation prédictive

Prérequis :
- Historique data 12+ mois
- Data warehouse consolidé

Estimation :
6–9 mois

---

## 6.2 Vision Groupe Multi-Entité

Objectif :
- Benchmark entités
- Consolidation groupe

Prérequis :
- Normalisation modèle données
- Synchronisation multi-FinOps

Estimation :
4–6 mois

---

## 6.3 Compliance & DevSecOps avancé

Objectif :
- Score sécurité
- Conformité RGPD
- Audit automatique

Prérequis :
- Intégration scanners sécurité

Estimation :
6 mois

---

# 7. Dépendances transverses

Les évolutions reposent sur :

- Référentiel fiable et gouverné
- Data Mart stable
- Historisation longue durée
- Normalisation pivots outils
- RBAC structuré (AD Groups)
- API contract stable

---

# 8. Priorisation stratégique

Niveau | Use Case | Complexité | Valeur Business
Court terme | Health Score | Moyenne | Élevée
Court terme | Vue Direction | Faible | Très élevée
Moyen terme | DORA | Moyenne | Élevée
Moyen terme | Capacity Planning | Haute | Élevée
Long terme | Self-Service | Très haute | Structurante
Long terme | IA prédictive | Très haute | Différenciante

---

# 9. Conclusion

Rosetta V2 est la fondation.

Les évolutions futures transforment Rosetta en :

- Cockpit IT transverse
- Plateforme de gouvernance
- IDP stratégique groupe
- Socle d’industrialisation DevSecFinOps
- Outil de pilotage directionnel

Roadmap progressive, maîtrisable et compatible avec l’architecture actuelle.
