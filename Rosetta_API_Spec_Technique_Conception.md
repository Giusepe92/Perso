# Rosetta -- Spécification Technique & Conception des APIs

## Architecture API-First pour la plateforme Rosetta

------------------------------------------------------------------------

# 1. Objectif

Ce document décrit la conception technique complète permettant à Rosetta
d'exposer des APIs structurées, sécurisées et réutilisables à l'échelle
Entité et Groupe.

L'objectif est de positionner Rosetta comme :

-   Provider officiel d'indicateurs IT
-   Source de vérité consolidée
-   Brique d'architecture transverse
-   Plateforme API-first indépendante du front

------------------------------------------------------------------------

# 2. Principes d'Architecture

## 2.1 API-First

-   Toutes les fonctionnalités exposées dans le Front passent par API
-   Aucun accès direct base depuis l'extérieur
-   Contrats API versionnés
-   Documentation OpenAPI générée automatiquement

## 2.2 Séparation des responsabilités

-   Gateway Rosetta : point d'entrée unique
-   Microservices métiers : logique fonctionnelle
-   DataMart PostgreSQL : couche optimisée lecture
-   Mongo (raw zone) : ingestion uniquement

------------------------------------------------------------------------

# 3. Architecture Technique

## 3.1 Composants

-   Rosetta Gateway Backend (Quarkus)
-   Microservice FinOps
-   Microservice Monitoring
-   Microservice Référentiel
-   Module Programmes / KPI
-   PostgreSQL DataMart
-   OIDC (JWT)

------------------------------------------------------------------------

## 3.2 Flux d'appel

Client externe → OIDC (token JWT) → Gateway Rosetta → Validation scope →
Routing vers microservice → Lecture via materialized views → Réponse
JSON

------------------------------------------------------------------------

# 4. Sécurité & Authentification

## 4.1 Modèle OIDC

-   OAuth2 Client Credentials
-   JWT signé
-   Expiration courte
-   Scope-based access control

## 4.2 Enregistrement d'un client

1.  Demande d'accès
2.  Création client OIDC
3.  Attribution scopes
4.  Validation gouvernance
5.  Monitoring activé

## 4.3 Scopes techniques

-   rosetta.read.finops
-   rosetta.read.monitoring
-   rosetta.read.referential
-   rosetta.read.programs
-   rosetta.read.green

------------------------------------------------------------------------

# 5. Modèle API

## 5.1 Standards

-   REST
-   JSON
-   ISO8601 dates
-   HTTP status codes standard
-   Pagination
-   Filtrage via query params

------------------------------------------------------------------------

## 5.2 Versioning

-   /api/v1/...
-   /api/v2/...
-   Pas de breaking change sans nouvelle version

------------------------------------------------------------------------

# 6. Conception Data

## 6.1 Lecture optimisée

Toutes les APIs s'appuient sur :

-   materialized views
-   index sur clés métier
-   agrégations mensuelles pré-calculées

Aucune requête lourde runtime sur tables brutes.

------------------------------------------------------------------------

# 7. Journalisation & Audit

Chaque appel est loggé :

-   client_id
-   endpoint
-   durée
-   statut HTTP
-   timestamp
-   IP source

Logs centralisés vers ELK / Elisa.

------------------------------------------------------------------------

# 8. Gouvernance API

## 8.1 Catalogue interne

-   Documentation Swagger
-   Description des champs
-   Exemples de payload
-   SLA définis

## 8.2 Rate limiting

-   Limitation configurable
-   Protection contre surcharge
-   Alerting en cas d'abus

------------------------------------------------------------------------

# 9. Performance & Scalabilité

-   APIs stateless
-   Horizontal scaling possible
-   Caching HTTP optionnel
-   Refresh MV nocturne
-   Monitoring métriques API

------------------------------------------------------------------------

# 10. Intégration future

Les APIs peuvent alimenter :

-   DataLake Groupe
-   Outils BI
-   Portail RSE
-   Outils SAM
-   Reporting COMEX
-   Solutions IA prédictives

------------------------------------------------------------------------

# 11. Résilience

-   Timeout configuré
-   Retry côté client recommandé
-   Circuit breaker (optionnel)
-   Monitoring health endpoints

------------------------------------------------------------------------

# 12. Checklist d'Implémentation

-   [ ] Définition contrats API
-   [ ] Mise en place Gateway
-   [ ] Intégration OIDC
-   [ ] Définition scopes
-   [ ] Exposition OpenAPI
-   [ ] Indexation MV
-   [ ] Logging centralisé
-   [ ] Monitoring métriques API
-   [ ] Documentation interne

------------------------------------------------------------------------

# 13. Conclusion

L'exposition API de Rosetta transforme la plateforme en :

-   Backbone data IT
-   Service transverse Groupe
-   Architecture pérenne
-   Socle pour innovations futures

Rosetta devient une plateforme industrialisée, sécurisée et extensible.
