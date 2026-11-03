# Critères d'Acceptation Vérifiables — Antigravity Harness Builder

**Nom du projet :** `antigravity-harness-builder`  
**Version :** 2.0  
**Statut global :** Validé (77 tests Vitest exécutés et au vert)

---

## 1. Moteur Déterministe & Adaptateur Antigravity (Jalon 1)

- [x] **AC-M1-01** : Sélection déterministe et reproductible des règles, compétences et sous-agents pour un profil de projet donné.
- [x] **AC-M1-02** : Scoring d'adéquation et justification explicable pour chaque composant retenu ou rejeté.
- [x] **AC-M1-03** : Transformation et normalisation des composants ECC vers le format natif Google Antigravity.
- [x] **AC-M1-04** : Détection des synergies de bundles et prévention des collisions de nommage.

## 2. Catalogue Multi-Sources & Synchronisation Résiliente (Jalon 2 & Évolutions)

- [x] **AC-M2-01** : Synchronisation réelle de la bibliothèque GitHub `affaan-m/ECC` en moins de 10 secondes.
- [x] **AC-M2-02** : Support multi-sources incluant les dépôts tiers (ex: `emilkowalski/skills`) et les packs d'excellence locaux.
- [x] **AC-M2-03** : Gestion de cache, résilience réseau et repli automatique sur le catalogue local si GitHub est indisponible.
- [x] **AC-M2-04** : Interface d'administration unifiée "Catalogue" avec action "Synchroniser les sources".

## 3. Ingestion Documentaire, Rapport d'Audit & Profil de Projet (Jalon 3 & Évolutions)

- [x] **AC-M3-01** : Ingestion documentaire multi-sources (fichiers texte, markdown, JSON, PDF).
- [x] **AC-M3-02** : Route dédiée `/api/projects/[id]/audit-ingest` pour l'ingestion directe du fichier `antigravity-audit.json`.
- [x] **AC-M3-03** : Extraction heuristique résiliente des langages, frameworks, commandes et directives existantes sans dépendance stricte à une clé LLM.
- [x] **AC-M3-04** : Interface interactive à l'étape 2 permettant à l'utilisateur de résoudre ou modifier les incertitudes techniques avant de figer le profil.

## 4. Parcours Utilisateur en 5 Étapes & UI Craft (Jalon 4 & Évolutions)

- [x] **AC-M4-01** : Respect strict du workflow en 5 étapes ordonnées : (1) Import, (2) Profil, (3) Sélection, (4) Prévisualisation, (5) Export.
- [x] **AC-M4-02** : Navigation cohérente et synchronisée via le composant `StepNavigation`.
- [x] **AC-M4-03** : Étape 3 (Sélection) enrichie avec onglets de filtrage par catégorie (Toutes, Règles, Compétences, Sous-agents) et affichage du rôle explicite de chaque composant.
- [x] **AC-M4-04** : Filtrage strict des incompatibilités de stack (ex: Expo vs Web) et bonus de scoring Design Engineering.
- [x] **AC-M4-05** : Synthèse automatique de règles projet personnalisées issues des directives métier existantes.
- [x] **AC-M4-06** : Étape 4 (Prévisualisation) affichant le contenu réel et exhaustif des fichiers générés dans un viewer interactif.
- [x] **AC-M4-07** : Implémentation systématique de la règle des 5 états UI (Normal, Chargement animé, Vide, Erreur avec retry, Feedback toast).

## 5. Export, Déploiement & Gouvernance Modèle / Effort (Jalon 5 & Évolutions)

- [x] **AC-M5-01** : Export multi-formats : archive ZIP et archive TAR.GZ déterministe (`tar-builder.ts`).
- [x] **AC-M5-02** : Script d'installation automatisé `deploy.sh` non destructif avec sauvegarde automatique sous `.agents.backup-<timestamp>/`.
- [x] **AC-M5-03** : Guide Markdown prêt à l'emploi (`UPGRADE_PROMPT.md`) pour la mise à niveau assistée.
- [x] **AC-M5-04** : Gouvernance centralisée Modèle / Niveau d'effort : aucun champ `model` figé dans le frontmatter YAML des sous-agents, matrice décisionnelle Coût / Performance T1 à T4 et gate pré-tâche.
- [x] **AC-M5-05** : Consignes de recommandation proactive des commandes slash (`/goal`, `/plan`, `/teamwork`, `/compact`, `/learn`, `/boost`) intégrées dans `AGENTS.md` et `docs/ORCHESTRATION.md`.
- [x] **AC-M5-06** : Isolation multi-tenant et protection des routes par middleware avec validation de session cookie.
