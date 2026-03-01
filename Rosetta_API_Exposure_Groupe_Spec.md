# Rosetta – Exposition d’APIs Groupe  
## Spécification Fonctionnelle & Technique  
### Rosetta comme plateforme de services data-driven

---

# 1. Introduction

## 1.1 Vision

Rosetta n’est pas uniquement un portail Backstage.

Rosetta est une **plateforme de données structurées**, exposant des APIs sécurisées permettant :

- La consommation des données FinOps
- La consultation des indicateurs Monitoring
- L’accès au référentiel cartographique
- L’exploitation des KPI programmes
- L’intégration dans d’autres outils Groupe

L’objectif est clair :

> Rosetta devient un **provider d’APIs IT structurées** pour le Groupe.

---

# 2. Positionnement Stratégique

## 2.1 Pourquoi exposer les APIs ?

- Réutilisabilité des données
- Interopérabilité avec d’autres plateformes
- Dé-couplage du Front (Backstage)
- Support à l’urbanisation SI
- Réduction des silos data
- Accélération des usages transverses

Rosetta devient une **brique d’architecture transverse**.

---

# 3. Cas d’Usage

## 3.1 Intégration dans d’autres outils

Exemples :

- Dashboard Groupe transverse
- Outil BI / DataLake
- Portail RSE
- Outil SAM / Asset Management
- Outil SRE transverse
- Reporting COMEX
- Automatisation décisionnelle

---

## 3.2 Décommissionnement du Front

Si demain :

- Backstage évolue
- Le front change
- Une entité adopte un autre portail

Les APIs Rosetta restent valides.

Le cœur data est indépendant du front.

---

# 4. Périmètre des APIs Exposées

## 4.1 Référentiel

GET /api/referential/applications  
GET /api/referential/groups  
GET /api/referential/domains  
GET /api/referential/components  

---

## 4.2 FinOps

GET /api/finops/costs?month=YYYY-MM  
GET /api/finops/costs/application/{id}  
GET /api/finops/domains  

---

## 4.3 Monitoring

GET /api/monitoring/metrics/application/{id}  
GET /api/monitoring/slo  
GET /api/monitoring/incidents  

---

## 4.4 KPI / Programmes

GET /api/programs  
GET /api/programs/{id}/results  
GET /api/programs/application/{id}  

---

## 4.5 GreenRadar

GET /api/green/summary  
GET /api/green/application/{id}  

---

# 5. Format des Données

Toutes les APIs exposent :

- JSON structuré
- Schémas contractuels versionnés
- Identifiants stables
- Champs documentés

Principes :

- Pas de structure imbriquée complexe
- Pas de dépendance au modèle UI
- Versionnement API (v1, v2)

---

# 6. Sécurité & Authentification

## 6.1 Modèle

- Authentification via JWT (OIDC)
- Compte service (Client ID / Client Secret)
- Token court-lived
- Scope d’accès par domaine fonctionnel

---

## 6.2 Enregistrement d’un Client

Process :

1. Demande d’accès auprès de Rosetta
2. Création d’un client OIDC
3. Attribution scopes
4. Validation gouvernance
5. Mise en production

---

## 6.3 Scopes Exemple

- rosetta.read.finops
- rosetta.read.monitoring
- rosetta.read.referential
- rosetta.read.programs
- rosetta.read.green

---

# 7. Journalisation & Traçabilité

Chaque appel API :

- Identifie le client technique
- Logge :
  - client_id
  - endpoint
  - timestamp
  - durée
  - code retour
- Possibilité de supervision centralisée

Cela permet :

- Audit
- Traçabilité
- Détection d’usage
- Monitoring des dépendances

---

# 8. Architecture Technique

## 8.1 Positionnement

Les APIs sont exposées via :

Rosetta Gateway Backend

Qui route vers :

- Microservice FinOps
- Microservice Monitoring
- Microservice Référentiel
- Module Programmes

---

## 8.2 Principes

- APIs REST stateless
- Pas de logique UI
- Accès lecture majoritaire
- Requêtes optimisées via materialized views
- Pas d’exposition des tables brutes

---

# 9. Gouvernance

## 9.1 Politique d’Exposition

- APIs publiées dans un catalogue interne
- Documentation OpenAPI
- Contrat versionné
- SLA définis

---

## 9.2 Limitation

- Rate limiting possible
- Monitoring des volumes
- Protection contre abus

---

# 10. Bénéfices Groupe

## 10.1 Pour les Architectes

- Urbanisation claire
- Brique transverse réutilisable
- Indépendance des fronts

## 10.2 Pour la Direction

- Vision consolidée
- Accès structuré aux données
- Support aux décisions data-driven

## 10.3 Pour les Entités

- Intégration simple
- Réutilisation rapide
- Autonomie renforcée

---

# 11. Vision Long Terme

Rosetta devient :

- Source de vérité IT
- Provider d’indicateurs structurés
- API backbone du pilotage IT
- Brique d’architecture Groupe

L’API-first garantit :

- Pérennité
- Scalabilité
- Indépendance technologique
- Evolution contrôlée

---

# 12. Conclusion

Rosetta ne se limite pas à un portail.

Rosetta est une plateforme de services.

L’exposition d’APIs sécurisées permet :

- Réutilisation transverse
- Intégration multi-outils
- Indépendance front
- Industrialisation durable

Cette approche positionne Rosetta comme une brique stratégique dans l’architecture IT du Groupe.
