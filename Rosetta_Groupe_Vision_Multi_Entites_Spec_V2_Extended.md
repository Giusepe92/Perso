# Rosetta Groupe — Spécification Fonctionnelle Complète Vision Multi‑Entités (V2)

> Version enrichie intégrant : navigation transverse, deep-link vers Rosetta Entité, gouvernance, benchmarking, maturité, qualité des données et supervision groupe.

---

# 1. Vision Stratégique

Rosetta Groupe est la couche transverse du dispositif Rosetta V2.

Chaque entité :
- Dispose de sa propre instance Rosetta (Backstage + microservices + bases).
- Calcule ses données localement.
- Gère sa gouvernance locale.

Le niveau Groupe :
- Consolide les données validées.
- Fournit une vue comparative.
- Permet la navigation transverse.
- Offre des indicateurs de pilotage stratégique.
- Redirige vers les vues détaillées des entités lorsque nécessaire.

---

# 2. Principe Fondamental

## 2.1 Autonomie locale + Consolidation centrale

- Les calculs restent côté entité.
- Le groupe ne recalcul pas les données métiers primaires.
- Le groupe consomme des données agrégées et validées.

## 2.2 Navigation descendante (Deep Linking)

Rosetta Groupe permet :

- De naviguer du global vers l’entité.
- De naviguer du domaine vers l’application.
- De naviguer d’un indicateur vers la page dédiée dans l’instance entité.

Chaque objet consolidé contient :
- entity_id
- namespace
- base_url_entite
- path_view

Le lien est construit dynamiquement pour rediriger vers :
- Vue FinOps domaine entité
- Vue Monitoring application entité
- Vue Référentiel application entité
- Vue Cartographie détaillée

---

# 3. Modèle de Navigation Transverse

## 3.1 Exemple : Vue FinOps Groupe

Utilisateur clique sur :
→ Domaine “Cloud Native”
→ Entité “CA-IDF”

Rosetta Groupe affiche :
- Coût consolidé
- Historique
- Comparaison budgétaire

Bouton : “Voir détail entité”

Redirection vers :
https://rosetta-idf/.../finops/domain/cloud-native

---

## 3.2 Exemple : Vue Monitoring Groupe

Utilisateur clique :
→ Entité “CA-SUD”
→ Taux disponibilité 97%

Rosetta Groupe propose :
“Voir applications concernées”

Puis possibilité :
“Voir application dans Rosetta Entité”

---

## 3.3 Exemple : Cartographie Groupe

Vue cartographique :
Groupe
 → Entité
   → Domaine
     → Application
       → Composants
         → Ressources infra

Au niveau application :
Lien vers instance entité pour voir :
- Détails composants
- Logs
- SLO
- Déploiements

---

# 4. Fonctionnalités Complètes Rosetta Groupe

## 4.1 Dashboard Exécutif Groupe

- KPI globaux consolidés
- Vue comparative entités
- Évolution budgétaire globale
- Indicateurs transformation digitale
- Score maturité plateforme

---

## 4.2 FinOps Groupe

- Coût consolidé multi-entités
- Répartition par domaine
- Benchmark entités
- Dérives budgétaires
- Périodes figées consolidées
- Indicateur conformité budgétaire
- Navigation vers entité

---

## 4.3 Monitoring & SRE Groupe

- Disponibilité globale
- MTTR moyen consolidé
- Deployment frequency comparative
- Failure rate comparative
- Heatmap entités
- Score DORA par entité
- Navigation vers monitoring entité

---

## 4.4 Référentiel Groupe

- Nombre applications par entité
- Croissance patrimoine
- Taux mapping observabilité
- Taux complétude données
- Détection incohérences
- Navigation vers application entité

---

## 4.5 Gouvernance & Audit Groupe

- Taux succès batch par entité
- Historique périodes figées
- Alertes conformité
- Activité admin anormale
- Maturité gouvernance
- Rapport annuel conformité plateforme

---

## 4.6 Indicateurs de Maturité

Chaque entité reçoit un score composite basé sur :
- Couverture référentiel
- Qualité des pivots
- Taux monitoring actif
- Respect SLO
- Discipline freeze budgétaire
- Adoption plateforme

Score exemple :
Platform Maturity Index (PMI)

---

## 4.7 Benchmarking Entités

- Classement coûts
- Classement performance SRE
- Classement complétude data
- Indicateur harmonisation pratiques
- Détection best practices

---

# 5. Flux de Données Entité → Groupe

## 5.1 Données Remontées

### FinOps
- Coût par domaine
- Coût par application (agrégé)
- Évolution mensuelle
- Statut période

### Monitoring
- SLO global
- MTTR
- DORA consolidé
- Incidents critiques

### Référentiel
- Comptage entités
- Taux complétude
- Mapping technique

### Gouvernance
- Résumé audit
- Résumé run
- Anomalies critiques

---

# 6. Ce qui reste Local à l’Entité

- Données brutes
- Logs détaillés
- Déploiements live
- Modification référentiel
- Workflow approbation
- Recalcul FinOps

---

# 7. Sécurité & Accès

- Rôles Groupe distincts
- Pas d’accès direct DB entité
- Accès uniquement via liens sécurisés
- Respect périmètre RBAC entité

---

# 8. Cas d’Usage Stratégiques

## 8.1 Direction Groupe
- Vision consolidée
- Arbitrage budgétaire
- Maturité digitale
- Pilotage transformation

## 8.2 Infrastructure KGIP
- Consommation globale infra
- Détection surcharge cluster
- Harmonisation pratiques DevOps

## 8.3 Contrôle Interne
- Conformité freeze
- Audit transversal
- Traçabilité gouvernance

---

# 9. Bénéfices Clés

- Autonomie locale préservée
- Consolidation transverse
- Navigation intelligente
- Transparence Groupe
- Vision pilotage 360°
- Scalabilité progressive

---

# 10. Évolutions Futures

- Score ESG digital
- IA prédictive multi-entités
- Détection automatique anomalies
- Recommandations budgétaires
- Alertes maturité faible

---

# 11. Conclusion

Rosetta Groupe devient :
- La tour de contrôle transverse
- Le cockpit stratégique digital
- Le socle de pilotage multi-entités

Consolider sans centraliser l’opérationnel.

Chaque entité reste souveraine.
Le groupe pilote la performance, la cohérence et la maturité.

Fin du document.
