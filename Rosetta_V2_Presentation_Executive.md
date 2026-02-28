# 🌍 Rosetta V2 – Note de Positionnement & Présentation Exécutive
## Une plateforme IDP 360° (FinOps • Monitoring • Référentiel) intégrée à Backstage

**Auteur :** Youssef Messaoudi  
**Version :** V2 – Document de présentation (direction & management)  
**Audience :** Directeurs de programme, managers IT, architectes, FinOps, SRE, responsables d’entités, équipes applicatives

---

# 1) Résumé exécutif (en 1 minute)

Rosetta V2 est la **brique centrale d’une IDP 360°** intégrée à Backstage, qui apporte une vision unifiée et gouvernée de :
- **la cartographie applicative** (référentiel métier/tech),
- **les coûts d’infrastructure et de services** (FinOps),
- **la qualité de service, les incidents, et la performance** (Monitoring).

Rosetta V2 permet de **piloter**, **industrialiser**, et **standardiser** la gouvernance applicative, tout en réduisant la charge déclarative des équipes.  
C’est un accélérateur de **Platform Engineering**, orienté valeur business : transparence des coûts, fiabilité opérationnelle, vitesse de delivery, et pilotage portefeuille.

---

# 2) Pourquoi Rosetta V2 ? (constats)

Dans un SI multi-entités, les difficultés récurrentes sont :
- cartographie incomplète ou non fiable (ownership flou, applications orphelines),
- incapacité à consolider coûts / incidents / qualité de service de manière cohérente,
- dépendance à des fichiers Excel / reporting artisanal,
- duplication des efforts et modèles hétérogènes selon les équipes,
- faible capacité à prioriser les investissements (Run vs Build).

Rosetta V2 répond à ces points via une architecture standard :
**données brutes → normalisation → data marts → APIs → dashboards Backstage**.

---

# 3) Les 3 piliers de Rosetta V2

## 3.1 Référentiel cartographique (la “source de vérité”)
- Catalogue métier (applications) et organisationnel (groupes/squads/entités)
- Ownership : qui est responsable de quoi
- Relations : application ↔ composants ↔ groupes
- Gouvernance : circuit de validation / approbation
- Pivots d’intégration (Dynatrace, ServiceNow, ArgoCD, GitLab, ELISA)

> Objectif : une cartographie gouvernée sans imposer des YAML partout.

## 3.2 FinOps (pilotage des coûts)
- Calcul des consommations par application, par produit, par domaine techno
- Coûts directs et coûts indirects (répartition par coefficients/poids)
- Visions budgétaires (pricing views) : recalcul sur différentes grilles budgétaires
- Historique et tendances mensuelles
- Admin : batch runs, logs, relance manuelle, reprocess

> Objectif : transparence + optimisation + arbitrage budget, avec traçabilité et performance.

## 3.3 Monitoring (pilotage qualité & run)
- Golden signals (latence, erreurs, saturation, throughput)
- Incidents & changes (ServiceNow)
- SLO / SLI & tendances
- Déploiements live + historisation (ArgoCD/GitLab)
- DORA (light puis full)
- Liens contextualisés logs ELISA

> Objectif : réduire MTTR, améliorer disponibilité, renforcer pilotage SRE et direction.

---

# 4) Valeur ajoutée par population (discours ciblé)

## 4.1 Direction / Programmes / Management
**Vous obtenez :**
- un cockpit de pilotage transverse : coûts + qualité + delivery
- une base factuelle pour arbitrer : priorités, budgets, investissements
- une vision portefeuille (top risques, dérives coûts, conformité SLO)
- une trajectoire IDP qui industrialise sans dépendre d’un Excel

**Exemples d’usages :**
- “Quelles applications dérivent en coûts ? Pourquoi ?”
- “Quelles apps sont à risque (incidents récurrents + SLO breach) ?”
- “Quel est l’état de maturité delivery (DORA) par entité ?”

## 4.2 Architectes (logiciel / plateforme)
**Vous obtenez :**
- un modèle de données standard (data contract)
- une architecture modulaire microservices + data marts
- des pivots d’intégration gouvernés (Dynatrace/SN/Argo/ELISA)
- une capacité à étendre vers Security, Tech Radar, Self-service

## 4.3 FinOps / Contrôle de gestion IT
**Vous obtenez :**
- consommation mensuelle par application et domaines
- comparaison par visions budgétaires (pricing views)
- transparence des coûts indirects (poids/coefficients)
- historique long terme + capacité de recalcul
- auditabilité (batch runs, logs, versions)

## 4.4 SRE / Run / Exploitation
**Vous obtenez :**
- consolidation incidents/changes/métriques
- SLO & tendances
- drilldown : app → métrique → incident → logs
- corrélation delivery et qualité

## 4.5 Équipes applicatives (développeurs)
**Vous obtenez :**
- cockpit par application (onglets Backstage)
- moins de reporting manuel
- visibilité coût & qualité pour mieux prioriser
- effort minimal : seulement `catalog-info.yaml` pour les composants réels

## 4.6 Admins (gouvernance)
**Vous obtenez :**
- RBAC clair (rôles AD)
- workflows d’approbation
- écrans admin (runs batch, logs, relances)
- audit (qui a fait quoi)

---

# 5) Atouts différenciants

1. **Standardisation** : modèle unifié coûts + monitoring + cartographie
2. **Gouvernance** : approvals, RBAC, audit
3. **Performance** : data marts Postgres + materialized views
4. **Traçabilité** : runs batch, logs, versions, historisation
5. **Réduction charge déclarative** : pas de YAML partout
6. **Approche incrémentale** : démarrer petit puis étendre
7. **Extensibilité** : Security, Tech Radar, Self-service, IA

---

# 6) Architecture en termes simples

- Les données brutes arrivent (CMDB, Dynatrace…) dans une zone raw (Mongo)
- Un batch normalise et calcule, écrit dans PostgreSQL (data marts)
- Les APIs servent les données de manière stable et rapide
- Backstage affiche les dashboards via plugins Rosetta

---

# 7) Gouvernance & sécurité

- Authentification SSO (OIDC)
- RBAC basé AD : User / Admin Référentiel / Admin FinOps / Admin Monitoring / SuperAdmin
- Contrôle final côté microservices (enforcement)
- Audit des actions sensibles
- Séparation des responsabilités

---

# 8) Trajectoire post-V2 (extraits)

- Health Score global application
- DORA complet & corrélations
- Tech Radar / obsolescence
- DevSecOps (score sécurité)
- Self-service / golden paths
- Vision groupe multi-entité

---

# 9) Conclusion

Rosetta V2 n’est pas un outil de reporting : c’est une **brique structurante** qui met en cohérence :
- la cartographie (qui possède quoi),
- le coût (combien ça coûte),
- la qualité (comment ça se comporte),
- le delivery (comment ça évolue).

Rosetta V2 accélère l’industrialisation et le pilotage transverse multi-entités.
