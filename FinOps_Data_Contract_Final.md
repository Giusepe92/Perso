# 📘 FinOps Platform – Data Contract PostgreSQL (Final)
## Modèle de données cible (Data Mart + vues matérialisées + runs batch) – Version de référence

**Auteur / porteur :** Youssef Messaoudi  
**Objectif :** définir le **contrat de données final** du module FinOps (vision Entité), intégrant :  
- Direct / Indirect (quantities unifiées)
- Produits / Familles / Domaines (avec famille optionnelle)
- Environnement (prod / non-prod / unknown / n/a) au niveau consommation
- Coefficients (poids) pour domaines indirects et cas avancés
- Pricing Views (visions budgétaires) – valorisation dynamique
- Historisation / décommissionnement logique des référentiels (soft delete)
- Traçabilité des runs ETL / batch + reporting d’exécution
- Vues matérialisées (MVs) orientées UI/performances

---

# 1) Principes structurants du contrat

## 1.1 Séparation “Quantity” vs “Cost”
- Le **batch** écrit des **quantities** (consommations / poids) dans des facts.
- La **valorisation** (cost) est calculée **à la demande** via une *Pricing View* :
  - `cost = quantity × unit_price`
- Le coût n’est **pas** stocké comme vérité unique dans les facts (évite duplications et facilite les comparaisons budgétaires).

## 1.2 Direct vs Indirect (unifiés)
- **Direct** : quantity mesurée au niveau **produit** (souvent famille renseignée).
- **Indirect** : quantity = **poids / coefficient** réparti (souvent produit rattaché directement au domaine, famille NULL).
- Les deux convergent vers un modèle commun “fact_consumption” (quantity).

## 1.3 Domaine / Famille / Produit
- Un **produit** appartient **toujours** à un **domaine**.
- Une **famille** appartient à un **domaine**.
- Un **produit** peut appartenir à une **famille** (optionnel).
  - `family_id = NULL` autorisé (cas indirect typique ou produit “global domaine”).

## 1.4 Environnement (dimension optionnelle au niveau consumption)
Pour permettre une **vue par environnement** sans imposer l’environnement à tous les domaines :
- L’environnement est porté par la **fact** (pas par le produit).
- On gère 4 états **standardisés** :  
  - `prod` / `non_prod` / `unknown` / `n_a`  
  - `unknown` = applicable mais non renseigné  
  - `n_a` = non applicable (coûts non liés à un env)

## 1.5 Historisation / soft delete
- Aucun référentiel (domain/family/product) ne doit être supprimé physiquement.
- Les éléments peuvent être **désactivés** mais restent joignables pour l’historique.
- Les MVs historiques doivent utiliser `LEFT JOIN` depuis les facts pour éviter de perdre l’historique.

## 1.6 Traçabilité des runs
- Chaque écriture du batch est rattachée à un `run_id` et une `run_month`.
- Les runs sont auditables (statut, durées, volumes, erreurs, logs).

---

# 2) Conventions de nommage & clés

- Clés techniques : `uuid` ou `bigint` (au choix), **stables**.
- Période mensuelle : `period_month DATE` (recommandé : 1er jour du mois).
- Les tables facts sont partitionnables par mois si volumétrie forte (option).

---

# 3) Schéma PostgreSQL – Dimensions

## 3.1 dim_domain
Référentiel des domaines technologiques (Open, Natif, Cloud, Réseau…)

| Champ | Type | Rôle |
|---|---|---|
| domain_id | UUID/PK | Identifiant domaine |
| domain_key | TEXT unique | Clé stable (ex: `open`, `native`, `network`) |
| domain_label | TEXT | Libellé |
| domain_description | TEXT | Description |
| is_enabled | BOOLEAN | Activation data-driven (visible UI + calcul) |
| is_indirect | BOOLEAN | Domaine indirect “principal” (optionnel, informatif) |
| env_policy | TEXT | `OPTIONAL` / `NOT_APPLICABLE` (optionnel) |
| created_at / updated_at | TIMESTAMP | Audit |
| decommissioned_at | TIMESTAMP NULL | Soft delete (désactivation) |

**Notes :**
- `is_indirect` peut servir à l’UX (badge), mais la logique indirect est surtout portée par les facts / produits.

---

## 3.2 dim_family
Familles rattachées à un domaine (ex: Kubernetes, VM, Storage…)

| Champ | Type | Rôle |
|---|---|---|
| family_id | UUID/PK | Identifiant famille |
| domain_id | FK dim_domain | Domaine parent |
| family_key | TEXT unique | Clé stable |
| family_label | TEXT | Libellé |
| is_enabled | BOOLEAN | Activation |
| created_at / updated_at | TIMESTAMP | Audit |
| decommissioned_at | TIMESTAMP NULL | Soft delete |

---

## 3.3 dim_product
Produits consommables (ex: licence, storage, disque, firewall…)

| Champ | Type | Rôle |
|---|---|---|
| product_id | UUID/PK | Identifiant produit |
| domain_id | FK dim_domain | Domaine parent (toujours) |
| family_id | FK dim_family NULL | Famille (optionnel) |
| product_key | TEXT unique | Clé stable (ex: `k8s_license`) |
| product_label | TEXT | Libellé |
| unit_label | TEXT | Unité (ex: GB, licence, vCPU) |
| product_type | TEXT | `DIRECT` / `INDIRECT` / `MIXED` (informatif) |
| is_enabled | BOOLEAN | Activation |
| created_at / updated_at | TIMESTAMP | Audit |
| decommissioned_at | TIMESTAMP NULL | Soft delete |
| metadata_schema | JSONB NULL | Optionnel : schéma attendu des metadata (pour UI) |

**Règle clé :**
- Un produit peut être **directement au domaine** : `family_id = NULL`.

---

## 3.4 dim_application (optionnel mais recommandé)
Si vous voulez un mapping stable côté FinOps (sinon vous vous appuyez sur Backstage uniquement).

| Champ | Type | Rôle |
|---|---|---|
| application_id | TEXT/PK | Identifiant stable (aligné Backstage) |
| application_label | TEXT | Libellé |
| owner_group | TEXT NULL | Option |
| created_at / updated_at | TIMESTAMP | Audit |

---

## 3.5 dim_environment (optionnel)
Recommandé si vous voulez contrôler les valeurs et éviter les dérives.

| Champ | Type | Rôle |
|---|---|---|
| env_code | TEXT/PK | `prod` / `non_prod` / `unknown` / `n_a` |
| env_label | TEXT | Libellé |
| is_applicable | BOOLEAN | `n_a` = false |

---

# 4) Schéma PostgreSQL – Facts (Quantities)

## 4.1 fact_consumption (table principale)
Fact mensuelle des quantities (direct + indirect).

**Grain (direct) :** (month, application, product, env)  
**Grain (indirect) :** (month, application, domain, env) avec `product_id` = produit “domaine” (recommandé) ou NULL (si vous l’autorisez).

| Champ | Type | Rôle |
|---|---|---|
| consumption_id | UUID/PK | Identifiant |
| period_month | DATE | Mois |
| application_id | TEXT | Application |
| domain_id | FK dim_domain | Domaine |
| family_id | FK dim_family NULL | Famille (optionnel) |
| product_id | FK dim_product NULL | Produit (direct) ; indirect possible via produit domaine |
| quantity | NUMERIC(20,6) | Quantity / poids |
| quantity_unit | TEXT NULL | Optionnel (peut venir du produit) |
| consumption_kind | TEXT | `DIRECT` / `INDIRECT` |
| env_code | TEXT | `prod`/`non_prod`/`unknown`/`n_a` |
| env_raw | TEXT NULL | Valeur brute si source (CMDB) |
| scope_type | TEXT NULL | Extension future (cluster, namespace…) si besoin |
| scope_value | TEXT NULL | Valeur scope |
| metadata | JSONB NULL | Détails affichables (serveur, vip, cluster, etc.) |
| source_system | TEXT | `cmdb`/`cube_api`/`manual`… |
| source_ref | TEXT NULL | Identifiant source (ligne CMDB, id objet…) |
| run_id | UUID | FK batch_run |
| inserted_at | TIMESTAMP | Audit |

**Contraintes recommandées :**
- `(period_month, application_id, domain_id, product_id, env_code, scope_type, scope_value)` unique **si idempotence par overwrite**.  
  Sinon idempotence gérée par delete+insert sur (run_id) ou (period_month, domain).

---

## 4.2 fact_coefficient (poids / coefficients)
Table dédiée pour les **coefficients** calculés ou importés (cas indirects avancés).  
Elle sert à :
- matérialiser un **poids par application** (ou par scope) utilisé par le batch
- tracer la source et la méthode
- supporter des coefficients multi-domaines (ex: réseau basé sur open)

**Grain conseillé :** (month, application, domain, coefficient_key, env)

| Champ | Type | Rôle |
|---|---|---|
| coefficient_id | UUID/PK | Identifiant |
| period_month | DATE | Mois |
| application_id | TEXT | Application |
| domain_id | FK dim_domain | Domaine auquel s’applique le coefficient |
| coefficient_key | TEXT | Clé stable (ex: `weight_from_open`, `imported_ratio`) |
| coefficient_label | TEXT | Libellé (UI / audit) |
| coefficient_value | NUMERIC(20,10) | Valeur du coefficient/poids |
| coefficient_unit | TEXT NULL | `ratio`, `weight`, `percent`… |
| method_key | TEXT | `CALCULATED_FROM_DOMAIN`, `IMPORTED`, `STATIC_RULE` |
| method_params | JSONB NULL | Paramètres (domain_source, formule, seuils…) |
| env_code | TEXT | `prod/non_prod/unknown/n_a` |
| metadata | JSONB NULL | Détails (ex: somme open, base de calcul…) |
| source_system | TEXT | cmdb/external_db/api… |
| source_ref | TEXT NULL | trace |
| run_id | UUID | FK batch_run |
| inserted_at | TIMESTAMP | Audit |

**Notes :**
- Si un domaine indirect dépend d’Open : `method_key=CALCULATED_FROM_DOMAIN`, `method_params.domain_source='open'`.
- Cette table peut alimenter des MVs “coverage” et des dashboards de qualité de calcul.

---

# 5) Pricing Views (visions budgétaires)

## 5.1 dim_pricing_view
Référentiel des visions budgétaires (ex: “Budget T1 2026”, “Reforecast”, etc.)

| Champ | Type | Rôle |
|---|---|---|
| pricing_view_id | UUID/PK | Identifiant |
| pricing_view_key | TEXT unique | Clé stable |
| pricing_view_label | TEXT | Libellé |
| period_quarter | TEXT | ex: `2026Q1` |
| is_active | BOOLEAN | Vision par défaut |
| created_at / updated_at | TIMESTAMP | Audit |

## 5.2 fact_pricing_unit
Tarifs unitaires par produit, par vision budgétaire.

| Champ | Type | Rôle |
|---|---|---|
| pricing_unit_id | UUID/PK | Identifiant |
| pricing_view_id | FK dim_pricing_view | Vision |
| product_id | FK dim_product | Produit |
| unit_price | NUMERIC(20,6) | Prix unitaire |
| price_unit | TEXT NULL | €/GB, €/licence… |
| valid_from_month | DATE NULL | Optionnel |
| valid_to_month | DATE NULL | Optionnel |
| metadata | JSONB NULL | justifications / sources |
| created_at | TIMESTAMP | Audit |

**Règle :**
- Les coûts affichés = join MV(quantity) × fact_pricing_unit(unit_price) pour une pricing_view donnée.

---

# 6) Runs ETL / Batch & reporting exécution

## 6.1 batch_run (table runs)
| Champ | Type | Rôle |
|---|---|---|
| run_id | UUID/PK | Identifiant run |
| run_type | TEXT | `NIGHTLY`, `MANUAL`, `REPROCESS` |
| triggered_by | TEXT | user / service |
| status | TEXT | `RUNNING`, `SUCCESS`, `FAILED`, `PARTIAL` |
| started_at | TIMESTAMP | Début |
| ended_at | TIMESTAMP NULL | Fin |
| duration_ms | BIGINT NULL | Durée |
| window_from_month | DATE | Début période recalcul |
| window_to_month | DATE | Fin période recalcul |
| domain_scope | JSONB NULL | Domaines ciblés |
| app_scope | JSONB NULL | Applications ciblées |
| pricing_view_id | UUID NULL | Option si run lié à une vision |
| version | TEXT NULL | Version du batch |
| summary | JSONB NULL | Résumé global (volumes, anomalies) |
| log_location | TEXT NULL | URL / path logs |
| created_at | TIMESTAMP | Audit |

## 6.2 batch_run_step (détails par domaine / étape)
| Champ | Type | Rôle |
|---|---|---|
| step_id | UUID/PK | Identifiant |
| run_id | FK batch_run | Run |
| domain_id | FK dim_domain NULL | Domaine |
| step_key | TEXT | ex: `OPEN_EXTRACT`, `OPEN_TRANSFORM`, `MV_REFRESH` |
| status | TEXT | `SUCCESS`/`FAILED` |
| started_at / ended_at | TIMESTAMP | Durées |
| rows_inserted | BIGINT | Volume |
| rows_deleted | BIGINT | Volume |
| error_count | BIGINT | Erreurs |
| details | JSONB NULL | Infos |
| log_location | TEXT NULL | log step |

---

# 7) Vues matérialisées (Materialized Views) – contrat

> Les MVs sont le **contrat de lecture** “performant” pour l’API/UI.  
> Elles doivent être **recalculables** et **indexées**.

## 7.1 Principes
- Les MVs s’appuient sur `fact_consumption` (et parfois `fact_coefficient`).
- Elles ne filtrent pas les produits désactivés de l’historique (LEFT JOIN).
- Elles agrègent au grain utile UI : mois / domaine / famille / produit / app / env.

## 7.2 Liste minimale (socle UI)
### Lot A – Dashboards global / drilldown
1. `mv_month_summary` : total quantity par mois (et par env_code si besoin)
2. `mv_domain_month` : quantity par (domaine, mois)
3. `mv_family_month` : quantity par (domaine, famille, mois)
4. `mv_product_month` : quantity par (domaine, famille?, produit, mois)
5. `mv_app_month` : quantity par (app, mois)
6. `mv_app_domain_month` : quantity par (app, domaine, mois)

### Lot B – Environnement (optionnel, data-driven)
7. `mv_domain_month_env` : quantity par (domaine, mois, env_code)
8. `mv_family_month_env` : quantity par (famille, mois, env_code)
9. `mv_app_month_env` : quantity par (app, mois, env_code)

### Lot C – Qualité / couverture env & indirect
10. `mv_domain_env_coverage` : % de lignes env != n_a, par domaine/mois
11. `mv_domain_indirect_coverage` : indirect vs direct par domaine/mois

### Lot D – Coefficients (si exposés)
12. `mv_coeff_domain_month` : coeff agrégé/statistiques (min/max/avg) par domaine/mois
13. `mv_coeff_app_domain_month` : coefficient par app/domaine/mois (si UI dédiée)

## 7.3 Stratégie de refresh
- Refresh orchestré par batch en fin de run :
  - refresh lot A systématique
  - lot B uniquement si features env activées / coverage
  - lots C/D selon besoins UI
- Recommandé : `REFRESH MATERIALIZED VIEW CONCURRENTLY` si possible + indexes uniques.
- En cas de reprocess historique : refresh global des MVs impactées (ou refresh ciblé si découpage par période).

---

# 8) Indexation & performance (recommandations contractuelles)

## 8.1 fact_consumption
Index recommandés :
- `(period_month, domain_id)`
- `(period_month, application_id)`
- `(period_month, product_id)`
- `(period_month, domain_id, env_code)` si env utilisé

Si volumétrie > ~20–50M lignes : envisager partitionnement mensuel.

## 8.2 fact_coefficient
- `(period_month, domain_id)`
- `(period_month, application_id)`
- `(period_month, domain_id, coefficient_key)`

## 8.3 MVs
Index uniques adaptés à leur grain (ex: `(domain_id, period_month)` etc.)

---

# 9) Gouvernance produit / apparition / disparition (delta)

## 9.1 Synchronisation référentiel produit
- Le référentiel produit peut être alimenté en delta (nouveaux produits ajoutés).
- Les produits ne doivent pas être supprimés ; on utilise `decommissioned_at`.
- Un produit non reçu le jour J n’est pas supprimé automatiquement : on le met éventuellement “inactive” selon règles métier (option).

## 9.2 Historique
- Les facts conservent `product_id` et la référence reste joignable même si produit désactivé.
- Les labels peuvent évoluer : si besoin, vous pouvez ajouter `product_label_snapshot` dans fact (option) pour figer l’affichage historique.

---

# 10) Cas d’usage couverts par ce Data Contract

## 10.1 Cœur FinOps
- Consommation mensuelle par **application**
- Drilldown : domaine → famille → produit → application
- Une application peut consommer **plusieurs domaines** et **plusieurs produits**

## 10.2 Direct / Indirect
- Direct (mesure) et indirect (poids/coefficient) unifiés par `quantity`
- Domaines indirects : produit rattaché directement au domaine (family NULL)
- Coefficients calculés ou importés, traçables

## 10.3 Visions budgétaires (Pricing Views)
- Affichage avec vision active
- Comparaison entre visions (ex: T-1 vs T)
- Simulation via nouvelle vision (sans modifier les facts)

## 10.4 Environnement (prod / non-prod / unknown / n/a)
- Vue par environnement à la demande (data-driven)
- Domaines/familles sans env : `env_code='n_a'`
- Données partielles : `unknown` gère la qualité variable

## 10.5 Historisation & décommissionnement
- Produits/familles/domaines désactivés sans perte d’historique
- Affichage historique cohérent via LEFT JOIN et soft delete

## 10.6 Exploitation / audit
- Liste des runs batch, statuts, périodes, déclencheurs
- Détails par domaine/étape (durées, volumes, erreurs)
- Liens logs / observabilité

## 10.7 Extensibilité
- Ajout de nouveaux domaines par activation data-driven
- Ajout de nouveaux produits/familles en delta
- Possibilité future d’une granularité “scope” (cluster/namespace…) via `scope_type/scope_value` (option)

---

# 11) Conclusion

Ce data contract constitue la **base contractuelle** de l’implémentation FinOps V2 :  
- stable pour l’industrialisation,  
- performant via MVs,  
- robuste (soft delete, audit runs),  
- extensible (direct/indirect, env, coefficients, pricing views).

➡️ Il permet de démarrer immédiatement l’implémentation (migrations, batch, MVs, API, UI) sur une base claire et complète.
