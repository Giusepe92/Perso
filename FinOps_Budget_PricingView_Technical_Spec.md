# 💰 Spécification Technique – Vision Budgétaire (Pricing View) – Module FinOps

## 1. Objectif

Implémenter une **Vision Budgétaire** (*Pricing View*) permettant :

- D’associer une **valeur unitaire** (prix / unité d’œuvre) à chaque **produit**
- De **versionner** ces valeurs (par trimestre, par défaut)
- De rendre le calcul des coûts **paramétrable** :
  - vision par défaut (courante)
  - vision passée (trimestre précédent)
  - vision corrigée
- D’activer la **comparaison** entre deux visions (delta coût)

Le module doit rester **performant** en évitant de stocker des coûts figés pour chaque vision.

---

## 2. Décision d’architecture (chemin retenu)

### Règle structurante
✅ **Consommation = vérité** (stockée)  
✅ **Vision budgétaire = référentiel versionné** (stocké)  
✅ **Coût = calcul à la demande** (SQL par jointure consommation × pricing)

### Conséquences
- Le **Batch** charge uniquement des **consommations** (pas de coût final dépendant d’une vision).
- Les **Materialized Views** agrègent des **quantités** (pas des coûts).
- L’**API** calcule le coût selon un `pricingView` demandé (ou vision défaut).

---

## 3. Modèle de données PostgreSQL

### 3.1 Table `pricing_view` (en-tête)

Une ligne = une version budgétaire (ex: “2024-Q2 Budget v1”).

Champs :
- `pricing_view_id` UUID PK
- `code` VARCHAR UNIQUE (ex: `2024Q2_V1`)
- `name` VARCHAR (affichage UI)
- `description` TEXT (optionnel)
- `period_type` ENUM (`QUARTER`) **(obligatoire en v1)**
- `period_key` VARCHAR (ex: `2024-Q2`)
- `status` ENUM (`DRAFT`, `ACTIVE`, `ARCHIVED`)
- `is_default` BOOLEAN (une seule vision par défaut active)
- `created_at`, `created_by`
- `updated_at`, `updated_by`

Contraintes :
- `code` unique
- `is_default=true` unique parmi `status=ACTIVE`

---

### 3.2 Table `pricing_line` (lignes de prix)

Une ligne = un prix unitaire pour un produit dans une vision.

Champs :
- `pricing_view_id` UUID FK → `pricing_view`
- `product_id` VARCHAR/UUID (référentiel produit)
- `unit_price` NUMERIC(18,6)
- `currency` VARCHAR DEFAULT 'EUR'
- `source` VARCHAR (ex: `FINOPS_TEAM`, `IMPORT_XLS`)
- `comment` TEXT (optionnel)
- `created_at`, `created_by`
- `updated_at`, `updated_by`

Clé primaire :
- `(pricing_view_id, product_id)`

Index :
- `(product_id)`
- `(pricing_view_id)`

---

### 3.3 Table `pricing_view_mapping` (recommandée)

Associe une vision budgétaire par défaut à un mois d’affichage.

Champs :
- `period_month` VARCHAR (`YYYY-MM`) PK
- `default_pricing_view_id` UUID FK → `pricing_view`
- `created_at`

Règle :
- Tous les mois d’un trimestre pointent vers la vision du trimestre.

---

## 4. Consommation et agrégats

### 4.1 Table consommation (source stable)
Table existante ou à normaliser en :
- `fact_consumption` (ou `fact_releve` si renommage non souhaité)

Champs minimum requis :
- `period_month`
- `application_id`
- `product_id`
- `quantity`

---

### 4.2 Materialized Views consommation (obligatoires)

Ces MVs **n’incluent pas de coût** : seulement `total_quantity`.

- `mv_consumption_domain_month`
- `mv_consumption_family_month`
- `mv_consumption_application_month`
- `mv_consumption_app_product_month` (**clé pour pricing**)
- `mv_consumption_app_family_month`
- `mv_consumption_app_domain_month`

---

## 5. Calcul coût (API)

### 5.1 Paramètre standard `pricingView`
Tous les endpoints FinOps qui retournent un coût acceptent :
- `pricingView=<id ou code>`

Si absent :
- déterminer la vision par défaut via `pricing_view_mapping(period_month)`
- sinon fallback sur `pricing_view.is_default=true`

### 5.2 Calcul SQL (principe)
- join MV consommation → pricing_line
- filtre `pricing_view_id`
- multiplication `total_quantity * unit_price`
- agrégation SUM au niveau requis (dashboard, domaine, famille, app)

Objectif : multiplier **des agrégats**, pas des relevés bruts.

---

## 6. Contrats API nécessaires

### Lecture
- `GET /finops/pricing-views`
- `GET /finops/pricing-views/default?period=YYYY-MM`
- Tous les endpoints existants : ajout `pricingView` en query param

### Comparaison (use case FinOps)
- `GET /finops/compare?period=YYYY-MM&viewA=...&viewB=...&level=domain|family|application&id=...`
Retour :
- `costA`, `costB`, `deltaAbs`, `deltaPct` (+ breakdown si utile)

### Admin pricing (si piloté dans l’outil)
- `POST /finops/admin/pricing-views`
- `POST /finops/admin/pricing-views/{id}/lines/import`
- `PATCH /finops/admin/pricing-views/{id}` (activate / set default)
- `GET /finops/admin/pricing-views/{id}/coverage`

---

## 7. UI Backstage

### 7.1 Sélecteur “Vision budgétaire” (global FinOps)
- Dropdown visible sur toutes les vues FinOps
- Valeur par défaut : “Vision courante (auto)”
- Valeurs : liste des `pricing_view` ACTIVE + ARCHIVED

### 7.2 Mode comparaison
- Toggle “Comparer 2 visions”
- Sélecteurs View A / View B
- Affichage des deltas (abs + %) dans KPI + tableaux

---

## 8. Qualité & gouvernance

### 8.1 Complétude (coverage)
Une vision peut être :
- COMPLETE : tous les produits actifs ont un prix
- INCOMPLETE : prix manquants → coût calculé partiel

Règle retenue :
- Prix manquant = 0, vision taguée **INCOMPLETE**
- L’API expose `coveragePct` pour l’affichage UI

### 8.2 Statuts
- DRAFT : visible admin seulement
- ACTIVE : utilisable par les écrans
- ARCHIVED : lecture seulement

---

## 9. Performance (engagement)

- Pas de rerun batch pour changer de vision
- Coût calculé sur **MVs agrégées** + join pricing_line
- Index requis :
  - `pricing_line(pricing_view_id, product_id)` (PK)
  - indexes sur MVs `(period_month, product_id)`

Objectifs :
- Dashboard (mois) < 300ms DB
- Drill-down < 500ms DB

---

## 10. Plan d’implémentation (ordre)

1) Créer `pricing_view`, `pricing_line`, `pricing_view_mapping`
2) Normaliser consommation : `fact_consumption(period_month, app, product, quantity)`
3) Basculer MVs en “consumption-only”
4) Ajouter param `pricingView` + calcul SQL dans FinOps API
5) Ajouter sélecteur UI “Vision budgétaire” + (option) mode comparaison
6) Ajouter endpoints admin import + coverage

---

## 11. Résumé

La Vision Budgétaire est implémentée via :
- un référentiel de prix **versionné**
- des consommations **stables**
- un calcul de coût **à la demande**

Résultat :
- affichage multi-visions instantané
- comparaison simple
- performance maîtrisée
- pas de duplication de données
