# Questions Ouvertes & Points d'Arbitrage — Antigravity Harness Builder

**Date :** 29 octobre 2026  
**Statut :** **Arbitré et validé par l'utilisateur le 29 octobre 2026** (Passage au Jalon 1 autorisé).

## Décisions validées par l'utilisateur (29 octobre 2026)

| Question | Décision retenue |
| :--- | :--- |
| **Q1. Environnement d'exécution Node.js** | **Option B retenue :** Exécution de 100 % des commandes de développement, de build et de test exclusivement à l'intérieur d'un conteneur Docker de développement (`docker run` / `docker compose exec`), sans installer Node.js sur l'hôte Ubuntu. |
| **Q2. Instance PostgreSQL de dev/test** | **Oui :** Provisionnement d'un conteneur PostgreSQL 17 dédié et isolé (à partir du Jalon 2) sans toucher aux bases Coolify existantes. |
| **Q3. Traitement des `commands/` ECC vs `workflows/`** | **Oui :** Zéro fichier `.agents/workflows/` généré ; conversion des commandes pertinentes en Skills natifs `.agents/skills/<name>/SKILL.md`. |
| **Q4. Validation des ADR (ADR-01 à ADR-09)** | **Oui :** Validation de Drizzle ORM, File de jobs PostgreSQL `SKIP LOCKED` sans Redis, Zod, `@google/genai`, sync ECC par tarball, `shadcn/ui` + Tailwind, Vitest + Playwright. |
| **Q5. Politique `hooks/` et scripts en V1** | **Oui :** Exclusion par défaut des `hooks.json` et scripts actifs en V1. |
| **Q6. Authentification V1** | **Oui :** Authentification locale autonome Email/Mot de passe avec compte Admin initial par `.env`. |
| **Q7 & Q8. Clé `GEMINI_API_KEY` et quotas par défaut** | **Oui :** Validation de l'approche `GEMINI_API_KEY` + `MockLLMAdapter` pour la CI et des seuils par défaut (`20 Mo`/fichier, `15` fichiers/projet, `12` appels LLM max, `250k` tokens max). |

---

Conformément aux consignes de la Mission 0 (§6 et §7), aucune réponse n'a été inventée silencieusement pour les points ci-dessous. Chaque question est accompagnée d'une **recommandation par défaut motivée** afin de faciliter votre décision.

---

## Priorité 1 — Décisions structurantes requises avant les Jalons 1 & 2 (Bloquantes)

### Q1. Environnement d'exécution Node.js sur le VPS pour le développement et les tests
- **Constat factuel :** L'inspection du VPS Ubuntu montre que `Docker`, `Coolify v4.5.3`, `git`, `curl` et `python3` sont installés sur l'hôte, mais que **`node` et `npm` ne sont pas installés directement sur le système hôte** (ils sont uniquement présents à l'intérieur d'images Docker).
- **Impact :** Pour initialiser le projet Next.js, exécuter `tsc`, `vitest`, `drizzle-kit` et builder les jalons 1 à 5, nous avons besoin d'un runtime Node.js LTS (Node 22 LTS).
- **Options :**
  - **Option A (Recommandée) :** Installer Node.js 22 LTS proprement sur l'hôte (via NodeSource ou `fnm`/`nvm`) pour permettre une exécution rapide et directe des tests unitaires/E2E pendant le développement, tout en livrant le `Dockerfile` et le `docker-compose.yml` pour le déploiement Coolify.
  - **Option B :** Exécuter 100 % des commandes de développement et de test exclusivement à l'intérieur d'un conteneur Docker de développement (`docker run / docker compose exec`).
- **Question :** Confirmez-vous l'Option A (installation de Node.js 22 LTS sur l'environnement de travail) ou préférez-vous l'Option B ?

### Q2. Instance PostgreSQL pour le développement et les tests automatisés
- **Constat factuel :** Trois conteneurs PostgreSQL tournent actuellement sur le VPS pour d'autres services Coolify (`coolify-db`, `database-zflthxhzujam1swrs9331h2h`, `d3jyftg33rocxwlyiznzq2hs`). Il ne faut en aucun cas toucher aux bases des applications existantes.
- **Recommandation :** Provisionner un conteneur PostgreSQL 17 dédié et isolé pour le développement et les tests d'`AntigravityHarnessBuilder` (via `docker compose` local sur un port non conflictuel, ex: `127.0.0.1:5433`), avant le déploiement final dans Coolify.
- **Question :** Validez-vous la création d'un conteneur PostgreSQL 17 dédié aux tests et au développement du projet ?

### Q3. Traitement des `commands/` ECC face à l'arrêt des `workflows/` Antigravity (19 oct. 2026)
- **Constat factuel :** Le cahier des charges (§4.4) signale l'arrêt du système de workflows Antigravity au 19 octobre 2026 et demande de privilégier les skills natifs. Or, le dépôt ECC v2.2.3 mappe encore ses fichiers `commands/*.md` vers `.agents/workflows/*.md`. À la date d'aujourd'hui (29 octobre 2026), la dépréciation des workflows Antigravity est effective.
- **Recommandation :**
  1. Ne **jamais** générer de dossier `.agents/workflows/` par défaut.
  2. Privilégier systématiquement les composants du dossier `skills/` d'ECC (qui couvrent déjà 90 % des besoins).
  3. Lorsqu'une commande du dossier `commands/` d'ECC apporte une valeur unique non couverte par un skill existant, la convertir automatiquement en un **Skill natif valide** (`.agents/skills/<command-name>/SKILL.md` avec frontmatter conforme) et la marquer comme `ecc_adapted` dans le manifeste.
- **Question :** Confirmez-vous cet arbitrage (zéro fichier `.agents/workflows/` généré, conversion éventuelle en `.agents/skills/<name>/SKILL.md`) ?

### Q4. Validation des choix technologiques différés au Jalon 0 (ADR-02 à ADR-07)
- **Contexte (§8.0 & §13 du CDC) :** Le cahier des charges demandait d'évaluer et de proposer au Jalon 0 un choix unique pour chaque responsabilité différée.
- **Synthèse de nos recommandations ([docs/TECHNICAL_DECISIONS.md](file:///root/webapp/AntigravityHarnessBuilder/docs/TECHNICAL_DECISIONS.md)) :**
  - **ORM & Migrations :** `Drizzle ORM` + `drizzle-kit` (préféré à Prisma pour sa légèreté en Docker, son typage JSONB et le support SQL natif `SKIP LOCKED` / `tsvector`).
  - **File de tâches asynchrones :** File persistante adossée à PostgreSQL (`Job` table avec `FOR UPDATE SKIP LOCKED` et checkpoints par étape, **sans Redis**).
  - **Validation de schémas :** `Zod`.
  - **Passerelle LLM :** Interface interne `LLMGateway` + adaptateur officiel `@google/genai` (Gemini) + `MockLLMAdapter` pour les tests.
  - **Indexation ECC :** Synchronisation atomique par tarball GitHub commit-SHA + PostgreSQL Full-Text Search (`tsvector` + métadonnées structurées).
  - **Stockage privé :** Volume disque privé hors `public/` (`/data/storage`) derrière une interface `StoragePort`.
  - **UI & Composants :** Tailwind CSS + primitives accessibles Radix UI (`shadcn/ui`) + `lucide-react`.
  - **Tests :** `Vitest` (unitaires, intégration, Golden Dataset) + `Playwright` (E2E).
- **Question :** Validez-vous l'ensemble de ces choix d'architecture (ADR-01 à ADR-09) ?

---

## Priorité 2 — Arbitrages fonctionnels requis avant les Jalons 3, 4 & 5

### Q5. Politique d'exclusion des `hooks/` et des scripts exécutables en V1
- **Constat factuel :** Dans ECC v2.2.3, l'adaptateur officiel pour Antigravity désactive déjà les hooks (`hooks: not-configured` dans `harness-capabilities.js`), car les scripts de hooks d'ECC sont écrits pour les payloads JSON de Claude Code et non pour le contrat `hooks.json` d'Antigravity. De plus, la section §9 du CDC interdit d'exécuter aveuglément des scripts tiers.
- **Recommandation :**
  - En V1, **exclure par défaut `hooks.json` et les scripts shell/node de `hooks/`** lors de la génération du paquet, en traduisant les garde-fous pertinents sous forme de **Règles** (`.agents/rules/`), de **Skills de vérification** et d'instructions dans `AGENTS.md` / `START_HERE.md`.
  - Si un skill ECC retenu contient un sous-dossier `scripts/` utile, ne l'inclure que sur option explicite de l'utilisateur à l'Étape 5, sans permissions d'exécution automatiques, et avec avertissement obligatoire dans le rapport de sécurité et dans `START_HERE.md`.
- **Question :** Approuvez-vous cette politique stricte « Zéro Hook / Zéro script actif par défaut » pour la V1 ?

### Q6. Mode d'authentification et création des comptes utilisateurs (V1)
- **Contexte (§1, §9, §10) :** L'application est une « application web privée » comportant un écran de connexion, une isolation des projets par utilisateur et un écran de diagnostic/synchronisation ECC (réservé à l'administration si nécessaire).
- **Options :**
  - **Option A (Recommandée pour une application privée auto-hébergée) :** Authentification locale par **Email + Mot de passe** (hachage `scrypt`/`argon2id`, sessions HTTP-only en base PostgreSQL), avec un compte Administrateur initial créé au démarrage via variables d'environnement (`INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`) et la possibilité pour l'administrateur d'autoriser/créer des utilisateurs supplémentaires (inscription publique fermée par défaut ou contrôlée par variable `ALLOW_REGISTRATION=false`).
  - **Option B :** Authentification OAuth externe (GitHub / Google) obligatoire.
- **Question :** L'Option A (authentification autonome Email/Mot de passe avec compte Admin initial par `.env`) vous convient-elle pour la V1 ?

### Q7. Fournisseur LLM et clés d'API pour les Jalons 3 et 4
- **Contexte (§8.3) :** Les Jalons 1 et 2 fonctionnent à 100 % sans appel LLM. À partir du Jalon 3 (extraction du profil assistée par IA et analyse visuelle PNG/JPEG) et du Jalon 4 (génération sur mesure), l'application utilisera la passerelle `LLM Gateway` configurée par variables d'environnement.
- **Recommandation :**
  - Configurer Google Gemini comme fournisseur initial via `GEMINI_API_KEY`, avec deux variables de modèles configurables : `GEMINI_MODEL_FAST` (par défaut `gemini-2.5-flash` ou le modèle Flash actif de votre compte) et `GEMINI_MODEL_PRO` (par défaut `gemini-2.5-pro`).
  - Permettre aux tests automatisés (CI et Golden Dataset déterministe) de tourner avec un `MockLLMAdapter` lorsque `GEMINI_API_KEY` n'est pas renseignée, et avec le vrai modèle Gemini dès que vous fournissez la clé dans `.env`.
- **Question :** Disposerez-vous d'une clé `GEMINI_API_KEY` (Google AI Studio / Vertex Express) pour les tests réels des Jalons 3 et 4, et avez-vous une préférence sur les identifiants de modèles par défaut ?

### Q8. Limites de taille d'import et quotas par défaut
- **Contexte (§3.2 & §13.1) :** Les limites de taille de fichiers importés, de durée et de budget LLM doivent être configurables par variables d'environnement et affichées clairement.
- **Valeurs par défaut proposées dans `.env.example` :**
  - `MAX_FILE_SIZE_MB=20` (20 Mo max par fichier PDF/DOCX/Image importé).
  - `MAX_PROJECT_FILES=15` (15 documents sources max par projet).
  - `MAX_LLM_Calls_PER_GENERATION=12` (Coupe-circuit anti-boucle).
  - `MAX_LLM_TOKENS_PER_GENERATION=250000` (Budget max cumulé par génération).
- **Question :** Ces seuils par défaut vous paraissent-ils adaptés à vos cahiers des charges et design systems habituels ?
