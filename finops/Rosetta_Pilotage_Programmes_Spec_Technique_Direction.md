# Rosetta V2
# Spécification Technique & Conception
# Module Pilotage de Programmes (Direction des Programmes)

---

# 1. Objectif du Document

Ce document décrit la conception technique cible du module **Pilotage de Programmes** de Rosetta V2, destiné à la Direction des Programmes.

Il précise :

- Le modèle de données
- Les flux
- Les mécanismes d’agrégation
- Les principes d’industrialisation
- Les impacts performance
- L’intégration entité / groupe

Ce module doit permettre le pilotage transverse de programmes stratégiques sans développement spécifique à chaque initiative.

---

# 2. Principes d’Architecture

## 2.1 Principes Directeurs

- Configuration > Développement spécifique
- Réutilisabilité maximale
- Agrégation multi-niveaux (application → entité → groupe)
- Historisation complète
- Séparation configuration / données / calcul

## 2.2 Positionnement dans Rosetta V2

Le module repose sur :

- Référentiel cartographique (pivot applications / groupes)
- DataMart PostgreSQL
- API Rosetta
- Dashboard Backstage

---

# 3. Modèle de Données Technique

## 3.1 Table programme

- id (UUID)
- name
- description
- sponsor
- scope_level (ENTITY | GROUP | GLOBAL)
- start_date
- end_date
- status (ACTIVE | CLOSED)
- created_at
- created_by

## 3.2 Table programme_indicator

- id
- programme_id (FK)
- name
- type (BOOLEAN | PERCENTAGE | SCORE | STATUS | NUMERIC)
- weight
- calculation_mode (MANUAL | IMPORT | AUTO)
- aggregation_mode (AVG | SUM | MAX | WEIGHTED)

## 3.3 Table programme_application_value

- id
- programme_id
- indicator_id
- application_id
- entity_id
- value
- status_validation
- updated_at
- updated_by

## 3.4 Table programme_entity_aggregate (Materialized View)

Agrégation par entité :

- programme_id
- entity_id
- completion_rate
- maturity_score
- last_update

## 3.5 Table programme_group_aggregate (Materialized View)

Agrégation multi-entités :

- programme_id
- completion_rate_global
- ranking_entities
- maturity_distribution

---

# 4. Flux Fonctionnels

## 4.1 Création Programme

Admin Groupe :

1. Création programme
2. Définition indicateurs
3. Définition méthode agrégation
4. Activation

Aucun développement spécifique requis.

---

## 4.2 Mise à jour progression

Modes possibles :

- Saisie manuelle
- Import API externe
- Calcul automatique via croisement FinOps / Monitoring / Référentiel

---

## 4.3 Agrégation Automatique

Process batch nightly :

1. Lecture valeurs applications
2. Calcul score application
3. Calcul score entité
4. Calcul score groupe
5. Refresh materialized views

---

# 5. Intégration Modules Existants

## 5.1 Référentiel

Pivot : application_id

Permet :

- Agrégation par groupe hiérarchique
- Agrégation par direction
- Filtrage organisationnel

## 5.2 FinOps

Indicateurs automatiques possibles :

- % apps avec visibilité coûts
- % apps avec budget défini

## 5.3 Monitoring

- % apps avec SLO
- % apps avec MTTR < seuil

---

# 6. Vues & Reporting

## 6.1 Vue Entité

- Taux complétion global
- Répartition par équipe
- Courbe progression temporelle

## 6.2 Vue Groupe

- Classement entités
- Heatmap maturité
- Courbe adoption globale

## 6.3 Vue Application

- Statut par programme
- Historique évolution

---

# 7. Performance & Scalabilité

Hypothèses :

- 800 applications par entité
- 10 entités
- 5 programmes simultanés

Volumétrie estimée :

800 x 10 x 5 = 40 000 lignes programme_application_value

Charge faible pour PostgreSQL.

Agrégation via materialized views :

- Temps refresh estimé < 1 seconde
- Lecture dashboard < 200 ms

---

# 8. Gouvernance

- RBAC : Admin Programme / Admin Entité / Lecture seule
- Journalisation complète (création, modification, validation)
- Historisation des versions de programme
- Possibilité de clôture officielle

---

# 9. Sécurité

- Authentification via OIDC
- Scope programme validé côté API
- Séparation données entité / groupe
- Aucune donnée opérationnelle sensible exposée

---

# 10. Avantages Stratégiques

- Industrialisation du pilotage transverse
- Réduction dépendance Excel
- Consolidation automatique multi-entités
- Vision directionnelle homogène
- Réutilisable pour tous futurs programmes

---

# 11. Roadmap d’Implémentation

Phase 1 :
- Modèle données
- API CRUD programmes
- Vue entité simple

Phase 2 :
- Agrégation groupe
- Dashboard consolidé
- Historisation

Phase 3 :
- Intégration auto FinOps / Monitoring
- Scoring maturité avancé

---

# 12. Conclusion

Le module Pilotage de Programmes transforme Rosetta en outil stratégique de gouvernance.

Il permet :

- Suivi structuré initiatives transverses
- Comparabilité entités
- Pilotage directionnel consolidé
- Industrialisation reporting

Architecture conçue pour :

- Scalabilité
- Réutilisabilité
- Performance
- Gouvernance maîtrisée

Fin du document.
