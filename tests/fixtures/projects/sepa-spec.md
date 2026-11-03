# PROJECT.md (exemple prérempli, à valider et à compléter avant usage)

> Point de départ pour une application de gestion avec signature électronique, prélèvements/virements SEPA et export comptable FEC.
> Les éléments marqués « à définir » ou « à confirmer » n'ont pas été décidés : ne rien supposer à leur place.
> Les adresses, noms d'hôte et secrets du serveur ne figurent pas ici : les renseigner dans le `PROJECT.md` du projet, jamais dans le kit.

## Objectif
À définir (nom de l'application, métier, utilisateurs, volumétrie).

## Utilisateurs et données sensibles
- Rôles et authentification : **à définir** (fournisseur d'authentification, rôles, séparation des clients/organisations).
- Données sensibles : coordonnées bancaires (IBAN/BIC), documents signés, écritures comptables, données personnelles (RGPD).
- Contraintes réglementaires à faire valider par un professionnel : niveau de signature électronique (simple, avancée, qualifiée),
  format et conservation du FEC, mandats SEPA. Journal d'audit en ajout seul pour toute opération financière ou de signature.

## Pile technique
- Framework : Next.js (App Router), React Server Components par défaut, Server Actions, TypeScript strict, Zod.
- Données : PostgreSQL, Prisma ORM, migrations SQL versionnées.
- Stockage : Cloudflare R2 (API S3), accès par URLs présignées, bucket privé.
- PDF : pdf-lib pour l'assemblage et le remplissage (maintenance à vérifier ; alternative de génération à partir de HTML à évaluer pour les factures).
- Signature : Documenso auto-hébergé (licence AGPL-3.0 ; certificat de signature à générer ; trafic sortant du conteneur à restreindre).
- Banque : génération de fichiers SEPA ISO 20022 (pain.001 / pain.008), validés contre les schémas XSD de la banque.
- Comptabilité : export FEC et CSV, à valider avec l'expert-comptable et l'outil de contrôle de l'administration fiscale.
- Tâches longues (SEPA, FEC, PDF volumineux) : file de tâches adossée à PostgreSQL (bibliothèque à choisir).
- Interface / design : Tailwind CSS ; design system « Stripi » défini dans `DESIGN.md` (tokens Ink/Primary, chiffres tabulaires `tabular-nums`).

## Versions
| Composant | Version cible | Statut |
|---|---|---|
| Node.js | dernière LTS | à confirmer |
| Next.js | 16.x | cible recommandée (la 14 n'est plus supportée) |
| React | 19.x | associé à Next.js 16 |
| TypeScript | 5.9.x | à confirmer |
| Zod | 4.x | à confirmer |
| Tailwind CSS | 3.4.x | à confirmer (le script `design-sync` fourni suppose la v3) |
| Prisma (`prisma`, `@prisma/client`) | ^7 | version exacte à figer à l'installation ; ne pas prendre la 8 en préversion |
| PostgreSQL | 17 ou 18 | à confirmer selon les images disponibles dans Coolify |
| Documenso | à confirmer | version exacte à figer |

## Hébergement et environnements
- Développement : à définir (local avec Docker, ou VPS).
- Production : serveur Coolify. Application et PostgreSQL sur le réseau Docker interne ; la base n'est pas publiée sur Internet.
- À renseigner dans le projet (pas dans le kit) : adresse du panneau Coolify, nom d'hôte interne de la base, variables à définir dans Coolify.
- Panneau d'administration : HTTPS et accès restreint (pare-feu ou VPN).
- Démarrage du conteneur : `docker-entrypoint.sh` (attente de PostgreSQL, `prisma migrate deploy`, arrêt immédiat en cas d'échec).
- Sauvegardes PostgreSQL planifiées vers R2, avec test de restauration.

## Structure du code
`src/app` (routes, actions), `src/components/ui`, `src/lib/services` (logique métier), `src/lib/validators` (schémas Zod),
`src/lib/integrations/{storage,signature,sepa,fec,pdf}` (une couche par service externe), `src/db` (client), `prisma/` (schéma, migrations),
`src/env.ts` (variables validées).

## Commandes
| Action | Commande |
|---|---|
| Installer | `pnpm install` |
| Démarrer (développement) | `pnpm dev` |
| Typage | `pnpm typecheck` |
| Tests | `pnpm test:run` |
| Vérification complète | `pnpm verify` |
| Build | `pnpm build` |
| Migrations (développement) | `pnpm db:migrate:dev` |
| Migrations (déploiement) | `pnpm db:migrate:deploy` |
| Client Prisma | `pnpm db:generate` |
| Infra locale | `docker compose up -d db` |

## Design
Source : `DESIGN.md`. Tokens exposés en variables CSS dans `src/app/globals.css` (entre les marqueurs de `design-sync`) et mappés dans `tailwind.config.ts`.
Montants : police à chiffres tabulaires, alignés à droite.

## Modules du kit installés
À renseigner à l'installation : `core`, `stacks/nextjs`, `db/prisma-postgres`, `envs/local-docker` (si développement local), `envs/coolify`.

## Décisions
- Montants stockés en entiers (centimes) ou en `Decimal`, jamais en nombre flottant (proposition, à valider).
- Une couche d'intégration par service externe, derrière une interface testable avec un double (proposition, à valider).
- Authentification : à décider avant la première fonctionnalité.

## Points non vérifiés
- Construction de l'image Docker et déploiement sur Coolify.
- Disponibilité de PostgreSQL 17/18 dans Coolify.
- Niveau juridique de la signature, conformité FEC et SEPA (validation par des professionnels).
