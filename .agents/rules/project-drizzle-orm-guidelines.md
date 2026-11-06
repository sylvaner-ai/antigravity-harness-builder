---
trigger: model_decision
description: À consulter lorsque la tâche concerne des fichiers **/db/**/*.{ts,js}, **/schema/**/*.{ts,js}, **/migrations/**/*.{ts,js}, src/db/** — Bonnes pratiques Drizzle ORM, transactions et migrations atomiques
---

# Bonnes Pratiques Drizzle ORM & Intégrité des Données

## 1. Définition et Typage Strict du Schéma
- Définir toutes les tables dans `src/db/schema.ts` avec les types stricts PostgreSQL/SQLite.
- Exporter les types d'inférence TypeScript (`$inferSelect`, `$inferInsert`) et validateurs Zod.
- Déclarer explicitement les clés étrangères avec suppression en cascade sécurisée (`onDelete: 'cascade'` ou `'restrict'`).

## 2. Transactions & Requêtes Préparées
- Encapsuler toute suite d'écritures dépendantes dans `await db.transaction(async (tx) => { ... })`.
- Utiliser l'API relationnelle typée `db.query.<table_name>.findMany(...)` pour prévenir les jointures N+1.
- Ne jamais exposer l'instance `db` directement au client (routes serveur et Server Components uniquement).

## 3. Gestion des Migrations
- Générer les migrations SQL via `drizzle-kit generate` et ne jamais altérer manuellement les fichiers appliqués.
- Exécuter les migrations de façon idempotente au démarrage ou via un script dédié.
