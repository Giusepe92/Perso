# 🖥 FinOps – Spécification UI / UX (Partie User)

## 1. 🎯 Objectifs UI

L’interface FinOps (côté utilisateur, hors admin) a pour objectif de :

- Donner une **vision claire, synthétique et navigable** des coûts.
- Permettre une exploration **Domaine → Famille → Produit → Application**.
- Supporter la **Vision Budgétaire (Pricing View)** et la comparaison entre visions.
- Mettre en évidence :
  - Tendances
  - Top consommateurs
  - Variations anormales
  - Historique d’évolution

L’UX doit être :
- Simple
- Performante
- Cohérente entre les pages
- Orientée décision

---

# 2. 🧭 Navigation générale

## 2.1 Menu FinOps (Backstage)

- Dashboard
- Domaines
- Familles
- Applications
- Classements
- Historique

Navigation hiérarchique :
- Domaine → Famille → Applications
- Application → Détail Produits

---

# 3. 🔄 Éléments communs à toutes les pages

## 3.1 Sélecteur de période
- Sélecteur mois (`YYYY-MM`)
- Option plage temporelle (historique)

## 3.2 Sélecteur Vision Budgétaire
- Dropdown global
- Par défaut : Vision courante (auto)
- Autres visions disponibles
- Option “Comparer 2 visions” (View A / View B)

## 3.3 Filtres globaux
- Domaine
- Famille
- Application (search)
- Tri (coût, variation, volume)

## 3.4 Indicateurs communs
- KPI principal (coût total)
- Variation vs période précédente
- Badge “Vision utilisée”
- Indicateur de couverture pricing (si vision incomplète)

---

# 4. 📊 Dashboard

## Objectif
Vue synthétique globale.

## Contenu

### KPI
- Coût total
- Variation % vs mois précédent
- Nombre d’applications actives
- Nombre de produits consommés

### Graphiques
- 📈 Courbe évolution 12 mois (line chart)
- 📊 Top 5 Domaines (bar chart horizontal)
- 📊 Top 5 Applications (bar chart)
- 🟡 Widget anomalies (variation > seuil)

### UX
- Clic sur un domaine → Vue Domaine
- Clic sur une application → Vue Application

---

# 5. 🌐 Vue Domaine

## Objectif
Analyser les coûts d’un domaine spécifique.

## Contenu

### KPI domaine
- Coût total domaine
- % du total global
- Variation vs N-1

### Graphiques
- 📈 Évolution mensuelle domaine
- 📊 Répartition par Famille (bar chart)
- 📊 Top Applications du domaine

### Tableau détaillé
- Famille
- Coût
- % du domaine
- Variation
- Clic drill-down

---

# 6. 🧩 Vue Famille

## Objectif
Zoom sur une famille de produits.

## Contenu

### KPI famille
- Coût total famille
- % du domaine
- Variation

### Graphiques
- 📈 Historique famille
- 📊 Répartition Applications
- 📊 Répartition Produits

### Tableau
- Application
- Coût
- Variation
- Contribution %

---

# 7. 🖥 Vue Application

## Objectif
Analyser en détail une application.

## Contenu

### KPI application
- Coût total
- Variation vs N-1
- Nombre de produits consommés

### Graphiques
- 📈 Historique coût application
- 📊 Répartition Domaine
- 📊 Répartition Famille
- 📊 Répartition Produits (stacked bar)

### Tableau Produits
- Produit
- Quantité
- Coût (selon vision)
- % contribution

### Détail relevé (popup)
- Liste des produits
- Quantité consommée
- Prix unitaire appliqué
- Vision utilisée
- Delta vs autre vision (si comparatif actif)

---

# 8. 🏆 Classements

## Objectif
Identifier les top consommateurs et anomalies.

## Modes disponibles
- Top coût
- Plus forte croissance
- Plus forte réduction
- Variation anormale

## Visualisations
- 📊 Bar chart ranking
- 🟡 Badge alerte si variation > seuil
- Filtre seuil configurable

---

# 9. 📈 Historique & Comparaisons

## Objectif
Analyser évolution multi-périodes.

## Fonctionnalités
- Plage temporelle libre
- Comparaison 2 visions budgétaires
- Comparaison N vs N-1
- Vue cumulée YTD

## Graphiques
- 📈 Multi-line chart (domaines ou apps)
- 📊 Bar comparative View A / View B
- Delta affiché en valeur + %

---

# 10. 💡 Expérience Utilisateur (UX)

## Principes
- Navigation fluide
- Drill-down progressif
- Pas de surcharge visuelle
- Temps de réponse rapide

## Recommandations
- Charts interactifs (hover détails)
- Breadcrumb visible (Domaine > Famille > App)
- Tableaux paginés
- Sticky filtres globaux
- Mode sombre compatible

---

# 11. 🔮 Évolutions futures possibles

- Alerting automatique (notification variation > seuil)
- Export CSV / Excel
- Intégration prévisions budgétaires
- Simulation pricing (What-if)
- Filtrage par squad / groupe Backstage
- Vue multi-entités comparatives

---

# 12. 🏁 Conclusion

L’interface utilisateur FinOps doit :

- Offrir une navigation hiérarchique claire
- Supporter la Vision Budgétaire dynamique
- Permettre comparaison et analyse historique
- Mettre en avant les anomalies et tendances
- Garantir performance et simplicité

Cette UX constitue la couche décisionnelle du module FinOps, en exploitant pleinement les agrégats PostgreSQL et la logique de Pricing View.
