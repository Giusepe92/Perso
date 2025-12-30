# Kubernetes – Guide Complet de A à Z (Vision Architecte & Entreprise)

> Guide Kubernetes complet expliquant **tous les concepts de A à Z**, avec une **vision réaliste entreprise**.
> Ce document distingue clairement :
> - ce qui relève de l’équipe **Plateforme / SRE**
> - ce qui relève des **équipes applicatives**
>
> Objectifs :
> - Compréhension globale Kubernetes
> - Vision architecte
> - Support de révision CKA

---

## 1. Kubernetes – Définition

**Définition**  
Kubernetes est une plateforme d’orchestration de conteneurs permettant de déployer, exécuter, sécuriser et faire évoluer des applications de manière déclarative.

**Pourquoi**  
- Mutualiser les ressources
- Standardiser les déploiements
- Garantir haute disponibilité et résilience

---

## 2. Cluster Kubernetes

**Définition**  
Un cluster est un ensemble de machines (nodes) coopérant pour exécuter des workloads.

**Pourquoi**  
- Scalabilité horizontale
- Tolérance aux pannes

**Composition**
- Control Plane
- Worker Nodes

---

## 3. Control Plane

### kube-apiserver
Point d’entrée API unique.

### etcd
Base clé-valeur de l’état du cluster.

### scheduler
Assigne les Pods aux nodes.

### controller-manager
Boucles de réconciliation.

---

## 4. Nodes

**Définition**  
Machine hébergeant les Pods.

**Composants**
- kubelet
- container runtime
- kube-proxy

---

## 5. Fonctionnement déclaratif

**Principe**  
L’utilisateur décrit l’état désiré, Kubernetes converge vers celui-ci.

**Pourquoi**
- Auto-healing
- Résilience

---

## 6. Workloads

### Pod
Unité minimale déployable.

### ReplicaSet
Garantit un nombre de Pods.

### Deployment
Gestion déclarative du déploiement.

### StatefulSet
Identité stable.

### DaemonSet
Un Pod par node.

### Job / CronJob
Exécutions finies ou planifiées.

---

## 7. Ressources & stabilité

### Requests / Limits
Garanties et plafonds de ressources.

### QoS
- Guaranteed
- Burstable
- BestEffort

### ResourceQuota
Limites par namespace.

### LimitRange
Bornes par défaut.

---

## 8. Scheduling

### nodeSelector
Placement simple.

### Affinity / Anti-affinity
Placement avancé.

### Taints / Tolerations
Nodes dédiés.

---

## 9. Réseau Kubernetes

### Service
Accès stable aux Pods.

Types :
- ClusterIP
- NodePort
- LoadBalancer
- ExternalName

### kube-proxy
Implémentation réseau.

---

## 10. Ingress & HTTP

### Ingress
Routage HTTP/HTTPS.

### Ingress Controller
NGINX, Traefik.

### TLS
Sécurisation HTTPS.

---

## 11. Sécurité – API

### Namespace
Isolation logique.

### RBAC
Contrôle d’accès API.

### ServiceAccount
Identité Pod.

---

## 12. Sécurité réseau

### NetworkPolicy
Contrôle des flux.

---

## 13. Sécurité des conteneurs

### SecurityContext
Exécution non-root.

### PodSecurity
Niveaux :
- privileged
- baseline
- restricted

---

## 14. Configuration

### ConfigMap
Configuration externe.

### Secret
Données sensibles.

---

## 15. Stockage

### PV / PVC
Abstraction stockage.

---

## 16. Observabilité

### Logs
Centralisation.

### Metrics
Prometheus.

### Traces
OpenTelemetry.

---

## 17. Haute disponibilité

### Réplicas
### Anti-affinity
### PodDisruptionBudget

---

## 18. CI/CD & GitOps

**Définition**  
Déploiement piloté par Git.

**Pourquoi**
- Audit
- Rollback

---

## 19. Kubernetes en entreprise

### Équipe Plateforme (SRE)
- Crée et opère les clusters
- Sécurité
- Observabilité
- Gouvernance

### Équipes applicatives
- Déploient dans un namespace
- Respectent les politiques

---

## 20. Conclusion

Kubernetes est :
- Une plateforme
- Un standard cloud-native
- Un socle d’entreprise

