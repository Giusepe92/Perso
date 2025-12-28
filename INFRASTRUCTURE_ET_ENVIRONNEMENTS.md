# Infrastructure & Environnements

Ce document décrit l’infrastructure applicative, les environnements, les modes de déploiement
et l’organisation GitOps pour l’ensemble des composants de la plateforme.

Il constitue la **source de vérité** pour comprendre :
- où une application est déployée
- comment elle est déployée
- via quels outils (Helm, Argo CD, GitOps)
- comment sont structurés les environnements

---

## 1. Vue d’ensemble de la plateforme

La plateforme repose sur une approche **GitOps stricte** :

- **Git** est la source de vérité
- **Helm** génère les manifestes Kubernetes
- **Argo CD** applique et synchronise les déploiements
- **Kubernetes** exécute les workloads

Chaque application :
- est versionnée
- est déployée par environnement
- dispose de son namespace dédié
- est représentée par une Application Argo CD

---

## 2. Environnements

### Development
- Environnement de développement actif
- Déploiement automatique
- Debug et logs détaillés

### Staging
- Environnement de validation
- Configuration proche de la production

### Production
- Environnement de production
- Haute disponibilité
- Sécurité renforcée

---

## 3. Types d’applications

### Microservice
- Backend applicatif
- API REST
- Frameworks : Quarkus, Spring Boot, Node.js

### Portail / Frontend
- Interfaces web
- Exemples : portail-rosetta, backstage

---

## 4. Organisation Kubernetes

### Namespaces

- Development : `sfs-sandbox-development`
- Staging : `sfs-sandbox-staging`
- Production : `sfs-production`

---

## 5. URLs

- Development  
  https://deployment-ms-dev.devops-hors-prod.caas.cagip.group.gca

- Staging  
  https://deployment-ms-staging.devops-hors-prod.caas.cagip.group.gca

- Production  
  https://deployment-ms.prod.caas.cagip.group.gca

---

## 6. Argo CD

Convention de nommage :

```
<application>-<environnement>
```

Exemples :
- deployment-ms-development
- deployment-ms-staging
- deployment-ms-production

---

## 7. Helm & Values

Les manifestes sont générés via Helm à partir de charts standards.

- Chart microservice : `quarkus-ms-base`
- Un fichier values par environnement

---

## 8. Variables d’environnement

Sources possibles :
- Values Helm
- ConfigMap Kubernetes
- Secret Kubernetes

L’application est **stateless** (aucun volume persistant).

---

## 9. Flux GitOps

1. Modification des values
2. Rendu Helm
3. Commit GitOps
4. Synchronisation Argo CD

---

## 10. Désactivation d’un environnement

La synchronisation Argo CD peut être désactivée tout en conservant le rendu Helm.

---

## 11. Responsabilités

- Développeurs : code et config applicative
- DevOps : charts, GitOps, Argo CD
