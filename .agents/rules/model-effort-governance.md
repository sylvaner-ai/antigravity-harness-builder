---
trigger: always_on
description: "Évaluation obligatoire avant chaque tâche du couple optimal Modèle / Niveau d'effort et arbitrage coût/performance."
---

# Gouvernance Centralisée du Couple Modèle / Niveau d'Effort — antigravity-harness-builder

Aucun sous-agent (`.agents/agents/*.md`) ne contient de champ `model` dans son frontmatter YAML. Le choix du couple **Modèle / Niveau d'effort** est intégralement centralisé dans cette règle active (et détaillé dans `docs/ORCHESTRATION.md`) pour la surface **IDE**.

## 1. Gate Pré-Tâche Obligatoire (Ratio Coût / Performance Optimal)

**Avant d'exécuter chaque tâche**, l'agent principal doit obligatoirement évaluer le couple `(Modèle / Niveau d'effort)` optimal permettant d'obtenir le meilleur résultat avec un **ratio coût / performance optimal** :

1. **Identifier le couple actuellement paramétré** dans la session (via la dernière balise système `<USER_SETTINGS_CHANGE>` indiquant `Model Selection`, ou la dernière confirmation explicite de l'utilisateur dans la conversation).
2. **Déterminer le couple optimal** pour la tâche à réaliser à l'aide de la matrice décisionnelle ci-dessous.
3. **Appliquer la règle d'exécution :**
   - **Couple identique :** Si le couple optimal est **le même que celui qui est paramétré**, lancer la tâche **automatiquement** et immédiatement sans interrompre l'utilisateur.
   - **Couple différent (ou paramètre actif inconnu) :** Si le couple optimal diffère du couple paramétré (modèle sous-dimensionné risquant des régressions, modèle sur-dimensionné dégradant le ratio coût/performance, ou réglage actif non visible), **s'arrêter avant de lancer la tâche** et demander à l'utilisateur de modifier les paramètres (`Model Selection`) avec **un seul couple préconisé** (accompagné d'une justification coût/performance en une phrase). Ne jamais proposer plusieurs couples au choix.
   - **Dérogation explicite :** Si l'utilisateur confirme explicitement vouloir conserver son paramétrage actuel malgré la recommandation, exécuter la tâche immédiatement sans redemander en boucle.

## 2. Matrice Décisionnelle par Palier de Tâche

| Palier | Typologie de Tâche | Couple Unique Préconisé | Justification Coût / Performance |
| :--- | :--- | :--- | :--- |
| **T1 — Léger & Documentaire** | Questions simples, recherche ponctuelle, formatage, mise à jour de README / codemaps | **`Flash — Effort Low`** | Latence minimale et coût très réduit ; un modèle lourd gaspillerait des tokens sans gain de qualité. |
| **T2 — Localisé & Vérification** | Modification triviale et bornée (1 fichier sans impact d'architecture), exécution d'une suite de tests existante | **`Flash — Effort Medium`** | Équilibre rapidité/fiabilité idéal pour les opérations simples et bien balisées. |
| **T3 — Ingénierie Standard & TDD** | Développement de fonctionnalités (UI, routes API + Zod, requêtes ORM), cycle TDD Red-Green-Refactor, nettoyage de code mort, corrections d'erreurs de build/types | **`Pro — Effort Medium`** | Haute précision multi-fichiers et typage sûr sans payer le surcoût maximal de réflexion profonde à chaque itération. |
| **T4 — Architecture, Sécurité & Critique** | Planification `/plan` multi-modules, schéma DB/migrations, algorithmes ardus, debugging complexe, optimisation critique, revue de code et audit de sécurité OWASP | **`Pro — Effort High`** | Raisonnement approfondi indispensable pour prévenir les failles de sécurité, angles morts et régressions structurelles. |

> **Adaptation au sélecteur Antigravity (`Model Selection`) :** Traduire le palier (`Flash` ou `Pro`) vers le libellé exact de la génération active dans Antigravity lorsqu'il est connu dans la session, en formulant toujours **un seul couple préconisé**.

## 3. Couples Préconisés pour les Sous-Agents (`.agents/agents/`)

Lors d'une délégation (`invoke_subagent`), les sous-agents héritent par défaut du modèle actif validé pour la tâche selon cette table :

| Sous-Agent | Rôle | Couple Unique Préconisé | Justification Coût / Performance |
| :--- | :--- | :--- | :--- |
| `build-error-resolver` | Résolution chirurgicale d'erreurs de build et TypeScript | **`Pro — Effort Medium`** | Ratio coût/performance optimal pour diagnostiquer et corriger les erreurs de typage sans dérive architecturale. |
| `code-reviewer` | Revue indépendante de qualité, maintenabilité et sécurité | **`Pro — Effort High`** | Raisonnement approfondi indispensable pour détecter les régressions subtiles et angles morts. |
| `doc-updater` | Mise à jour de la documentation, README et codemaps | **`Flash — Effort Low`** | Latence minimale et coût très réduit pour la maintenance documentaire structurée. |
| `performance-optimizer` | Analyse de goulots d'étranglement et optimisation algorithmique/runtime | **`Pro — Effort High`** | Analyse multi-facteurs complexe (mémoire, rendu, requêtes) nécessitant une réflexion élevée. |
| `react-build-resolver` | Résolution d'erreurs de build React / Next.js / bundlers | **`Pro — Effort Medium`** | Précision ciblée sur les frontières Server/Client Components et JSX sans surcoût excessif. |
| `refactor-cleaner` | Suppression de code mort et consolidation sans régression | **`Pro — Effort Medium`** | Fiabilité élevée pour vérifier les graphes d'imports avant nettoyage. |
| `security-auditor` | Audit indépendant OWASP, injections, secrets et Zero-Trust | **`Pro — Effort High`** | Exigence maximale de rigueur pour l'audit de sécurité en lecture seule. |
