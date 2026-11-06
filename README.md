# Antigravity Harness Builder

Application web privée qui transforme le cahier des charges et le design system d'un projet en un **harnais de développement sur mesure pour Google Antigravity** : règles, skills, sous-agents, `AGENTS.md`, documentation et script de déploiement, sélectionnés dans un catalogue multi-sources.

Usage interne. Cahier des charges de référence : [`cahier_des_charges_antigravity_harness_builder.md`](./cahier_des_charges_antigravity_harness_builder.md).

## Fonctionnement

1. Import du cahier des charges et du `DESIGN.md` du projet cible.
2. Extraction d'un profil de projet (LLM Gemini, validé par un schéma Zod), relu et confirmé par l'utilisateur.
3. Sélection des composants dans le catalogue : ECC, emilkowalski/skills, obra/superpowers, cloudflare/security-audit-skill, dietrichgebert/ponytail et composants « curated » du générateur.
4. Génération et export du paquet (`START_HERE.md`, `.agents/`, `AGENTS.md`, `docs/`), avec provenance et licences.

Documentation utile : [`docs/CATALOGUE_MULTI_SOURCES.md`](./docs/CATALOGUE_MULTI_SOURCES.md), [`docs/GOUVERNANCE_CONTEXTE.md`](./docs/GOUVERNANCE_CONTEXTE.md), [`docs/AUTO_TEST_ANTIGRAVITY.md`](./docs/AUTO_TEST_ANTIGRAVITY.md), [`docs/BANC_ESSAI_ANTIGRAVITY.md`](./docs/BANC_ESSAI_ANTIGRAVITY.md), [`docs/OPERATIONS_AND_BACKUP.md`](./docs/OPERATIONS_AND_BACKUP.md).

## Stack

Next.js 16, React 19, TypeScript strict, Tailwind CSS, PostgreSQL + Drizzle, Zod 4, `@google/genai`, Vitest. Déploiement Docker (Coolify sur VPS).

## Démarrage en développement

```bash
cp .env.example .env        # renseigner SESSION_SECRET, GEMINI_API_KEY, etc.
npm ci
npm run db:migrate          # PostgreSQL requis (DATABASE_URL)
npm run dev
```

Commandes : `npm run typecheck`, `npm test`, `npm run build`.

## Déploiement

`docker compose up -d --build` (application + PostgreSQL 17). Variables : voir `.env.example`. Sauvegarde et exploitation : `docs/OPERATIONS_AND_BACKUP.md`.

## Harnais du dépôt

Ce dépôt est lui-même développé avec un harnais Antigravity généré par l'application : `AGENTS.md`, `START_HERE.md`, `.agents/` et [`docs/HARNESS_README.md`](./docs/HARNESS_README.md).

## Kit historique

L'ancien kit de règles et de BOOTSTRAP n'est plus dans ce dépôt : il vit dans [`sylvaner-ai/antigravity-kit`](https://github.com/sylvaner-ai/antigravity-kit) (branche `legacy-kit`).
