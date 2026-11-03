# START_HERE — Guide d'Installation et d'Exécution pour Google Antigravity

**Projet cible :** antigravity-harness-builder  
**Surface Antigravity ciblée :** `IDE`  
**Référence ECC :** `v2.2.3` (commit `b38be6a7f6350964d59328b52f0624e1d1d552d1`)  
**Identifiant de génération :** `canonical-generation-01`

---

## Rôle de ce fichier

Ce document est le **point d'entrée opérationnel** destiné à l'agent principal **Google Antigravity**. Vous ne devez **jamais** écraser aveuglément des fichiers existants ni exécuter des commandes à risque sans contrôle.

Suivez **strictement et dans l'ordre** les **10 étapes obligatoires** ci-dessous pour installer, vérifier et exploiter ce harnais de développement de manière **idempotente, reproductible et prudente**.

---

## Protocole d'Installation en 10 Étapes Obligatoires (§5.1)

### Étape 1 — Lecture intégrale du paquet et inspection préalable du projet cible
Avant toute création ou modification de fichier :
1. Lisez `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/ORCHESTRATION.md`, `docs/ACCEPTANCE_CRITERIA.md`, `docs/ASSUMPTIONS.md` et `docs/HARNESS_MANIFEST.json`.
2. Inspectez l'arborescence actuelle du dépôt cible (fichiers existants, `.git`, `AGENTS.md` éventuel, répertoire `.agents/` ou ancien répertoire `.agent/`).

### Étape 2 — Plan d'installation et Mode Simulation (Dry-Run préalable)
Établissez et présentez un **plan d'installation explicite (mode simulation)** classant chaque fichier du paquet dans l'une des trois catégories suivantes :
- **`[CREATE]`** : Fichier absent du projet cible, à créer.
- **`[SKIP / IDEMPOTENT]`** : Fichier déjà présent avec un contenu identique (même empreinte SHA-256 que dans `docs/HARNESS_MANIFEST.json`) — ne pas dupliquer.
- **`[CONFLICT / MERGE]`** : Fichier déjà présent dans le projet cible avec un contenu différent.

### Étape 3 — Détection des collisions et interdiction d'écrasement silencieux
- **Ne remplacez jamais un fichier existant modifié par l'utilisateur sans l'avoir signalé explicitement et obtenu confirmation.**
- Si un fichier `AGENTS.md` ou `.agents/rules/*.md` existe déjà, proposez une fusion propre préservant les directives existantes.

### Étape 4 — Préservation du code et des réglages non gérés
- Ne supprimez et ne modifiez aucun fichier de code source, de configuration d'environnement (`.env`) ou de personnalisation Antigravity existant qui ne fait pas partie du manifeste `docs/HARNESS_MANIFEST.json`.
- Ce paquet peut être réinstallé plusieurs fois (**idempotence**) sans jamais dupliquer les sections ou les fichiers gérés.

### Étape 5 — Application aux emplacements natifs compatibles Google Antigravity
Installez les composants dans l'arborescence canonique `.agents/` de Google Antigravity :
- Instructions générales à la racine : `AGENTS.md` (sans frontmatter YAML).
- Documentation de référence : `docs/*.md` et `docs/HARNESS_MANIFEST.json`.
- Règles modulaires :
- `.agents/rules/model-effort-governance.md` (always_on)
- `.agents/rules/common-code-review.md` (always_on)
- `.agents/rules/common-testing.md` (always_on)
- `.agents/rules/react-patterns.md` (glob)
- `.agents/rules/typescript-security.md` (glob)
- `.agents/rules/api-security-guards.md` (glob)
- `.agents/rules/ui-craft-and-5-states.md` (glob)
- `.agents/rules/plan-first-and-anti-omissions.md` (always_on)
- `.agents/rules/common-development-workflow.md` (always_on)
- `.agents/rules/common-patterns.md` (always_on)
- `.agents/rules/common-git-workflow.md` (always_on)
- `.agents/rules/common-coding-style.md` (always_on)
- `.agents/rules/common-hooks.md` (always_on)
- `.agents/rules/common-performance.md` (always_on)
- `.agents/rules/project-design-system-tokens.md` (glob)
- `.agents/rules/project-drizzle-orm-guidelines.md` (glob)
- Skills natifs (avec divulgation progressive) :
- `.agents/skills/react-test/SKILL.md`
- `.agents/skills/agent-payment-x402/SKILL.md`
- `.agents/skills/ai-regression-testing/SKILL.md`
- `.agents/skills/backend-patterns/SKILL.md`
- `.agents/skills/bun-runtime/SKILL.md`
- `.agents/skills/click-path-audit/SKILL.md`
- `.agents/skills/codebase-onboarding/SKILL.md`
- `.agents/skills/coding-standards/SKILL.md`
- `.agents/skills/deployment-patterns/SKILL.md`
- `.agents/skills/frontend-patterns/SKILL.md`
- `.agents/skills/gateguard/SKILL.md`
- `.agents/skills/healthcare-phi-compliance/SKILL.md`
- `.agents/skills/mysql-patterns/SKILL.md`
- `.agents/skills/mybatis-patterns/SKILL.md`
- `.agents/skills/prompt-optimizer/SKILL.md`
- `.agents/skills/react-testing/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- Sous-agents spécialisés :
- `.agents/agents/build-error-resolver.md` (couple cible centralisé : `Pro — Effort Medium`)
- `.agents/agents/code-reviewer.md` (couple cible centralisé : `Pro — Effort High`)
- `.agents/agents/performance-optimizer.md` (couple cible centralisé : `Pro — Effort High`)
- `.agents/agents/security-auditor.md` (couple cible centralisé : `Pro — Effort High`)
- `.agents/agents/react-build-resolver.md` (couple cible centralisé : `Pro — Effort Medium`)
- `.agents/agents/refactor-cleaner.md` (couple cible centralisé : `Pro — Effort Medium`)
- `.agents/agents/doc-updater.md` (couple cible centralisé : `Flash — Effort Low`)

### Étape 6 — Vérification structurelle (Chemins, YAML, Liens et Doublons)
Après mise en place des fichiers, vérifiez que :
1. Chaque skill possède bien son fichier `.agents/skills/<name>/SKILL.md` avec frontmatter YAML valide (`name` et `description`).
2. Chaque sous-agent dans `.agents/agents/<name>.md` utilise exclusivement des outils natifs Antigravity et **ne comporte aucun champ `model`** dans son frontmatter YAML (la gouvernance du couple Modèle / Effort étant centralisée dans `.agents/rules/model-effort-governance.md` et `docs/ORCHESTRATION.md`).
3. Aucun dossier obsolète `.agents/workflows/` n'est utilisé comme fondation obligatoire (conformément à la dépréciation du 19 octobre 2026).
4. Les liens relatifs entre `AGENTS.md`, `docs/ORCHESTRATION.md`, les skills et les sous-agents sont résolus et sans doublons.

### Étape 7 — Relecture critique des règles et des hypothèses (`docs/ASSUMPTIONS.md`)
Relisez l'ensemble des règles activées et le fichier `docs/ASSUMPTIONS.md`. Signalez immédiatement à l'utilisateur toute contradiction avec l'état réel du dépôt ou toute hypothèse marquée comme nécessitant un arbitrage humain avant de coder les fonctionnalités concernées.

### Étape 8 — Exécution prudente des contrôles non destructifs
Lancez uniquement des commandes de vérification en lecture seule ou sans effet de bord (vérification de présence des fichiers, validation JSON de `docs/HARNESS_MANIFEST.json`, `git status`) dans le strict respect des permissions d'Antigravity.

### Étape 9 — Validation humaine obligatoire avant toute action à risque
**ARRÊTEZ-VOUS et demandez impérativement une validation humaine explicite avant :**
- toute suppression ou écrasement de fichier existant ;
- toute installation de dépendances non triviale (`npm install`, changement de `package.json`, images Docker) ;
- toute création ou modification de variables d'environnement ou de secrets ;
- toute migration ou modification de schéma de base de données ;
- toute exécution de script externe ou commande shell ayant des effets de bord.

### Étape 10 — Compte rendu d'installation et de vérification
Produisez un rapport structuré présentant à l'utilisateur :
1. La liste exacte des fichiers créés, fusionnés ou ignorés (idempotence).
2. Le résultat des contrôles d'intégrité et de compatibilité Antigravity.
3. Les hypothèses issues de `docs/ASSUMPTIONS.md` qui demandent sa confirmation avant de démarrer le premier lot de développement.
