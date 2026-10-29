# Décisions d'Architecture (ADR) — Antigravity Harness Builder

**Date :** 29 octobre 2026  
**Statut :** Proposé — En attente de validation utilisateur (Mission 0 / Jalon 0)

Ce document recense l'ensemble des décisions techniques structurantes exigées par les sections §4 de la Mission 0, §8.0 et §13 du cahier des charges. Une seule technologie est retenue par responsabilité afin d'éviter toute dispersion technique.

---

## ADR-01 — Style d'architecture : Monolithe Modulaire Next.js vs Microservices

- **Besoin :** Regrouper l'interface utilisateur, les API serveur, le moteur de génération déterministe, la synchronisation ECC et l'analyse documentaire tout en restant simple à déployer sur un VPS Ubuntu (7,8 Go RAM) via Coolify.
- **Choix recommandé :** **Monolithe modulaire Next.js (App Router, TypeScript strict)** avec séparation stricte des 10 domaines dans `src/modules/` et conteneurisation Docker (`output: 'standalone'`).
- **Alternatives sérieuses évaluées :**
  1. *Frontend Next.js + Backend API Python (FastAPI) séparé :* Rejeté (§8.0 interdit un service Python séparé sans besoin démontré ; dupliquerait les schémas de validation entre TypeScript et Pydantic).
  2. *Architecture microservices (Service Doc, Service ECC, Service Builder) :* Rejeté (complexité réseau, déploiement et observabilité disproportionnés pour la V1).
- **Avantages :** Partage natif des contrats TypeScript et des schémas Zod de bout en bout ; un seul artefact Docker à builder et versionner ; consommation mémoire réduite (< 512 Mo RAM).
- **Inconvénients :** Nécessite une discipline stricte sur les frontières d'imports (imposée par règles ESLint `no-restricted-imports`) pour éviter que l'UI n'accède directement à la base ou au SDK LLM.
- **Conséquences (Sécurité, Coûts, Maintenance) :** Surface d'attaque réduite (un seul point d'entrée HTTPS derrière Traefik/Coolify), coût d'hébergement minimal, maintenance simplifiée.
- **Conditions de révision :** Si la charge CPU/mémoire de l'extraction documentaire (PDF volumineux) dégrade le temps de réponse HTTP malgré le découplage asynchrone, extraire le module `jobs-observability` dans un second conteneur worker issu de la **même image Docker** (sans réécrire le code).

---

## ADR-02 — ORM et Système de Migrations PostgreSQL : Drizzle ORM vs Prisma

- **Besoin :** Interagir avec PostgreSQL (entités relationnelles, colonnes `JSONB` typées, index plein texte `tsvector`, verrous transactionnels `FOR UPDATE SKIP LOCKED`) et gérer des migrations versionnées, testables et reproductibles en Docker.
- **Choix recommandé :** **Drizzle ORM (`drizzle-orm` + `drizzle-kit` + driver `postgres` / `pg`)**.
- **Alternatives sérieuses évaluées :**
  1. *Prisma ORM :* Très populaire et ergonomique, mais repose sur un moteur additionnel/génération lourde, gère moins naturellement les requêtes SQL avancées (`FOR UPDATE SKIP LOCKED`, `tsvector` natif PostgreSQL) et alourdit les images Docker standalone.
  2. *Kysely (Query Builder pur) :* Excellent typage SQL, mais outillage de génération de migrations déclaratif moins intégré que `drizzle-kit`.
- **Avantages :**
  - Zéro dépendance binaire Rust externe : pur TypeScript, ultra-léger (~50 Ko), démarrage instantané en conteneur Alpine/Slim.
  - Support de premier ordre pour les colonnes `JSONB` fortement typées (`$type<ProjectProfileData>()`) et le SQL natif PostgreSQL (`SKIP LOCKED` pour la file de tâches, `to_tsvector` pour la recherche ECC).
  - Migrations SQL standard versionnées dans `drizzle/migrations/` et applicables de manière déterministe au démarrage.
- **Inconvénients :** Syntaxe proche du SQL nécessitant une bonne maîtrise relationnelle (ce qui est un atout pour la maîtrise des performances).
- **Conséquences (Sécurité, Coûts, Maintenance) :** Requêtes paramétrées par défaut (protection anti-injection SQL), empreinte mémoire minimale sur le VPS, aucune surprise lors des mises à jour d'images Docker.
- **Conditions de révision :** Aucune prévue à court terme, PostgreSQL étant le socle de référence fixe (§8.2).

---

## ADR-03 — Traitements Asynchrones et File de Tâches : Table de Jobs PostgreSQL (`SKIP LOCKED`) vs Redis/BullMQ

- **Besoin :** Exécuter les opérations longues (synchronisation ECC, extraction documentaire, génération du harnais) hors du cycle de vie des requêtes HTTP (§8.0, §8.2, §13.1), avec gestion d'états, progression par étapes (checkpoints), tentatives bornées, timeouts et reprise après redémarrage, **sans ajouter Redis sans besoin démontré**.
- **Choix recommandé :** **File de tâches transactionnelle sur PostgreSQL** (via la table `Job` et `SELECT ... FOR UPDATE SKIP LOCKED`, ou via la bibliothèque légère `pg-boss` adossée à PostgreSQL).
  - *Recommandation précise :* Implémenter un `PostgresJobQueue` dédié (~200 lignes TypeScript testées avec Drizzle) ou `pg-boss` sur le schéma PostgreSQL existant, avec checkpoints d'étapes persistés dans `Job.checkpointData`.
- **Alternatives sérieuses évaluées :**
  1. *Redis + BullMQ :* Standard industriel pour les hauts débits (> 1 000 jobs/seconde), mais introduit un service stateful supplémentaire à sécuriser, sauvegarder et superviser, explicitement déconseillé par défaut (§8.0, §8.2).
  2. *Exécution en tâche de fond mémoire (`setTimeout` / promesse non attendue dans Route Handler) :* Rejeté car toute progression est perdue en cas de redémarrage du conteneur (viole §8.2 et Risque R-05).
- **Avantages :**
  - **Zéro composant d'infrastructure supplémentaire :** une seule base PostgreSQL à sauvegarder et restaurer.
  - **Cohérence transactionnelle ACID :** la création d'une `HarnessGeneration` et l'insertion de son `Job` se font dans la même transaction SQL.
  - **Checkpointing natif :** chaque sous-étape validée met à jour `progressPercent`, `currentStep` et `checkpointData`, permettant à l'UI d'afficher la progression exacte et de relancer uniquement l'étape échouée (§15.3).
- **Inconvénients :** Charge de polling légère sur PostgreSQL (ex: 1 requête indexée toutes les 1 à 2 secondes lorsqu'aucun job n'est en cours, ou réveil immédiat en processus).
- **Conséquences (Sécurité, Coûts, Maintenance) :** Pas de port Redis exposé ; coûts RAM nuls ; sauvegarde unifiée.
- **Conditions de révision :** Si le volume dépasse plusieurs dizaines de générations simultanées par seconde (hors périmètre d'une application web privée V1), brancher un adaptateur BullMQ/Redis derrière la même interface `JobQueuePort`.

---

## ADR-04 — Passerelle LLM (`LLM Gateway`) et Fournisseur Initial : Google Gemini SDK Officiel (`@google/genai`)

- **Besoin :** Isoler les appels aux modèles d'IA derrière une interface serveur stricte (§8.3), valider toutes les réponses par des schémas typés, gérer l'analyse visuelle des documents de design system (PNG/JPEG) et maîtriser les coûts.
- **Choix recommandé :** **Architecture Port/Adapter interne (`LLMGateway`)** avec un adaptateur initial utilisant le SDK officiel **`@google/genai`** (Google Gemini API) combiné à **Zod (`zod` + `zod-to-json-schema`)** pour imposer le mode `responseSchema` (`application/json`) natif de Gemini.
- **Alternatives sérieuses évaluées :**
  1. *Vercel AI SDK (`ai` + `@ai-sdk/google`) :* Excellente abstraction multi-fournisseurs pour `generateObject`, candidat très solide. Cependant, une interface interne `LLMGateway` (5 méthodes typées) évite de lier tout le code métier aux mises à jour majeures fréquentes du Vercel AI SDK, tout en permettant d'utiliser `@google/genai` directement (notamment pour la gestion fine des `thinkingConfig` / `thinkingBudget` et des métadonnées de tokens Gemini).
  2. *Appels directs à l'API Gemini dans les services métier :* Rejeté (viole §8.3 et Risque R-06).
- **Avantages :**
  - Support natif multimodal de Gemini (lecture directe d'images PNG/JPEG de chartes graphiques et de PDF complexes).
  - Garantie de structure JSON côté modèle (`responseSchema`) **doublée** d'une validation stricte `zod.safeParse()` côté serveur avant toute persistance.
  - Cache déterministe intégré à la passerelle : hachage SHA-256 `(modelId + systemPromptVersion + inputPayloadHash + schemaHash)` permettant d'éviter tout double paiement en cas de reprise d'étape (§15.3).
- **Inconvénients :** Nécessite de maintenir l'adaptateur Gemini (~150 lignes) et un `MockLLMAdapter` déterministe pour les tests CI.
- **Conséquences (Sécurité, Coûts, Maintenance) :** Clé `GEMINI_API_KEY` lue exclusivement côté serveur (`server-only`) ; journalisation automatique des tokens consommés sans logger le contenu confidentiel des documents ; budgets plafonnés par génération.
- **Conditions de révision :** Si l'utilisateur souhaite utiliser Anthropic Claude ou OpenAI en production, il suffira d'implémenter `AnthropicAdapter` ou `OpenAIAdapter` respectant le contrat `LLMGateway`.

---

## ADR-05 — Stratégie de Synchronisation, d'Indexation et de Recherche du Catalogue ECC

- **Besoin :** Synchroniser le dépôt `https://github.com/affaan-m/ECC` de manière fiable, versionnée par commit SHA, sans scraping HTML, sans exécuter de code tiers, et permettre une recherche hybride explicable (§4.2, §4.3).
- **Choix recommandé :**
  1. **Synchronisation par téléchargement d'archive Git Tarball (`codeload.github.com/affaan-m/ECC/tar.gz/<commit-sha>`) + résolution préalable du SHA via l'API GitHub `/repos/affaan-m/ECC/commits/main` (ou tag donné) :**
     - *Pourquoi pas l'API GitHub Contents fichier par fichier ?* Le dépôt ECC contient plus de 300 fichiers (`skills/`, `agents/`, `rules/`). Les récupérer un par un épuiserait immédiatement la limite de requêtes de l'API GitHub (60 req/h sans token). Télécharger le tarball d'un commit SHA ne consomme **qu'une seule requête HTTP**, permet de vérifier le SHA-256 de chaque fichier en mémoire/stream et d'indexer tout le catalogue en moins de 3 secondes, **sans jamais exécuter aucun script**.
  2. **Indexation et Recherche Hybride dans PostgreSQL :**
     - Filtrage relationnel/JSONB strict sur la compatibilité Antigravity et les tags de stack.
     - Recherche lexicale pondérée via PostgreSQL Full-Text Search (`tsvector` avec poids `A` sur le nom et l'identifiant, `B` sur la description et les déclencheurs `When to Activate`, `C` sur le corps du Markdown) + trigrammes `pg_trgm`.
     - Re-ranking déterministe multicritère (Matrice de score explicite : adéquation domaine, adéquation stack, coût en tokens/contexte, niveau de privilège d'outils requis).
- **Alternatives sérieuses évaluées :**
  1. *Exécution de `npx ecc-universal` sur le serveur :* **Rejeté catégoriquement** (viole la règle de sécurité §9 et §7 de la Mission 0 interdisant l'exécution aveugle de code tiers).
  2. *Base vectorielle dédiée ou `pgvector` obligatoire dès le Jalon 2 :* L'ajout d'embeddings sur chaque synchronisation ajoute un coût d'API et une dépendance au fournisseur d'embeddings. La recherche combinant les métadonnées structurées (famille, langage, framework, rôle) et le Full-Text Search PostgreSQL (`tsvector`) couvre 100 % des ~180 composants d'ECC avec une explicabilité parfaite (§4.3 : *« si elle apporte un gain mesurable, recherche sémantique »*). `pgvector` pourra être activé en option si le catalogue dépasse plusieurs milliers d'entrées.
- **Avantages :** Insensible aux rate-limits GitHub (1 seul appel API + 1 tarball), atomique (bascule de `isActiveCatalog` en une transaction unique uniquement si 100 % du parsing réussit), totalement sûr (lecture passive de texte) et 100 % explicable.
- **Conditions de révision :** Si le catalogue intègre à l'avenir des milliers de composants personnalisés où la recherche lexicale + tags montre un rappel insuffisant sur le Golden Dataset, activer l'extension `pgvector` dans le même PostgreSQL.

---

## ADR-06 — Stockage Privé des Documents et Parsing Multi-Formats

- **Besoin :** Stocker de manière confidentielle les fichiers importés (`PDF`, `DOCX`, `MD`, `TXT`, `JSON`, `YAML`, `CSS/SCSS`, `PNG/JPEG`, `SVG`) et les archives ZIP générées (§8.2, §9), et extraire leur contenu sans jamais exécuter de macros ou de scripts.
- **Choix recommandé :**
  1. **Stockage :** **Système de fichiers privé sur volume Docker persistant (`/data/storage`)** abstrait derrière une interface `StoragePort` (`saveFile`, `readStream`, `deleteFile`, `verifySha256`). Les fichiers sont nommés par UUID (jamais par le nom fourni par l'utilisateur) et servis uniquement via des Route Handlers authentifiés vérifiant `project.userId`.
  2. **Bibliothèques d'extraction déclaratives (Node.js côté serveur) :**
     - Validation du type réel par signature binaire (`file-type` / inspection des magic bytes).
     - `PDF` : `unpdf` / `pdfjs-dist` (mode texte pur sans évaluation JavaScript interne du PDF).
     - `DOCX` : `mammoth` (convertit le DOCX en Markdown structuré propré sans exécuter de macros VBA/OLE).
     - `JSON` / `YAML` : `JSON.parse` / `js-yaml` (schéma `DEFAULT_SAFE_SCHEMA` / `CORE_SCHEMA` interdisant les tags exécutables).
     - `CSS/SCSS` : extraction déterministe des custom properties (`--color-*`, `--font-*`, `--spacing-*`, `@theme`) et règles de tokens.
     - `SVG` : validation XML stricte et nettoyage (`isomorphic-dompurify` / rejet de toute balise `<script>`, `<foreignObject>`, `onload`, `onerror`, `javascript:`).
     - `PNG/JPEG` : validation des dimensions/entêtes et transmission contrôlée au `LLM Gateway` (vision) si le modèle configuré le supporte.
- **Alternatives sérieuses évaluées :**
  1. *Stockage des binaires en `BYTEA` dans PostgreSQL :* Alourdit inutilement les sauvegardes SQL et la mémoire du cache PostgreSQL pour les PDF et les ZIP.
  2. *Service S3 / MinIO externe :* Ajoute un conteneur supplémentaire non indispensable sur un VPS unique, mais l'interface `StoragePort` permet d'y passer sans toucher au code métier si l'application était déployée sur plusieurs nœuds.
- **Conséquences (Sécurité, Coûts, Maintenance) :** Isolation totale hors du dossier `public/` de Next.js ; suppression physique garantie sur le disque lors de la suppression d'un document ou d'un projet (§9, §11.4).

---

## ADR-07 — Bibliothèque UI, Design System de l'Application et Gestion d'État

- **Besoin :** Construire une interface sobre, haut de gamme, rapide, accessible (clavier, contrastes, focus) et distincte du design system importé pour le projet cible (§10).
- **Choix recommandé :** **Tailwind CSS + Primitives Radix UI accessibles (modèle `shadcn/ui` copié dans `src/components/ui/`) + `lucide-react`** pour l'iconographie.
- **Alternatives sérieuses évaluées :**
  1. *Material UI (MUI) ou Ant Design :* Lourd en JS client, difficile à intégrer proprement avec les React Server Components de Next.js App Router, et esthétique trop générique.
  2. *Tailwind CSS seul sans primitives accessibles :* Risque élevé de non-conformité d'accessibilité clavier/ARIA sur les modales, onglets, accordéons et arbres de prévisualisation (§10).
- **Avantages :** Les composants résident directement dans le code source du projet (pas de boîte noire NPM opaque), respectent nativement les normes WAI-ARIA (navigation clavier, focus trap), et utilisent des tokens CSS dédiés (`--ahb-*`) pour garantir qu'aucun token du projet cible prévisualisé ne pollue l'interface du générateur.

---

## ADR-08 — Authentification et Isolation des Projets

- **Besoin :** Authentifier les utilisateurs de cette application web privée et vérifier les autorisations côté serveur sur chaque projet, document, génération et export (§9, §10, §11.4).
- **Choix recommandé :** **Sessions HTTP-only signées/chiffrées gérées en base PostgreSQL** (via `Auth.js` / `NextAuth` v5 ou implémentation session-cookie stricte avec hachage `argon2id` / `scrypt`), complétées par un helper serveur obligatoire `requireProjectAccess(projectId, userId)` appelé dans chaque Route Handler et Server Action.
- **Avantages :** Aucune dépendance à un service cloud d'authentification tiers payant (Clerk/Auth0) ; fonctionne en autohébergement complet sur le VPS Coolify ; révocation immédiate des sessions possible en base PostgreSQL ; support du rôle `ADMIN` pour l'écran de diagnostic/synchronisation ECC (§10 écran 8).

---

## ADR-09 — Stratégie de Tests et de Validation Continue

- **Besoin :** Valider les tests unitaires, d'intégration, end-to-end critiques et le Golden Dataset (§8.1, §11.5, §15.2).
- **Choix recommandé :**
  - **Tests unitaires & d'intégration + Golden Dataset Runner :** **Vitest** (rapide, natif TypeScript/ESM, idéal pour tester les validateurs du Jalon 1, l'indexeur ECC du Jalon 2 et l'évaluation du Golden Dataset §15.2).
  - **Tests End-to-End (Parcours critique UI) :** **Playwright** (testant le parcours complet de la connexion jusqu'au téléchargement et à la vérification du fichier ZIP).
  - **Assemblage ZIP :** **`archiver`** ou **`yazl` / `fflate`** côté génération + **`yauzl` / `adm-zip`** dans les tests pour décompresser et inspecter automatiquement les archives générées en CI (§11.4).
