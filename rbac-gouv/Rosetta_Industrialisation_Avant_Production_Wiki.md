# Rosetta – Décision d’Industrialisation avant Mise en Production

## 1. Contexte

En juillet dernier, Rosetta V0 (POC) a été présenté avec succès.  
Cette version avait pour objectif principal :

- Démontrer la valeur de la plateforme
- Illustrer des cas d’usage FinOps et cartographiques
- Valider l’intérêt des entités
- Tester l’intégration Backstage

La V0 reposait sur :

- Import manuel de fichiers Excel
- Stockage MongoDB non structuré (JSON imbriqué)
- Agrégations réalisées côté Frontend
- Cas d’usage limités et démonstratifs

Cette approche était volontairement rapide et exploratoire.

---

## 2. Évolution vers la V1 micro-services

Depuis, Rosetta a évolué vers une architecture micro-services.  
Cette phase a permis :

- De confronter la solution aux vraies règles métier
- D’identifier la complexité des flux CMDB
- De mieux comprendre les modèles de données réels
- De clarifier les besoins d’industrialisation

En parallèle, l’ouverture des flux CMDB (consommations et coûts) a subi un décalage d’environ deux mois, impactant le planning initial de mise en production.

---

## 3. Constat actuel

À 5–6 semaines de la date initialement prévue pour la mise en production, plusieurs constats s’imposent :

1. La V0 n’est pas conçue pour une production durable
2. Les agrégations côté Front limitent l’évolutivité
3. Le modèle de données n’est pas structuré pour l’historisation
4. L’ajout de nouveaux dashboards nécessite du développement spécifique
5. La dette technique serait immédiate en cas de mise en production

Le passage aux flux CMDB impose de toute façon :

- Lecture automatique des données
- Transformation structurée
- Application de règles métier
- Mapping vers les applications
- Batch planifié

La transformation des données est donc incontournable.

---

## 4. Décision stratégique proposée

Plutôt que d’adapter la V0 pour la production,  
nous proposons d’industrialiser directement la plateforme avant mise en production.

Cela signifie :

- Structuration du modèle de données (DataMart PostgreSQL)
- Mise en place d’un moteur batch robuste
- Agrégations réalisées en base via materialized views
- Historisation mensuelle
- APIs propres et évolutives
- Base prête pour les évolutions futures

Ce choix transforme un décalage subi en opportunité d’industrialisation.

---

## 5. Ce qui sera livré dans la première mise en production industrialisée

### 5.1 FinOps structuré

- 3 domaines complets
- Lecture automatique des flux CMDB
- Transformation batch industrialisée
- Historisation mensuelle
- Vue par domaine
- Vue par application
- Agrégations performantes en base

### 5.2 Référentiel exploitable

- Mapping propre applications / composants
- Données consolidées
- Base fiable pour les autres modules

### 5.3 Monitoring simplifié

- 2–3 métriques par application
- Historisation simple
- Vue synthétique globale

### 5.4 APIs stabilisées

- Modèle structuré
- Ajout incrémental de nouvelles vues facilité

---

## 6. Bénéfices attendus

### 6.1 Techniques

- Performance maîtrisée
- Modèle stable
- Réduction de la dette technique
- Historisation native
- Batch traçable

### 6.2 Fonctionnels

- Données fiables
- Dashboards cohérents
- Base prête pour pricing et freeze
- Possibilité d’enrichissement progressif

### 6.3 Stratégiques

- Crédibilité renforcée en production
- Alignement avec une logique plateforme durable
- Passage en mode produit réel
- Accélération future des évolutions

---

## 7. Impact sur la vélocité

L’industrialisation permet d’entrer dans un mode produit incrémental :

Après mise en production :

- Ajouter un nouveau dashboard = nouvelle vue + API + widget
- Ajouter un indicateur = nouvelle agrégation
- Ajouter un domaine = nouveau pipeline de transformation

Les évolutions deviennent rapides et maîtrisées.

---

## 8. Risque évité

Sans industrialisation :

- Refonte inévitable dans 6–9 mois
- Gel des évolutions en production
- Complexité croissante
- Perte de crédibilité auprès des entités

Avec industrialisation :

- Base pérenne
- Croissance maîtrisée
- Évolutivité naturelle

---

## 9. Conclusion

Le choix d’industrialiser avant mise en production est un choix responsable.

Il permet :

- De sécuriser la plateforme
- D’augmenter la vélocité future
- De transformer Rosetta en produit durable
- D’inscrire le projet dans une logique long terme

Ce repositionnement n’est pas un changement d’objectif,  
mais une consolidation stratégique avant production.

Rosetta passe d’un outil démonstratif à une plateforme industrialisée prête à évoluer.
