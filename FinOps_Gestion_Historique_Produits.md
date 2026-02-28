# 📘 Gestion de l’Historique des Produits dans le Module FinOps

## 🎯 Objectif

Garantir que l’historique des consommations reste intègre et consultable dans le temps, même lorsque :

- Un produit est désactivé
- Un produit est décommissionné
- Un produit disparaît du référentiel source
- Un nouveau produit apparaît

L’objectif est d’éviter toute disparition de données historiques lors des refresh des Materialized Views.

---

# 1️⃣ Principe Fondamental

Dans le Data Mart FinOps :

Les faits (fact_consumption) sont la source de vérité historique.  
Les dimensions ne doivent jamais invalider l’historique.

Une consommation calculée pour un mois donné ne doit jamais disparaître, même si le produit n’existe plus aujourd’hui.

---

# 2️⃣ Modèle Recommandé

## 2.1 dim_product (référentiel produit)

Exemple de structure :

| Champ | Description |
|--------|-------------|
| product_id | Identifiant stable |
| product_label | Libellé actuel |
| family_id | Rattachement famille |
| domain_id | Rattachement domaine |
| is_active | Produit actif ou non |
| decommissioned_at | Date de décommission |
| created_at | Date d’apparition |

### Règle importante

Ne jamais supprimer physiquement une ligne produit utilisée par des facts.  
Utiliser un soft delete via `is_active=false`.

---

## 2.2 fact_consumption

Grain DIRECT :
(period_month, application_id, product_id)

Grain INDIRECT :
(period_month, application_id, domain_id)

Les lignes de faits restent persistées indépendamment de l’état actuel du produit.

---

# 3️⃣ Stratégie SQL pour préserver l’historique

## Règle clé : Toujours LEFT JOIN depuis la fact

Exemple correct :

```sql
SELECT
    f.period_month,
    f.application_id,
    p.product_label,
    SUM(f.quantity) AS total_quantity
FROM fact_consumption f
LEFT JOIN dim_product p
    ON p.product_id = f.product_id
GROUP BY f.period_month, f.application_id, p.product_label;
```

Pourquoi LEFT JOIN ?

- Si le produit est désactivé → la ligne fact reste visible.
- Si le produit est absent du référentiel courant → la fact reste présente.
- L’historique ne disparaît pas lors du refresh des MV.

---

## Exemple à éviter

```sql
JOIN dim_product p ON ...
WHERE p.is_active = true
```

Cela ferait disparaître l’historique au refresh.

---

# 4️⃣ Gestion des Nouveaux Produits

Lorsque de nouveaux produits apparaissent :

1. Insertion dans dim_product
2. Activation via is_active=true
3. Intégration automatique dans le batch au prochain run

Aucun impact sur l’historique existant.

---

# 5️⃣ Gestion des Produits Décommissionnés

Lorsqu’un produit est décommissionné :

1. is_active=false
2. decommissioned_at renseigné
3. Aucune suppression des facts historiques

Conséquence :

- Le produit ne reçoit plus de nouvelles consommations
- Les anciens mois restent visibles

---

# 6️⃣ Comportement des Materialized Views

Les MV doivent :

- Agréger depuis fact_consumption
- Utiliser LEFT JOIN vers les dimensions
- Ne pas filtrer sur is_active
- Être rafraîchies après le batch

Ainsi :

- Le refresh ne supprime rien
- Il ne fait que recalculer les agrégats à partir des facts persistées

---

# 7️⃣ Option Avancée : Snapshot du Label Produit

Pour sécuriser totalement l’affichage historique, on peut ajouter dans fact_consumption :

| Champ | Description |
|--------|-------------|
| product_label_snapshot | Libellé au moment du calcul |

Cela permet d’afficher le libellé historique même si la dimension change.

---

# 8️⃣ Console Admin (Gestion Produit)

La console admin FinOps peut permettre :

- Activer / Désactiver un produit
- Voir historique des consommations
- Voir date de décommission
- Empêcher suppression si des facts existent
- Visualiser les produits inactifs

Bonne pratique :

Interdire toute suppression physique si des facts référencent le produit.

---

# 9️⃣ Garanties d’Intégrité Historique

Pour garantir un historique stable :

- Soft delete obligatoire
- LEFT JOIN obligatoire dans MV
- Aucun filtre sur produits actifs dans les agrégats historiques
- Interdiction suppression hard si référencé
- Batch idempotent par période

---

# 🔟 Conclusion

La stabilité historique repose sur 3 principes simples :

1. Les facts sont immuables
2. Les dimensions ne doivent jamais invalider l’historique
3. Les MV recalculent mais ne suppriment pas les données sources

Avec cette approche :

- Les produits peuvent évoluer
- Le référentiel peut changer
- Les activations/désactivations sont gérées via admin
- L’historique financier reste intact et fiable

Cette logique garantit une cohérence financière long terme, indispensable dans un contexte FinOps.
