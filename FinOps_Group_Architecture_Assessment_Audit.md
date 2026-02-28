# 🧾 Assessment d’Architecture – FinOps Multi‑Entités & Vision Groupe
## Audit professionnel (flux de données, performance, risques, recommandations)

---

# 1) Résumé exécutif

L’architecture proposée repose sur un modèle **fédéré** : chaque entité du groupe dispose de son module FinOps local (batch + data mart + API + UI), et une **vision Groupe** consolide les résultats dans une base centrale dédiée.

Verdict global : **architecture solide, scalable et cohérente** avec la logique FinOps et l’intégration Backstage, à condition de verrouiller :
- un **contrat de données Groupe** strict,
- une stratégie claire de **synchronisation** (batch export vs pull API),
- un **modèle de gouvernance** des référentiels (domaines / produits / pricing views),
- des garde-fous sur la **volumétrie** et l’**idempotence**.

---

# 2) Périmètre & hypothèses de l’assessment

## 2.1 Périmètre évalué
- Modules FinOps locaux (par entité)
- Vision Groupe (base Groupe, MVs Groupe, API Groupe, UI Groupe)
- Flux de données (local → groupe)
- Scalabilité (volumétrie, refresh MV, temps de réponse API)
- Risques (cohérence référentiels, sécurité, exploitation)

## 2.2 Hypothèses de volumétrie (ordre de grandeur)
> Les chiffres ci-dessous servent à estimer les performances. Ils doivent être recalibrés avec la volumétrie réelle.

Variables :
- **E** = nombre d’entités (ex : 5 à 30)
- **A** = nombre d’applications par entité (ex : 200 à 3 000)
- **P** = nombre moyen de produits consommés par application/mois (ex : 5 à 50 selon domaines)
- **D** = nombre de domaines (ex : 5 à 20)
- **M** = historique en mois (ex : 24 à 60)

Volumétrie facts locale :
- **rows_local ≈ A × P × M** (direct) + **A × D_indirect × M** (indirect)

Volumétrie facts groupe :
- **rows_group ≈ Σ rows_local** (somme sur les entités)

---

# 3) Analyse de l’architecture – modules locaux

## 3.1 Points forts
- **Autonomie** : chaque entité est indépendante (règles, cycles, déploiements).
- **Résilience organisationnelle** : une entité peut évoluer sans impacter les autres.
- **Découplage** : batch calcule des quantities, pricing view applique la valorisation.
- **Intégration Backstage** naturelle (centrée application_id).

## 3.2 Points d’attention
- **Harmonisation** : les domaines / produits doivent être alignés au niveau Groupe, sinon consolidation incohérente.
- **Variabilité** : des entités peuvent avoir des sources de données différentes, risques d’écarts de qualité.
- **Coûts d’exploitation** : N modules locaux = N déploiements + monitoring + runbooks.

## 3.3 Risques
- Divergence de référentiels (produits, familles, domaines)
- Différences de calendrier (cutoff mensuel, période de clôture)
- Incohérences application_id (mapping entité ↔ groupe)

---

# 4) Analyse de la vision Groupe (consolidation)

## 4.1 Points forts
- **Vision transverse** : consolidation des coûts multi-entités.
- **Comparaison inter-entités** : benchmarking, détection d’anomalies.
- **Pilotage stratégique** : reporting global, KPIs groupe.

## 4.2 Inconvénients / limites
- **Double pipeline** : ingestion + consolidation (à maintenir).
- **Latence** : la vision Groupe est dépendante de la fraîcheur des calculs locaux.
- **Gouvernance** : nécessite un modèle de validation et versioning des référentiels.

## 4.3 Risques
- Erreur de consolidation (duplication, données manquantes, période partielle)
- Sécurité/segmentation : contrôle strict des accès entité vs groupe
- Effets de bord lors des reprocess locaux (replay d’historique)

---

# 5) Flux de données local → groupe

## 5.1 Options de synchronisation

### Option A — Export batch (push) recommandé
Chaque entité exporte ses facts (ou agrégats) mensuels vers la base Groupe.

Avantages :
- Contrôle des fenêtres de transfert
- Reprise sur incident simple (replay par run_id / période)
- Moins de couplage réseau

Inconvénients :
- Pipeline supplémentaire à opérer
- Gestion des erreurs d’import

### Option B — Pull API Groupe
La base Groupe interroge les APIs locales.

Avantages :
- Centralise le pilotage
- Facile à activer progressivement

Inconvénients :
- Dépendance réseau/latence
- Charge côté APIs locales
- Plus difficile à rendre idempotent à grande échelle

✅ Recommandation : **Option A (push batch)**, avec idempotence forte.

---

# 6) Performance – estimations et ordres de grandeur

> Les temps dépendent surtout de : index, MV, partitionnement, et taille des IN-lists.

## 6.1 Stratégie de performance attendue
- **API** interroge principalement des **Materialized Views** (pré-agrégées).
- Les facts brutes sont rarement interrogées par l’API (sauf drill-down très fin).
- Index composés recommandés :
  - (period_month, domain_id)
  - (period_month, application_id)
  - (entity_id, period_month) côté groupe
- Partitionnement mensuel recommandé si > 50M lignes.

## 6.2 Temps de réponse – API locale (avec MVs)
Hypothèses :
- MV agrégée par domaine/mois + index.
- Résultat < 500 lignes.

Estimations :
- Dashboard global (1 mois) : **30–120 ms**
- Vue domaine (1 mois) : **40–150 ms**
- Historique 24 mois (agrégé) : **60–250 ms**
- Top N (ORDER BY sur MV) : **40–120 ms**
- Drill-down produit (si MV dédiée) : **80–300 ms**

Sans MV, ces requêtes peuvent monter à plusieurs secondes selon volumétrie.

## 6.3 Temps de réponse – API groupe (avec MVs)
La différence vient d’un facteur **E** (nombre entités) et du nombre de lignes consolidées.

Avec MV groupe indexée :
- Dashboard groupe (1 mois, toutes entités) : **80–250 ms**
- Comparatif entités (1 mois) : **100–300 ms**
- Historique groupe 24 mois : **150–450 ms**
- Drill-down entité → domaine : **80–250 ms**

## 6.4 Refresh MV – ordres de grandeur
Le refresh est un recalcul complet de la MV (PostgreSQL). La durée dépend de :
- taille des facts sous-jacentes
- complexité des joins
- IO disque
- concurrence

Estimation indicative :
- MV “domain_month” (agrégation simple) :
  - local : **10–60 s**
  - groupe : **30–180 s**

- MV “application_month” (plus volumineuse) :
  - local : **30–180 s**
  - groupe : **2–10 min**

✅ Recommandation : refresh **après batch**, en séquence, et utiliser `CONCURRENTLY` pour éviter les blocages (avec unique index).

---

# 7) Observabilité & Exploitabilité

## 7.1 Points forts
- run_id et batch_runs → auditabilité
- logs structurés → corrélation run/domaine/erreur
- refresh MV contrôlé → cohérence des vues

## 7.2 Points d’attention
- Avoir une vision Groupe implique :
  - supervision des exports
  - replay contrôlé
  - métriques de complétude (entité X a-t-elle publié le mois M ?)

Recommandé :
- métrique “completeness” par entité/mois
- alerte si export absent ou incomplet
- table de suivi “group_ingestion_runs”

---

# 8) Gouvernance des référentiels (critique)

## 8.1 Ce qui doit être centralisé
- référentiel `dim_domain` (IDs et labels)
- référentiel `dim_product` (IDs stables, familles, domaines)
- règles de mapping application_id (clé groupe)
- versioning pricing views (Groupe vs local)

## 8.2 Modèle recommandé
- Groupe publie un référentiel “officiel” (contrat)
- Les entités se synchronisent / valident l’alignement
- Les écarts sont détectés automatiquement (checks de conformité)

---

# 9) Sécurité & cloisonnement

## 9.1 Risques
- exposition involontaire de données d’une entité
- confusion de droits entre UI locale et UI groupe

## 9.2 Recommandations
- base groupe accessible uniquement à rôles groupe
- séparation des endpoints :
  - /local/* (entité)
  - /group/* (groupe)
- audits d’accès
- segmentation des tokens / clients OIDC

---

# 10) Recommandations clés

1. **Data Contract Groupe** strict + tests de conformité automatiques.
2. Stratégie **push batch** pour l’alimentation groupe + idempotence (delete/rebuild par entité/mois).
3. Materialized views **génériques** et indexées, éviter les requêtes lourdes runtime.
4. Ajouter une **table de suivi ingestion groupe** (entité, période, run_id, statut).
5. Gouvernance du référentiel produit (soft delete, pas de suppression).
6. Prévoir une UX groupe : dashboard consolidé + drilldown entité.

---

# 11) Conclusion

L’architecture FinOps multi-entités + vision Groupe est une solution **professionnelle, robuste et scalable** si elle est accompagnée de :
- gouvernance forte des référentiels,
- discipline d’idempotence,
- stratégie d’export maîtrisée,
- MVs et index adaptés à la volumétrie.

Elle permet :
- une autonomie locale,
- une consolidation groupe,
- et une montée progressive en maturité FinOps.

C’est une approche adaptée à une organisation en groupe, et alignée avec une stratégie IDP/Backstage.
