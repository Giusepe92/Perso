# Rosetta – Architecture Fonctionnelle des APIs Multi‑Entités
## API Gateway Entité + API Gateway Groupe (multi‑tenant)

---

# 1. Objectif du document

Ce document décrit une **architecture fonctionnelle cible** permettant à Rosetta d’exposer des APIs :

- **au niveau Entité** (consommation locale, proche de la donnée et des outils entité)
- **au niveau Groupe** (vision transverse, intégration avec outils Groupe, multi‑tenant)

L’architecture repose sur deux niveaux de passerelles :

1. **Rosetta API Gateway – Entité**
2. **Rosetta API Gateway – Groupe** (multi‑tenant)

---

# 2. Contexte & besoins

## 2.1 Besoin Entité

Chaque entité dispose de sa propre instance Rosetta (Backstage + microservices + bases).  
Les consommateurs entité (équipes IT, équipes FinOps, équipes SRE, etc.) doivent pouvoir :

- requêter des données structurées (FinOps, Monitoring, Référentiel, etc.)
- intégrer Rosetta dans leurs outils locaux (BI, scripts, automations)
- garder l’autonomie et la gouvernance locale

## 2.2 Besoin Groupe

Le Groupe (ex : CAGIP) a besoin d’une capacité transverse :

- agrégation / consolidation multi‑entités
- reporting de maturité / complétude / adoption
- vision FinOps / RSE / SRE groupe
- audit et gouvernance multi‑entités
- intégration avec des outils Groupe (BI, DataLake, portails transverses)

Sans multiplier les intégrations point‑à‑point.

---

# 3. Concept : deux niveaux d’API Gateway

## 3.1 API Gateway Entité

### Rôle

Point d’entrée unique **au sein de l’entité** pour :

- exposer une API publique stable
- centraliser sécurité, scopes, logs, rate limiting
- router vers les microservices Rosetta entité
- masquer la complexité (topologie microservices, bases, versions)

### Use cases typiques

- Portail Rosetta (Backstage) appelle l’API gateway entité
- Outils internes entité consomment des données Rosetta
- Scripts d’optimisation / reporting / automatisation (service accounts)

### Valeur

- découple le Front (Backstage) des microservices
- standardise les appels et accélère l’évolution
- facilite l’observabilité et la gouvernance

---

## 3.2 API Gateway Groupe (multi‑tenant)

### Rôle

Point d’entrée unique **au niveau Groupe** pour :

- offrir une API transverse sur toutes les entités
- permettre à un client Groupe d’appeler *une seule API* (celle du Groupe)
- sélectionner dynamiquement la cible (entité/tenant) via un paramètre de routage
- orchestrer des appels multi‑entités (agrégation, comparaison, benchmark)

### Principe fonctionnel

Un client Groupe appelle :

`GET /api/group/v1/finops/costs?tenant=ENTITE_X&month=2026-01`

La Gateway Groupe :

1. identifie le tenant
2. récupère l’URL de la Gateway Entité (registry)
3. forward l’appel vers la Gateway Entité
4. renvoie la réponse (option : enrichissement / agrégation)

### Use cases typiques

- Dashboard Groupe multi‑entités (FinOps / Green / Monitoring)
- Outil BI Groupe : extraction standardisée
- Indicateurs de maturité par entité
- Audit / gouvernance transverse
- Comparaisons (benchmark) entre entités

### Valeur

- une seule intégration pour le Groupe
- un seul standard d’API
- visibilité transverse immédiate
- capacité à faire évoluer l’écosystème Rosetta en “réseau”

---

# 4. Vue fonctionnelle d’ensemble (simplifiée)

## 4.1 Vue Entité

Consommateurs Entité
→ **Gateway Entité**
→ Microservices (FinOps / Monitoring / Référentiel / Gov…)
→ DataMarts PostgreSQL (+ Raw zone Mongo)

## 4.2 Vue Groupe

Consommateurs Groupe (outils transverses)
→ **Gateway Groupe (multi‑tenant)**
→ (routing tenant)
→ **Gateway Entité** (tenant ciblé)
→ Microservices Entité

Optionnel :
→ agrégation / consolidation / cache côté Groupe

---

# 5. Gouvernance & sécurité (fonctionnel)

## 5.1 Authentification

- Accès Entité : JWT OIDC entité (service accounts + scopes)
- Accès Groupe : JWT OIDC Groupe (service accounts + scopes)
- La Gateway Groupe porte sa propre politique d’accès (scopes multi‑tenant)

## 5.2 Autorisations (RBAC / scopes)

Exemples :

- `rosetta.entite.read.finops`
- `rosetta.entite.read.monitoring`
- `rosetta.group.read.finops`
- `rosetta.group.read.multi_tenant`

Le multi‑tenant nécessite une permission explicite.

## 5.3 Traçabilité

Chaque appel est tracé à deux niveaux :

- Gateway Groupe (qui appelle quoi, quel tenant, quel client)
- Gateway Entité (qui consomme, quel endpoint, quels volumes)

---

# 6. Catalogue des tenants (registry)

La Gateway Groupe doit connaître :

- la liste des tenants (entités)
- l’URL de leur Gateway Entité
- l’état (active/inactive)
- les capacités (modules activés : FinOps, Green, Monitoring…)

Fonctionnellement, c’est un **registry** (référentiel) maintenu par l’équipe plateforme.

Ce registry permet :

- onboarding rapide d’une nouvelle entité
- désactivation temporaire
- routing dynamique
- reporting de couverture du Groupe

---

# 7. Patterns d’usage côté Groupe

## 7.1 Routing simple

La Gateway Groupe forward l’appel vers un tenant ciblé.

## 7.2 Agrégation transverse

La Gateway Groupe exécute N appels (N tenants) puis :

- agrège
- normalise
- renvoie une réponse consolidée

Exemples :

- top entités par coût FinOps
- évolution CO2 multi‑entités
- maturité SLO par entité

## 7.3 Cache Groupe (optionnel)

Pour les vues COMEX / direction :

- snapshots quotidiens
- réduction de charge sur les entités
- temps de réponse stable

---

# 8. Atouts de l’architecture

## 8.1 Pour le Groupe

- une seule API transverse
- intégration simplifiée des outils Groupe
- pilotage multi‑entités
- comparaisons et benchmarks fiables
- gouvernance et audit unifiés

## 8.2 Pour les entités

- autonomie et souveraineté des données
- API locale stable et performante
- maîtrise de la gouvernance et des accès
- onboarding incrémental (modules activés progressivement)

## 8.3 Pour la plateforme Rosetta

- architecture scalable (ajout d’entités sans refonte)
- standardisation des contrats
- observabilité native multi‑niveaux
- découplage front / backend / data

---

# 9. Cas d’usage concrets (exemples)

## 9.1 Vision transverse FinOps

- coûts par entité
- top domaines
- top applications (par entité)
- évolution mensuelle

## 9.2 Vision transverse Green / RSE

- émissions CO2 par entité
- intensité carbone vs coût
- trajectoire de décarbonation

## 9.3 Pilotage SRE / Monitoring

- incidents par entité
- disponibilité / SLO par entité
- maturité observabilité

## 9.4 Gouvernance & audit

- journal des actions admin (entité + groupe)
- complétude référentiel
- adoption Rosetta par entité

---

# 10. Conclusion

L’introduction d’une double passerelle API :

- **Gateway Entité** pour standardiser et industrialiser la consommation locale
- **Gateway Groupe** pour offrir une API transverse multi‑tenant

… permet de transformer Rosetta en une **plateforme multi‑entités**, intégrable à grande échelle, et alignée sur les besoins de pilotage et de gouvernance Groupe.

Cette architecture offre une trajectoire claire :

- V2 Entité : Gateway Entité + APIs stables
- Extension Groupe : Gateway Groupe + registry + agrégations transverses
