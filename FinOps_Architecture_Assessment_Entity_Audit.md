# 🧾 Assessment d’Architecture – Module FinOps (Vision Entité)  
## Audit professionnel de la solution A→Z (données, batch, MVs, API, UI, exploitation, coûts)

---

# 1) Résumé exécutif

La solution FinOps proposée (Batch Quarkus → Data Mart PostgreSQL → Materialized Views → API Quarkus → UI Backstage) est **cohérente, scalable et industrialisable**.  
Son principal atout est la **séparation nette** entre :

- **Production des quantities (poids/consommations)** par le batch
- **Valorisation budgétaire** via *Pricing Views* (visions budgétaires) calculées à la demande
- **Exposition rapide** via MVs pré-agrégées et API

Verdict global : **Très bonne architecture**, adaptée à une montée en charge progressive et à un déploiement incrémental par domaine, à condition de maîtriser :
- la gouvernance du **data contract**,
- la stratégie d’indexation / partitionnement selon volumétrie,
- l’observabilité des runs et la gestion des reprocess,
- la cohérence des référentiels (produits, familles, domaines).

---

# 2) Périmètre & hypothèses

## 2.1 Périmètre évalué
- Ingestion & normalisation (batch)
- Data Mart PostgreSQL (facts/dims)
- Materialized Views (pré-agrégations)
- API FinOps (REST Quarkus)
- UI Backstage (dashboards & drilldown)
- Pricing Views (visions budgétaires)
- Exploitation (ops, runbooks, monitoring)
- Extensibilité (direct/indirect, nouveaux domaines, nouveaux écrans)

## 2.2 Hypothèses de volumétrie (ordre de grandeur)
Variables :
- **A** = nombre d’applications (100 → 5 000)
- **D** = nombre de domaines (5 → 25)
- **P** = produits moyens par application/mois (5 → 50, selon domaines directs)
- **M** = historique en mois (24 → 60)

Volumétrie facts (direct) ≈ `A × P × M`  
Volumétrie facts (indirect) ≈ `A × D_indirect × M`

Exemples :
- Petit : A=300, P=10, M=24 → 72k lignes
- Moyen : A=1500, P=20, M=36 → 1,08M lignes
- Grand : A=5000, P=30, M=60 → 9M lignes

---

# 3) Architecture globale – analyse

## 3.1 Points forts
- **Découplage fort** : calcul (batch) ≠ lecture (API/UI)
- **Modèle unifié** : Direct et Indirect via `quantity` (pas de stockage de coût)
- **Pricing Views** : valorisation budgétaire versionnable et comparable, sans recalcul batch
- **Data-driven** : activation de domaines via `dim_domain.is_enabled`
- **Backstage-ready** : pivot application_id → agrégation par group/portfolio facile
- **MV-first** : performances stables via pré-agrégation

## 3.2 Points d’attention
- La robustesse dépend beaucoup de :
  - la qualité / stabilité des sources
  - la discipline d’idempotence
  - la gouvernance référentiel produit (soft delete)
- Les MVs doivent être pensées pour l’usage UI (drilldown, top, historique)
- La gestion des domaines indirects dépendants (ex : réseau basé sur Open) doit être clairement orchestrée

---

# 4) Data Model & Data Contract – audit

## 4.1 Atouts du modèle
- Grain clair et extensible :
  - Direct : (mois, application, produit)
  - Indirect : (mois, application, domaine) avec product/family NULL
- Compatible multi-domaines par application
- Compatible multi-visions budgétaires

## 4.2 Risques data
- **Suppression** de dimensions (produits) → risque de trous d’historique si INNER JOIN
- **Évolution** du référentiel produit (labels, rattachements) → risque de réécriture d’historique “visuel”

## 4.3 Recommandations data
- Soft delete obligatoire sur dim_product / dim_family / dim_domain
- MVs historiques : `LEFT JOIN` depuis facts, ne pas filtrer `is_active`
- Option “snapshot label” dans facts si les libellés changent souvent
- Indices composés :
  - facts : (period_month, domain_id), (period_month, application_id), (product_id), (family_id)
- Partitionnement mensuel si > 20–50M lignes (à décider selon croissance)

---

# 5) Batch Quarkus – audit

## 5.1 Points forts
- Orchestrateur + processors par domaine (pattern plugin) = **industrialisation**
- Idempotence par domaine/mois = reprocess simple
- Possibilité de nightly + manual run = exploitation flexible
- Permet dépendances ordonnées (Open avant domaines indirects)

## 5.2 Points de vigilance
- Le batch est la zone de complexité métier :
  - règles indirectes (coefficients)
  - dépendances inter-domaines
  - sources hétérogènes
  - correction de données
- Besoin d’une stratégie claire de “fenêtre de calcul” (mois M, M-1, reprocess)

## 5.3 Coût d’exécution (ordre de grandeur)
Le coût du batch dépend surtout :
- latence d’appels externes (APIs)
- transformation et write en DB (bulk insert)
- refresh MVs

Exemples indicatifs (hors appels externes) :
- 100k lignes à écrire : ~ secondes à 1–2 min
- 1M lignes à écrire : ~ quelques minutes (bulk + index)
- 10M lignes : ~ dizaines de minutes (à optimiser / partitionner)

Recommandations :
- Bulk insert (COPY / batch insert)
- Désactiver/retarder certains index pendant import massif si nécessaire
- Limiter les joins dans le batch, préférer mapping en mémoire ou tables dims simples

---

# 6) Materialized Views – audit

## 6.1 Points forts
- Rend l’API simple et rapide (requêtes “lecture”)
- Stabilise les temps de réponse
- Permet caches naturels (résultat déjà agrégé)

## 6.2 Points de vigilance
- Refresh MV = recalcul (PostgreSQL)
- Risque de fenêtres incohérentes si refresh partiel ou concurrent non maîtrisé
- Nécessite index et plan de refresh bien pensé

## 6.3 Estimations refresh MV (ordre de grandeur)
Selon taille facts et complexité :
- MV domaine/mois (agrégation simple) : 10s → 2min
- MV app/mois (volumineuse) : 30s → 10min
- MV top/variations : 10s → 2min
- Historique 24–60 mois : 30s → 10min

Recommandations :
- Refresh après batch, en séquence contrôlée
- `CONCURRENTLY` pour éviter blocage lecture (avec unique index sur MV)
- Découper MVs “lourdes” si nécessaire (par période ou par axe)

---

# 7) API Quarkus – audit

## 7.1 Points forts
- API principalement sur MVs : logique simple, stable, maintenable
- Calcul coût via Pricing View : dynamique, comparatif, sans duplication
- Support des filtres (applicationIds) : intégration Backstage facile

## 7.2 Points de vigilance
- URLs trop longues si on passe de gros IN-lists → préférer POST /aggregate
- Contrôle de performance sur endpoints “drill-down fin” (facts brutes)
- Gestion des “no data” et des périodes partiellement calculées

## 7.3 Temps de réponse estimés (avec MVs)
Hypothèses : index OK, résultats petits, DB saine.
- Dashboard (mois) : 30–150 ms
- Domaine détail (mois) : 40–200 ms
- Historique 24 mois : 80–350 ms
- Top N : 40–150 ms

Sans MV : peut monter à 1–10s selon volumétrie.

## 7.4 Cache : faut-il en ajouter ?
Souvent **non nécessaire** au début, car :
- MVs jouent le rôle de cache.
- Les mêmes requêtes reviennent, mais déjà pré-agrégées.

Quand ajouter du cache :
- forte concurrence UI (beaucoup d’utilisateurs)
- endpoints identiques appelés fréquemment

Approche recommandée :
- Cache HTTP léger côté API (ETag / max-age) sur endpoints agrégés
- Pas de cache complexe applicatif tant que la MV suffit

---

# 8) UI Backstage – audit

## 8.1 Points forts
- UI data-driven : nouveaux domaines apparaissent automatiquement
- Drill-down naturel : Domaine → Famille → Produit → Application
- Intégration group/ownership Backstage : vues restreintes faciles

## 8.2 Points de vigilance
- Éviter une UI “hardcodée par domaine”
- Standardiser des composants réutilisables :
  - KPI cards
  - Top tables
  - Trend charts
  - Compare view (pricing views)
- Gérer l’expérience “période / vision budgétaire / filtres” de manière commune

## 8.3 Coût de développement UI
- Très rentable sur la durée si vous investissez dans un kit de composants :
  - une fois les “widgets” faits, ajout de nouvelles vues = assemblage + API

---

# 9) Exploitation & coûts d’exploitation (Run/OPS)

## 9.1 Coût d’exploitation
Composants à opérer :
- Batch Quarkus (cron + run manual)
- PostgreSQL (storage, vacuum, backups, tuning)
- API Quarkus
- UI Backstage (plugin)

Le coût OPS est raisonnable si :
- monitoring & logs structurés
- runbooks et alertes simples (fail run, pas de data, refresh MV KO)

## 9.2 Points à prévoir
- Table `batch_runs` + détails steps
- téléchargement logs (ou lien Kibana)
- métrique “data freshness” (dernier mois calculé par domaine)
- alerting sur :
  - run failed
  - run duration anormale
  - volumes anormaux (x2/x0.5)

---

# 10) Mise en place & planning – audit

## 10.1 Mise en place incrémentale (fort atout)
- vous pouvez déployer 1–3 domaines en prod, puis étendre
- UI/API/MVs en socle stable, batch s’enrichit domaine par domaine

## 10.2 Estimation réaliste (vision entité)
Selon équipe 2 devs (un batch, un API/UI/MVs) :
- Contrat + migrations + socle : ~1 semaine
- V1 avec 3 domaines (Open + 2 indirect) : ~2–3 semaines additionnelles
- Stabilisation + admin runs + durcissement : ~1 semaine
➡️ Total : **4–5 semaines** pour une V1 robuste en prod, hors imprévus sources.

Les imprévus typiques :
- qualité des sources / accès API
- mapping des applications
- ajustements référentiel produit

---

# 11) Risques & mitigations (liste concise)

| Risque | Impact | Mitigation |
|-------|--------|------------|
| Référentiel produit instable / suppression | trous historiques | soft delete + LEFT JOIN |
| Volumétrie > prévue | refresh MV longs | index + partitionnement + MVs ciblées |
| Domaines indirects dépendants | incohérences | orchestration stricte + order |
| Reprocess fréquents | charge run | idempotence + reprocess par période |
| UI trop spécifique | dette | kit de widgets réutilisables |
| Conflits pricing view | coûts incohérents | versioning + gouvernance |

---

# 12) Conclusion (avis global)

Cette architecture FinOps (vision entité) est **une excellente base** :

✅ Robuste : séparation calcul/valorisation/lecture  
✅ Performante : MV-first + indexation + API simple  
✅ Évolutive : nouveaux domaines et nouvelles vues sans refonte  
✅ Compatible Backstage : agrégation application-centric  
✅ Industrialisable : batch orchestré + idempotence + admin runs

Points clés à réussir :
1) Data contract et référentiels (soft delete, gouvernance)  
2) Orchestration batch (dépendances, reprocess)  
3) MVs “au bon grain” alignées UI  
4) Observabilité (runs, volumes, freshness)

Avec ces garde-fous, la solution est adaptée à une montée en charge progressive et à une extension future (vision groupe multi-entités) sans remise à plat.
