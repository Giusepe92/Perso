# Spécification Technique – Gestion des Périodes Actives et Figées (FinOps V2)

## 1. Objet

Ce document décrit la fonctionnalité de gestion des périodes **actives** et **figées** dans le module FinOps de Rosetta V2.

L’objectif est de :
- garantir la stabilité des données financières historiques,
- permettre des recalculs contrôlés,
- assurer l’auditabilité des coûts publiés,
- distinguer clairement les périodes en cours de calcul des périodes clôturées.

---

# 2. Contexte et Problématique

Dans Rosetta V2 :

- Les consommations (`fact_consumption`) sont stockées indépendamment des prix.
- Les coûts sont obtenus via multiplication avec une pricing view (vision budgétaire).
- Les pricing views peuvent évoluer (nouvelle version, correction de prix).

Sans mécanisme de clôture :
- Les chiffres historiques peuvent changer.
- Il est impossible d’assurer une traçabilité financière.
- Les comités direction peuvent constater des variations non maîtrisées.

La gestion des périodes actives / figées résout ce problème.

---

# 3. Définitions

## 3.1 Période

Une période correspond à un mois calendaire (format : YYYY-MM).

Exemple : `2025-01`

## 3.2 Statuts de période

Une période peut avoir l’un des statuts suivants :

| Statut | Description |
|--------|-------------|
| OPEN | Mois en cours ou non clôturé. Recalcul dynamique autorisé. |
| CLOSED | Mois calculé et figé avec une pricing view donnée. |
| LOCKED | Mois définitivement verrouillé (aucune modification autorisée sans procédure exceptionnelle). |

---

# 4. Modèle de Données

## 4.1 Table period_closure

```sql
period_closure (
  period                VARCHAR(7) PRIMARY KEY,
  status                VARCHAR(10) NOT NULL,
  locked_pricing_view_id UUID,
  freeze_run_id         UUID,
  locked_at             TIMESTAMP,
  locked_by             VARCHAR(100),
  reason                TEXT
)
```

## 4.2 Table fact_cost

```sql
fact_cost (
  period                 VARCHAR(7),
  app_id                 UUID,
  product_id             UUID,
  quantity               NUMERIC,
  unit_price_used        NUMERIC,
  cost                   NUMERIC,
  pricing_view_id        UUID,
  pricing_view_version   INTEGER,
  freeze_run_id          UUID,
  computed_at            TIMESTAMP,
  PRIMARY KEY (period, app_id, product_id, pricing_view_id)
)
```

---

# 5. Fonctionnement Global

## 5.1 Règle de lecture des coûts

Lorsqu’une requête API demande les coûts pour une période P :

1. Vérifier `period_closure.status`.
2. Si `OPEN` → calcul dynamique :
   - jointure `fact_consumption × pricing_view`
3. Si `CLOSED` ou `LOCKED` → lecture exclusive de `fact_cost`.

Aucune multiplication dynamique n’est effectuée pour une période figée.

---

# 6. Workflow de Clôture d’un Mois

## 6.1 Déclenchement

Initiateur :
- Automatique (cron J+X)
- Manuel via interface admin (FinOps Admin)

Préconditions :
- Aucun batch actif sur la période
- Pricing view sélectionnée explicitement

---

## 6.2 Étapes de Clôture

1. Création d’un enregistrement `freeze_run`
2. Lecture des consommations de la période P
3. Lecture des prix applicables (pricing view sélectionnée)
4. Calcul :

   cost = quantity × unit_price

5. Écriture des résultats dans `fact_cost`
6. Mise à jour `period_closure` :
   - status = CLOSED
   - locked_pricing_view_id = PV
   - freeze_run_id = ID_RUN
   - locked_at = now()
7. Refresh des materialized views
8. Clôture du run avec statut SUCCESS / FAILED

---

# 7. Gestion des Périodes Actives

## 7.1 Période Courante

Le mois courant est automatiquement en statut OPEN.

Caractéristiques :
- Multiplication dynamique autorisée
- Pricing view active utilisée par défaut
- Recalcul possible à tout moment

---

## 7.2 Passage Automatique en CLOSED

Une règle métier peut définir :
- Clôture automatique à J+X jours après fin de mois
- Ou déclenchement manuel obligatoire

Recommandation :
Clôture automatique après validation FinOps.

---

# 8. Déverrouillage Exceptionnel

Seul un utilisateur avec rôle `Rosetta_FinOps_Admin` peut :

1. Passer un mois CLOSED → OPEN
2. Justifier l’action (champ reason obligatoire)
3. Relancer un freeze avec nouvelle pricing view

Chaque déverrouillage génère :
- Un audit log
- Un nouveau freeze_run_id
- Une nouvelle version de fact_cost

---

# 9. Impact sur Performance

## 9.1 Périodes OPEN
- Jointure dynamique
- Multiplication en base (coût négligeable)
- Performance dépend uniquement du volume filtré par période

## 9.2 Périodes CLOSED / LOCKED
- Lecture directe de fact_cost
- Très performant
- Aucun recalcul

La mise en place du freeze améliore la performance sur l’historique.

---

# 10. Cas d’Usage Couverts

- Stabilisation des chiffres en comité
- Audit des prix utilisés pour une période donnée
- Reforecast contrôlé
- Simulation sur période OPEN
- Historisation multi-années
- Consolidation groupe future

---

# 11. Règles de Gouvernance

- Une période LOCKED ne peut être modifiée sans procédure exceptionnelle.
- Toute clôture est versionnée.
- Toute modification est auditée.
- Les pricing views sont versionnées et historisées.
- Aucune suppression physique des coûts figés.

---

# 12. Résumé Fonctionnel

La gestion des périodes actives et figées permet :

- Séparation claire entre données dynamiques et données comptables.
- Stabilisation financière des périodes validées.
- Maintien de la flexibilité sur les périodes en cours.
- Industrialisation et auditabilité du module FinOps.

Cette fonctionnalité est obligatoire pour garantir la cohérence financière et la crédibilité du pilotage Rosetta V2.
