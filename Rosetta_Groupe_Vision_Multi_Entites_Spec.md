# Rosetta Groupe — Spécification Fonctionnelle Vision Multi‑Entités

> Document décrivant la logique cible d’une vision Groupe Rosetta, basée sur des instances Rosetta déployées dans chaque entité, avec consolidation des données au niveau Groupe (KGIP).  
> Ce document est volontairement non technique et orienté organisation, gouvernance et cas d’usage.

---

# 1. Vision Générale

## 1.1 Principe Directeur

Chaque entité du Groupe dispose :

- De son propre portail Rosetta (Backstage)
- De ses microservices (FinOps, Monitoring, Référentiel, Gov)
- De ses bases de données (PostgreSQL, datamarts, audit)
- De ses batchs locaux
- De sa gouvernance locale

Le **niveau Groupe (KGIP)** dispose :

- D’un portail Rosetta Groupe dédié
- De services consolidés (FinOps Groupe, Monitoring Groupe, Référentiel Groupe)
- D’une base de données consolidée
- D’une vue transverse multi‑entités
- D’un rôle de pilotage, gouvernance et supervision globale

---

# 2. Architecture Fonctionnelle Logique

## 2.1 Niveau Entité

Chaque entité est autonome :

- Calcule ses coûts FinOps
- Consolide ses métriques Monitoring
- Gère son référentiel
- Gère ses périodes figées
- Produit ses rapports locaux

Elle est responsable :
- De la qualité de ses données
- De la validation locale
- De l’activation de ses domaines

---

## 2.2 Niveau Groupe

Le niveau Groupe ne fait pas de calcul métier primaire.

Il :
- Reçoit des données consolidées des entités
- Agrège par entité
- Fournit des vues comparatives
- Sert à la direction et aux équipes transverses

Il ne :
- Gère pas les détails opérationnels live
- Ne remplace pas l’instance entité
- N’intervient pas dans les workflows locaux

---

# 3. Flux de Données

## 3.1 Logique de Consolidation

Chaque entité envoie périodiquement (ex: nightly) :

- Données FinOps consolidées (par domaine, par application, par période)
- Indicateurs Monitoring consolidés (SLO, DORA, incidents agrégés)
- Indicateurs référentiels (volumétrie, couverture, qualité)
- Résumés d’audit et d’exécution batch

Les données envoyées sont :
- Agrégées
- Nettoyées
- Non sensibles
- Déjà validées localement

---

## 3.2 Types de Données Remontées

### FinOps

- Coût total par entité
- Coût par domaine
- Coût par famille (optionnel)
- Évolution mensuelle
- Indicateurs budgétaires

### Monitoring

- Taux disponibilité global
- MTTR moyen
- Fréquence de déploiement
- Taux incidents critiques
- Indicateurs DORA consolidés

### Référentiel

- Nombre d’applications
- Nombre de composants
- Taux complétude référentiel
- Taux de mapping monitoring

### Gouvernance

- Taux de succès batch
- Nombre d’actions admin critiques
- Périodes figées par entité
- Alertes de non-conformité

---

# 4. Cas d’Usage Niveau Groupe

## 4.1 Direction Groupe

- Vue comparée des coûts entre entités
- Détection dérives budgétaires
- Comparaison maturité DevOps (DORA)
- Suivi qualité des données
- Indicateurs transformation digitale

---

## 4.2 Équipes Infrastructure (KGIP)

- Vision consommation infra multi-entités
- Identification surcharge cluster
- Comparaison environnements
- Détection entités en sous-performance
- Suivi des SLO globaux

---

## 4.3 Gouvernance & Contrôle

- Traçabilité des périodes figées
- Détection d’anomalies d’audit
- Cohérence des pratiques
- Conformité aux standards groupe

---

# 5. Fonctionnalités Clés du Portail Rosetta Groupe

## 5.1 Dashboard Exécutif

- Vue consolidée multi-entités
- KPI globaux
- Graphiques comparatifs
- Classement entités

## 5.2 Vue FinOps Groupe

- Coût consolidé
- Part par entité
- Évolution historique
- Comparaison budgétaire

## 5.3 Vue Monitoring Groupe

- Indicateurs SRE globaux
- Heatmap disponibilité
- Classement DORA
- Incidents critiques par entité

## 5.4 Vue Référentiel Groupe

- Couverture applicative
- Qualité mapping observabilité
- Croissance patrimoine applicatif

## 5.5 Vue Gouvernance

- Périodes figées
- Conformité processus
- Activité admin anormale
- Indicateurs maturité

---

# 6. Ce qui n’est PAS dans la Vue Groupe

- Pas de détails par composant technique
- Pas d’accès aux données brutes
- Pas de modification locale
- Pas de workflows d’approbation entité
- Pas d’opérations live

La Vue Groupe est :
- Décisionnelle
- Consolidée
- Comparative
- Orientée pilotage

---

# 7. Gouvernance du Modèle

## 7.1 Responsabilités Entité

- Calcul correct des données
- Validation avant export
- Respect des contrats de données
- Sécurité des exports

## 7.2 Responsabilités Groupe

- Agrégation cohérente
- Standardisation des indicateurs
- Comparabilité entre entités
- Pilotage transverse

---

# 8. Bénéfices Stratégiques

- Vision 360° multi-entités
- Pilotage budgétaire consolidé
- Harmonisation DevOps
- Mesure maturité digitale
- Transparence infra
- Support à la décision stratégique

---

# 9. Évolution Future Possible

- Benchmark automatique entités
- Score maturité plateforme
- Alertes groupe
- Simulation budgétaire multi-entités
- IA prédictive transverse
- Indicateur “Platform Maturity Index”

---

# 10. Conclusion

Le modèle Rosetta multi-entités permet :

- Autonomie locale forte
- Gouvernance centrale structurée
- Consolidation sans perte d’indépendance
- Vision stratégique Groupe
- Scalabilité progressive

Chaque entité reste propriétaire de ses données opérationnelles,  
le Groupe pilote la performance, la maturité et la cohérence.

Fin du document.
