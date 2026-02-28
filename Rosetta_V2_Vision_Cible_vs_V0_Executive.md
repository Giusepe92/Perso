# 🌍 Rosetta V2 – Vision Cible & Apport Stratégique
## De la V0 (MVP) à une Plateforme Industrielle de Pilotage IT

**Auteur :** Youssef Messaoudi  
**Contexte :** Présentation exécutive – Direction, Managers IT, Architectes, FinOps, SRE  
**Objectif :** Expliquer l’apport de Rosetta V2 par rapport à la V0 et démontrer les capacités débloquées par la refonte.

---

# 1. Clarification – Qu’est-ce que Rosetta ?

Rosetta est le **portail IDP du groupe**, construit autour de Backstage et enrichi par nos microservices métiers.

Rosetta =  
- Backstage (UI + backend)  
- Plugins Rosetta  
- Microservices APIs (FinOps, Monitoring, Référentiel)  
- Batchs d’industrialisation  
- Data Marts PostgreSQL  
- Intégrations (Dynatrace, ServiceNow, ArgoCD, GitLab, ELISA)

Rosetta V2 représente **la plateforme cible industrialisée**, vers laquelle nous faisons évoluer le projet.

---

# 2. Où en sommes-nous aujourd’hui ? (V0 / MVP)

## 🎯 Objectif de la V0
Aller vite. Démontrer la valeur. Déployer rapidement.

## ⚙️ Caractéristiques actuelles

- Un microservice unique regroupant plusieurs logiques
- Calculs FinOps limités (2–3 domaines)
- Règles hétérogènes non uniformisées
- Peu ou pas d’historisation
- Pas de data mart structuré
- Pas de pricing views budgétaires
- Pas de RBAC complet
- Peu de logs et traçabilité batch
- Monitoring partiellement live
- Pas de vision consolidée direction

La V0 est volontairement pragmatique et rapide, mais :
- non industrialisée,
- peu gouvernée,
- difficilement extensible,
- limitée pour le pilotage stratégique.

Elle servira de base déployée en production, mais sera considérée comme **legacy transitoire**.

---

# 3. Pourquoi une V2 ?

La V2 n’est pas une simple évolution technique.

C’est une **refonte architecturale et conceptuelle** visant à :

- industrialiser les traitements,
- normaliser les modèles de données,
- introduire la gouvernance,
- rendre possible le pilotage directionnel,
- rendre la plateforme extensible multi-entités.

---

# 4. Ce que la V2 apporte (vs V0)

## 4.1 Industrialisation

| V0 | V2 |
|----|----|
| Calculs dans un MS unique | Microservices spécialisés |
| Pas de data mart | Data Marts PostgreSQL + MVs |
| Traitements ad hoc | Batchs Cron industrialisés |
| Peu de logs | Runs historisés & auditables |
| Pas de reprocess maîtrisé | Relance contrôlée & versionnée |

---

## 4.2 Gouvernance & Sécurité

| V0 | V2 |
|----|----|
| Accès basique | RBAC basé AD |
| Pas de workflow structuré | Approvals référentiel |
| Peu d’audit | Audit complet des actions sensibles |
| Logique implicite | Gouvernance explicite par rôle |

---

## 4.3 FinOps

V2 introduit :

- séparation coûts directs / indirects
- logique coefficientielle maîtrisée
- pricing views budgétaires
- historique mensuel consolidé
- comparaisons multi-visions
- capacité de recalcul contrôlée
- data contract clair

Débloque :

- arbitrage budgétaire
- reforecast structuré
- vision portefeuille multi-entités
- capacité de benchmark futur

---

## 4.4 Monitoring & Pilotage Opérationnel

V2 permet :

- consolidation incidents + changes
- SLO historisés
- Golden Signals agrégés
- DORA (progressif)
- corrélation déploiement ↔ incidents
- dashboards direction

Débloque :

- pilotage MTTR
- identification apps à risque
- scoring santé applicative
- maturité SRE

---

## 4.5 Référentiel Gouverné

V2 introduit :

- source de vérité cartographique
- workflows d’approbation
- pivots d’intégration standardisés
- séparation entité / groupe / application

Débloque :

- vision portefeuille consolidée
- intégrations fiables
- suppression YAML massif
- extensibilité vers sécurité, tech radar, compliance

---

# 5. Cas d’usage débloqués uniquement en V2

1. Comparer les coûts avec différentes visions budgétaires
2. Recalculer proprement un trimestre
3. Avoir un historique stable multi-années
4. Consolider incidents + coûts + delivery
5. Benchmark multi-entités (future vision groupe)
6. Score global application (coût + qualité + delivery)
7. Auditabilité complète (qui a déclenché quoi)
8. Extension future vers DevSecOps / compliance

---

# 6. Ce que la V2 change pour la Direction

La V2 transforme Rosetta :

De :
- un portail démonstrateur technique

Vers :
- une plateforme de pilotage stratégique

Elle permet :

- transparence financière IT
- consolidation qualité de service
- priorisation investissement
- vision portefeuille multi-entités
- industrialisation reporting

---

# 7. Ce que la V2 change pour les équipes

## Développeurs
- cockpit applicatif clair
- moins de reporting manuel
- visibilité coût & qualité

## FinOps
- modèle structuré & historisé
- pricing views
- traçabilité

## SRE
- consolidation incidents + métriques
- DORA progressif
- corrélations

## Architectes
- modèle extensible
- standard data contract
- fondation IDP 360

---

# 8. Message clé

La V0 démontre la valeur.  
La V2 rend la valeur durable, gouvernée et scalable.

La V2 est l’étape nécessaire pour passer :
- du POC rapide
- à une plateforme stratégique multi-entités.

---

# 9. Conclusion

Rosetta V2 n’est pas une évolution technique isolée.

C’est la structuration d’une plateforme de pilotage IT transverse :
- coûts,
- qualité,
- delivery,
- gouvernance.

Elle crée un socle industriel permettant :
- l’extension future,
- la consolidation groupe,
- et l’alignement IT & business.

Rosetta V2 est la trajectoire naturelle après la V0.
