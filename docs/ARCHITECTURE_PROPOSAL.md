# Proposition d'Architecture — Antigravity Harness Builder

**Date :** 29 octobre 2026  
**Style d'architecture :** Monolithe modulaire (Next.js App Router + PostgreSQL + Stockage privé sur volume persistant + Worker asynchrone adossé à PostgreSQL).  
**Environnement cible :** VPS Ubuntu (7,8 Go RAM, 96 Go SSD), Docker & Coolify v4.5.3.

---

## 1. Principes directeurs et philosophie d'architecture

Conformément aux sections §8.0 et §13 du cahier des charges, l'architecture proposée respecte trois règles d'or :

1. **Sobriété opérationnelle maximale (Zéro infrastructure superflue) :**
   - **Pas de Redis**, pas de broker externe (RabbitMQ/Kafka), pas de microservice Python séparé, pas de base vectorielle externe en V1.
   - **PostgreSQL 17/18** est la source de vérité unique pour les données relationnelles, la recherche plein texte (`tsvector` + `pg_trgm`), les structures flexibles (`JSONB` validé par Zod) et la file de tâches persistantes (`Job`).
2. **Séparation stricte du cœur déterministe et de l'IA générative :**
   - Le moteur d'adaptation Antigravity (`Antigravity Adapter`), le validateur de compatibilité et l'assembleur d'archive (`Package Exporter`) sont des **fonctions pures et déterministes**, testables à 100 % sans aucun appel LLM (conformément au Jalon 1).
   - Le LLM (`LLM Gateway`) n'intervient que sur des étapes cognitives bornées (extraction de profil, enrichissement du classement, rédaction assistée de sections) en produisant exclusivement des **sorties structurées validées par Zod**.
3. **Découplage total entre requêtes HTTP et traitements longs :**
   - Aucune opération lourde (synchronisation GitHub ECC, extraction multi-documents, génération du harnais) ne s'exécute de manière bloquante dans le cycle de vie d'une requête HTTP Next.js.

---

## 2. Vue d'ensemble du système (Diagramme de conteneurs & composants)

```mermaid
flowchart TB
    subgraph Client["Navigateur Utilisateur (HTTPS)"]
        UI["Interface Web (Next.js React 19 / Tailwind CSS)"]
    end

    subgraph VPS["VPS Ubuntu — Coolify v4.5.3 / Docker"]
        Proxy["Traefik Reverse Proxy (Coolify)"]

        subgraph AppContainer["Conteneur Application (Next.js Monolithe Modulaire)"]
            API["Route Handlers & Server Actions\n(Auth, Projets, Statuts de Jobs, Téléchargement)"]
            
            subgraph CoreDomains["Domaines Métier (/src/modules/*)"]
                MOD_DOC["1. Documents\n(Import sûr, MIME, Extraction)"]
                MOD_PROF["2. Profil de Projet\n(Schéma Zod, Diff explicite/déduit/hypothèse)"]
                MOD_ECC["3. ECC Catalog\n(Sync GitHub API/Tarball, Indexation, Cache)"]
                MOD_SEL["4. Selection Engine\n(Recherche hybride, Scoring explicable)"]
                MOD_BLD["6. Harness Builder\n(Rédaction structurée, Orchestration)"]
                MOD_AGY["7. Antigravity Adapter\n(Mapping .agents/, Validateurs statiques)"]
                MOD_EXP["8. Package Exporter\n(ZIP sécurisé, Manifeste, SHA-256)"]
            end

            MOD_LLM["5. LLM Gateway\n(Port agnostique, Adaptateur Gemini, Quotas)"]
            MOD_JOB["10. Job Runner (In-Process / Worker PG)\n(Polling SKIP LOCKED, Checkpoints, Retries)"]
        end

        subgraph Storage["Persistance Isolée (Docker Volumes & Réseau Privé)"]
            PG[("PostgreSQL 17/18\n(Données, FTS Index, Table Jobs)")]
            FS[("Volume Privé (/data/storage)\n(Documents sources & Archives ZIP)")]
        end
    end

    subgraph External["Services Externes (Sortants uniquement)"]
        GH["GitHub API / Codeload\n(affaan-m/ECC)"]
        GEMINI["Fournisseur LLM\n(Google Gemini API)"]
    end

    UI <-->|"HTTPS"| Proxy
    Proxy <-->|"HTTP interne"| API
    API --> CoreDomains
    API --> PG
    API --> FS
    MOD_JOB <-->|"Verrouillage transactionnel\nFOR UPDATE SKIP LOCKED"| PG
    MOD_JOB --> CoreDomains
    MOD_DOC --> FS
    MOD_EXP --> FS
    MOD_ECC -->|"HTTPS (Lecture seule + Cache SHA)"| GH
    CoreDomains --> MOD_LLM
    MOD_LLM -->|"HTTPS (Clé serveur uniquement)"| GEMINI
```

---

## 3. Découpage en 10 modules métier et frontières de responsabilité (§13 CDC)

L'arborescence du code dans `src/modules/` isole strictement les 10 domaines exigés par la section 13 du cahier des charges. Les dépendances inter-modules sont unidirectionnelles (aucune dépendance circulaire) :

| # | Module (`src/modules/<nom>`) | Responsabilités exclusives | Dépendances autorisées | Garanties de sécurité & qualité |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **`documents`** | Vérification des magic bytes/MIME, contrôle de taille, calcul SHA-256, stockage dans le volume privé hors `public/`, extraction de texte brut/structuré (`PDF`, `DOCX`, `MD`, `TXT`, `JSON`, `YAML`, `CSS/SCSS`), sanitization SVG, nettoyage Unicode anti-injection. | Stockage privé, `llm-gateway` (uniquement pour l'analyse visuelle PNG/JPEG si activée). | N'exécute jamais de macro, de JS ni d'entités externes XML (XXE). |
| **2** | **`project-profile`** | Définition du schéma strict `ProjectProfileSchema` (Zod), structuration des champs extraits avec qualification (`explicit`, `deduced`, `hypothesis`, `missing_or_contradictory`), niveau de confiance et citation de source (`documentId`, extrait/page). Gestion des éditions manuelles de l'utilisateur. | `documents`, `llm-gateway`, Base de données. | Sépare la version extraite par l'IA de la version confirmée/corrigée par l'humain. |
| **3** | **`ecc-catalog`** | Synchronisation atomique depuis `https://github.com/affaan-m/ECC` (via tarball GitHub d'un commit/tag identifiable), parsing des manifestes (`manifests/*.json`), des `rules/`, `agents/` et `skills/*/SKILL.md`. Exclusion de `.agents/` (Codex) et `hooks/`. Indexation plein texte PostgreSQL. | API GitHub, `antigravity-adapter`, Base de données. | Transaction atomique : si la synchronisation échoue, le catalogue précédent reste intact (FR-04). |
| **4** | **`selection-engine`** | Filtrage bloquant de compatibilité Antigravity, recherche hybride (métadonnées + lexicale FTS PostgreSQL), classement multicritère explicable (pertinence métier/stack, coût contexte, sécurité, redondance), détection des dépendances et proposition de composants sur mesure (`project_custom`). | `project-profile`, `ecc-catalog`, `antigravity-adapter`, `llm-gateway`. | Explique chaque choix ET pourquoi les candidats proches ont été écartés (§15.1 Jalon 4). |
| **5** | **`llm-gateway`** | Interface abstraite `LLMProvider`, implémentation initiale Google Gemini (`@google/genai`), validation systématique des sorties par schéma Zod, cache par hash SHA-256 des entrées, gestion des timeouts, retries bornés, rate-limiting et comptabilité des tokens/coûts. | SDK Fournisseur IA, Base de données (cache & métriques). | Aucune clé API exposée côté client ou dans les logs. Coupe-circuit budgétaire par job. |
| **6** | **`harness-builder`** | Pipeline séquentiel de génération : construction du plan d'orchestration (`ORCHESTRATION.md`), adaptation des composants ECC retenus, génération des composants sur mesure, de `AGENTS.md`, `START_HERE.md`, `README.md` et des documents normalisés (`docs/*.md`). | `project-profile`, `selection-engine`, `antigravity-adapter`, `llm-gateway`. | Pipeline par étapes avec checkpoints ; pas d'appel LLM unique monolithique (§15.3). |
| **7** | **`antigravity-adapter`** | **Cœur déterministe sans LLM :** constantes et schémas par surface (`App`, `IDE`, `CLI`), table de traduction des outils Claude -> Antigravity, mapping des tiers de modèles (`inherit`, `flash`, `pro`), sérialisation YAML canonique, validateurs syntaxiques et de budget de tokens (`< 24 Ko` par règle, `< 20 000` tokens cumulés). | *Aucune dépendance externe ni LLM* (module pur). | Bloque toute configuration invalide ou non vérifiée. Maintient la matrice de compatibilité (§15.4). |
| **8** | **`package-exporter`** | **Cœur déterministe sans LLM :** assemblage en mémoire/streaming de l'archive ZIP, génération de `docs/HARNESS_MANIFEST.json` et `docs/ECC_SOURCES.md` (licence MIT + URLs par commit SHA), calcul des empreintes SHA-256, protection anti-Zip Slip et anti-collision. | `antigravity-adapter`, Stockage privé. | Reproductibilité bit-à-bit (hors timestamp manifeste) à entrées identiques (Jalon 1). |
| **9** | **`ui-projects`** | Composants React/Tailwind du design system propre à l'application, gestion des projets (FR-01), assistant en 6 étapes (§3), éditeur de profil, ajustement de sélection, explorateur d'arborescence et prévisualiseur de fichiers avec avertissements. | Tous les modules via couche service serveur + Authentification. | Contrôle d'autorisation serveur systématique (`userId`) sur chaque route et action (§9). |
| **10** | **`jobs-observability`** | File d'attente persistante adossée à PostgreSQL (`SELECT ... FOR UPDATE SKIP LOCKED`), exécution asynchrone par étapes, suivi de progression en temps réel (polling léger ou SSE), reprise après redémarrage, journalisation structurée JSON (Pino) expurgée de toute donnée confidentielle. | Base de données PostgreSQL. | Compatible avec un conteneur unique ou un worker séparé sous Coolify sans changer le code métier. |

---

## 4. Modèle de données relationnel (PostgreSQL)

Le schéma suivant concrétise et précise les entités de la section §12 du cahier des charges :

```mermaid
erDiagram
    User ||--o{ Project : "possède (owner)"
    Project ||--o{ SourceDocument : "contient"
    Project ||--o{ ProjectProfile : "définit (versionné)"
    Project ||--o{ HarnessGeneration : "historise"
    Project ||--o{ Job : "exécute"
    EccSync ||--o{ EccComponent : "indexe (snapshot SHA)"
    EccSync ||--o{ HarnessGeneration : "référence"
    ProjectProfile ||--o{ HarnessGeneration : "alimente"
    HarnessGeneration ||--o{ GeneratedArtifact : "produit"
    HarnessGeneration ||--o| Job : "piloté par"

    User {
        uuid id PK
        string email UK
        string passwordHash
        string role "USER | ADMIN"
        jsonb preferences
        timestamp createdAt
    }

    Project {
        uuid id PK
        uuid userId FK
        string name "Nom du projet cible"
        string description
        string targetSurface "APP | IDE | CLI"
        string status "ACTIVE | ARCHIVED"
        timestamp createdAt
        timestamp updatedAt
    }

    SourceDocument {
        uuid id PK
        uuid projectId FK
        string role "SPECIFICATION | DESIGN_SYSTEM | SUPPLEMENTARY"
        string originalName
        string safeStoragePath "Chemin privé hors public/"
        string mimeType
        integer sizeBytes
        string sha256Hash
        string extractionStatus "PENDING | COMPLETED | FAILED"
        text extractedText "Texte normalisé et nettoyé"
        jsonb extractionMeta "Pages, warnings, méthode"
        timestamp createdAt
    }

    ProjectProfile {
        uuid id PK
        uuid projectId FK
        integer version
        string status "DRAFT_EXTRACTED | USER_CONFIRMED"
        jsonb profileData "Schéma typé avec provenance explicit/deduced/hypothesis/missing"
        jsonb userNotes "Notes complémentaires de l'étape 2"
        string profileSha256 "Empreinte pour cache et reproductibilité"
        timestamp confirmedAt
        timestamp createdAt
    }

    EccSync {
        uuid id PK
        string commitSha "SHA-1 complet du commit GitHub"
        string versionTag "ex: v2.2.3"
        string status "IN_PROGRESS | VALID | FAILED"
        boolean isActiveCatalog "Un seul catalogue actif de référence"
        integer componentCount
        string catalogSha256
        jsonb errorDetails
        timestamp syncedAt
    }

    EccComponent {
        uuid id PK
        uuid eccSyncId FK
        string externalId "ex: agent:architect, skill:backend-patterns, rule:typescript-coding-style"
        string kind "RULE | SKILL | SUBAGENT | COMMAND_CONVERTED"
        string name
        string description
        string sourceRelativePath "Chemin dans affaan-m/ECC"
        string license "MIT"
        string contentSha256
        text rawContent "Contenu brut Markdown/JSON"
        jsonb parsedMeta "Frontmatter, tools, model, tags, dependencies"
        string compatibilityStatus "AUTO_VALIDATED | DOC_COMPATIBLE | UNVERIFIED | INCOMPATIBLE"
        jsonb compatibilityNotes "Transformations requises ou raisons d'exclusion"
        tsvector searchVector "Index plein texte PostgreSQL"
    }

    HarnessGeneration {
        uuid id PK
        uuid projectId FK
        uuid projectProfileId FK
        uuid eccSyncId FK
        string status "PENDING | RUNNING | COMPLETED | PARTIALLY_FAILED | FAILED"
        string presetMode "BALANCED | MINIMAL | THOROUGH"
        jsonb selectionState "Composants retenus, écartés, justifications, priorités"
        jsonb orchestrationPlan "Rôles, tiers de modèles, efforts conseillés"
        jsonb validationReport "Contrôles passés/échoués, budget tokens, warnings"
        string zipStoragePath "Chemin privé du ZIP généré"
        string zipSha256 "Empreinte SHA-256 de l'archive"
        integer llmTokensUsed
        timestamp createdAt
        timestamp completedAt
    }

    GeneratedArtifact {
        uuid id PK
        uuid generationId FK
        string relativePath "ex: .agents/skills/api-design/SKILL.md"
        string artifactType "START_HERE | AGENTS_MD | DOC | RULE | SKILL | SUBAGENT | MANIFEST"
        string originStatus "ECC_VERBATIM | ECC_ADAPTED | PROJECT_CUSTOM"
        uuid sourceEccComponentId FK "Nullable si PROJECT_CUSTOM"
        text content "Contenu textuel final validé"
        integer sizeBytes
        string sha256Hash
        string validationStatus "AUTO_VALIDATED | DOC_COMPATIBLE | UNVERIFIED | INVALID"
        jsonb validationIssues
    }

    Job {
        uuid id PK
        uuid projectId FK "Nullable pour ECC_SYNC global"
        uuid generationId FK "Nullable"
        string type "DOCUMENT_EXTRACT | PROFILE_ANALYZE | ECC_SYNC | HARNESS_GENERATE"
        string status "QUEUED | RUNNING | COMPLETED | FAILED | CANCELED"
        string currentStep "Étape courante du pipeline"
        integer progressPercent
        integer attempts
        integer maxAttempts "Défaut: 3"
        jsonb checkpointData "État intermédiaire pour reprise idempotente"
        jsonb safeError "Message d'erreur sans secrets ni contenu confidentiel"
        timestamp lockedAt "Heartbeat pour détection des jobs orphelins"
        timestamp runAfter "Pour backoff exponentiel"
        timestamp createdAt
        timestamp completedAt
    }
```

---

## 5. Flux de données principaux et exécution asynchrone

### 5.1 Flux d'analyse documentaire et de confirmation du profil (Étapes 2 & 3)
1. **Import (`POST /api/projects/[id]/documents`) :**
   - Vérification de la session utilisateur et de la propriété du projet (`project.userId === session.user.id`).
   - Validation des magic bytes (ex: `%PDF-`, signature ZIP/DOCX `PK\x03\x04`, UTF-8 valide pour MD/TXT/JSON/YAML/CSS, DOMPurify/liste blanche stricte sans `<script>` ni `on*` pour SVG).
   - Écriture dans `/data/storage/projects/<projectId>/inputs/<uuid>` et création de `SourceDocument`.
2. **Job d'extraction et d'analyse (`DOCUMENT_EXTRACT` -> `PROFILE_ANALYZE`) :**
   - Extraction déterministe du texte et de la structure (titres, tableaux, tokens CSS/JSON).
   - Nettoyage anti-injection (suppression des caractères Unicode de contrôle/invisibles).
   - Appel au `LLM Gateway` avec `ProjectProfileSchema` (Zod) : chaque exigence, règle métier ou token de design system extrait est obligatoirement accompagné de `{ classification: 'explicit' | 'deduced' | 'hypothesis' | 'missing_or_contradictory', confidence: 'high' | 'medium' | 'low', sourceRef: '...' }`.
3. **Validation humaine :**
   - L'utilisateur consulte, filtre par statut (`explicit`, `deduced`, `hypothesis`, `missing`) et modifie le profil dans l'interface. La validation crée une version figée `USER_CONFIRMED` avec son `profileSha256`.

### 5.2 Flux de sélection explicable et de génération du harnais (Étapes 4, 5 & 6)

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant UI as Interface Next.js
    participant API as API Server / Jobs
    participant DB as PostgreSQL
    participant SEL as Selection Engine
    participant BLD as Harness Builder
    participant AGY as Antigravity Adapter (Pur)
    participant EXP as Package Exporter (Pur)

    User->>UI: Valide le profil & demande la composition (Étape 4)
    UI->>API: POST /api/projects/{id}/compose
    API->>DB: Crée Job (HARNESS_GENERATE) & retourne 202 Accepted
    API->>SEL: 1. Filtrage compatibilité surface (App/IDE/CLI)
    SEL->>DB: 2. Recherche hybride dans EccComponent (Catalogue actif)
    SEL->>SEL: 3. Scoring explicable + Déduplication + Raison d'exclusion
    SEL->>DB: Sauvegarde Checkpoint (Proposition de sélection)
    UI-->>User: Affiche la sélection, justifications et avertissements (Étape 5)
    User->>UI: Ajuste les composants (ajout/retrait) & valide la génération
    UI->>API: POST /api/generations/{genId}/build
    API->>BLD: Génère les fichiers par étapes (Règles, Skills, Agents, Docs)
    BLD->>AGY: Adapte frontmatters YAML, traduit outils/modèles, vérifie quota 24 Ko
    AGY-->>BLD: Statuts (AUTO_VALIDATED / DOC_COMPATIBLE / erreurs bloquantes)
    BLD->>EXP: Assemble l'arborescence, HARNESS_MANIFEST.json, ECC_SOURCES.md & ZIP
    EXP-->>DB: Persiste GeneratedArtifact + Archive ZIP + SHA-256
    UI-->>User: Prévisualisation complète & Téléchargement ZIP / START_HERE.md (Étape 6)
```

---

## 6. Architecture de déploiement sous Docker & Coolify (VPS Ubuntu)

Conformément à l'inspection du VPS (Coolify v4.5.3 actif, 7,8 Go RAM, 87 Go SSD disponibles), le déploiement en production reposera sur une architecture conteneurisée simple et robuste :

1. **Image Docker multi-stage (`Dockerfile`) :**
   - `deps` : installation reproductible via `npm ci` (fichier `package-lock.json` verrouillé).
   - `builder` : vérification du typage (`tsc --noEmit`) et build Next.js en mode `output: 'standalone'`.
   - `runner` : image `node:22-alpine` (ou `debian-slim` si requis par un parseur natif), utilisateur non-root (`nextjs:nodejs`), sans aucun secret intégré à l'image (§8.4).
2. **Exécution du Worker de Jobs :**
   - Le code du `JobRunner` est partagé au sein du monolithe.
   - En V1 sur le VPS, il peut tourner soit dans une boucle asynchrone singleton initialisée par `instrumentation.ts` de Next.js (zéro conteneur supplémentaire), soit via une seconde commande du même conteneur Docker (`node dist/worker.js`) dans le `docker-compose.yml` géré par Coolify, garantissant qu'aucun traitement n'impacte la latence du serveur HTTP tout en partageant exactement la même base de code.
3. **Volumes persistants et sauvegardes :**
   - `pg_data` : données PostgreSQL 17/18.
   - `app_storage` : monté sur `/data/storage` (droits `0700`, accessible uniquement par l'utilisateur applicatif) pour les documents importés et les ZIP générés.
   - Script documenté de sauvegarde (`pg_dump` + archive chiffrée/compressée de `/data/storage`) et de restauration testée (§8.4, §11.5).
4. **Endpoint de santé (`/api/health`) :**
   - Vérifie la connectivité PostgreSQL (`SELECT 1`), l'accès en écriture au volume privé `/data/storage`, et l'état du dernier catalogue ECC, utilisé par le healthcheck Docker/Coolify pour le déploiement zero-downtime et le rollback automatique.
