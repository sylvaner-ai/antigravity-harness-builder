# Guide d'Exploitation, Sauvegarde & Restauration — Antigravity Harness Builder

> **Application** : Antigravity Harness Builder  
> **Environnement cible** : VPS Ubuntu Linux, Docker, Coolify  
> **Base de données** : PostgreSQL 17  
> **Stockage persistant** : Volume privé `/data/storage`  
> **Dernière mise à jour** : 2026-10-29

---

## 1. Architecture Déployée & Services

L'application est architecturée sous forme de **monolithe modulaire** Next.js 15 (standalone) s'appuyant sur :

1. **`app` (Conteneur Web)** : Next.js 15, Node.js 22 Alpine, utilisateur non-root `nextjs` (UID 1001).
   - Port interne : `3000`
   - Volume monté : `ahb_storage` vers `/data/storage` (stockage privé des documents et packages ZIP)
   - Healthcheck : `GET /api/health`
2. **`postgres` (Conteneur Base de Données)** : PostgreSQL 17 Alpine.
   - Volume monté : `ahb_postgres_data` vers `/var/lib/postgresql/data`
   - Job Queue native via `FOR UPDATE SKIP LOCKED` (zéro dépendance Redis requise)

---

## 2. Variables d'Environnement

| Variable | Obligatoire | Valeur par défaut / Exemple | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Oui | `production` | Active les optimisations de production Next.js |
| `DATABASE_URL` | Oui | `postgresql://ahb_user:secret@postgres:5432/ahb_db` | Chaîne de connexion PostgreSQL |
| `PRIVATE_STORAGE_DIR` | Oui | `/data/storage` | Répertoire disque privé (hors `public/`) |
| `NEXT_TELEMETRY_DISABLED` | Non | `1` | Désactive la télémétrie Next.js |
| `GEMINI_API_KEY` | Recommandé | `AIzaSy...` | Clé API Google Gemini pour l'extraction de profil IA |
| `GITHUB_TOKEN` | Optionnel | `ghp_...` | Jeton GitHub pour augmenter les quotas de synchronisation ECC |

> [!CAUTION]
> Aucun secret (`DATABASE_URL`, `GEMINI_API_KEY`, `GITHUB_TOKEN`) ne doit être injecté au moment du build Docker (`ARG`). Tous les secrets doivent être fournis exclusivement au runtime (`ENV`).

---

## 3. Déploiement sur Coolify

### Étape 1 : Création du Service dans Coolify
1. Dans l'interface Coolify, créez une nouvelle ressource de type **Docker Compose** ou **Application**.
2. Liez le dépôt Git du projet (`AntigravityHarnessBuilder`).
3. Sélectionnez la branche de production (`main`).

### Étape 2 : Configuration des Volumes Persistants
Dans Coolify, déclarez impérativement les deux volumes persistants :
- `ahb_postgres_data` : `/var/lib/postgresql/data`
- `ahb_storage` : `/data/storage`

### Étape 3 : Configuration du Healthcheck
- URL de sonde : `/api/health`
- Intervalle : `10s`
- Code HTTP attendu : `200`

---

## 4. Procédure de Sauvegarde (Backup)

La sauvegarde doit être programmée quotidiennement (cron) et couvrir conjointement la base de données relationnelle et le volume de stockage des documents.

### Script de Sauvegarde Automatisé (`scripts/backup.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/ahb"
DATE=$(date +%Y%m%d_%H%M%S)
TARGET_DIR="${BACKUP_DIR}/${DATE}"

mkdir -p "${TARGET_DIR}"

echo "[1/3] Sauvegarde de la base de données PostgreSQL..."
docker exec ahb-postgres pg_dump -U ahb_user -d ahb_db -F c -b -v -f /tmp/ahb_db.dump
docker cp ahb-postgres:/tmp/ahb_db.dump "${TARGET_DIR}/ahb_db_${DATE}.dump"
docker exec ahb-postgres rm /tmp/ahb_db.dump

echo "[2/3] Sauvegarde des documents privés et packages ZIP (/data/storage)..."
docker run --rm -v ahb_storage:/data/storage -v "${TARGET_DIR}:/backup" alpine \
  tar czf "/backup/ahb_storage_${DATE}.tar.gz" -C /data/storage .

echo "[3/3] Calcul des empreintes SHA-256 d'intégrité..."
sha256sum "${TARGET_DIR}"/* > "${TARGET_DIR}/SHA256SUMS"

echo "Sauvegarde terminée avec succès dans : ${TARGET_DIR}"
```

---

## 5. Procédure de Restauration (Disaster Recovery)

En cas de perte de données ou de réinstallation sur un nouveau serveur :

### 1. Restauration de la Base de Données
```bash
# Arrêt du service applicatif pour éviter les écritures concurrentes
docker compose stop app

# Restauration du dump PostgreSQL
docker cp /chemin/vers/ahb_db_YYYYMMDD.dump ahb-postgres:/tmp/restore.dump
docker exec ahb-postgres pg_restore -U ahb_user -d ahb_db --clean --if-exists /tmp/restore.dump
docker exec ahb-postgres rm /tmp/restore.dump
```

### 2. Restauration du Volume `/data/storage`
```bash
# Extraction des documents dans le volume Docker
docker run --rm -v ahb_storage:/data/storage -v /chemin/vers:/backup alpine \
  sh -c "rm -rf /data/storage/* && tar xzf /backup/ahb_storage_YYYYMMDD.tar.gz -C /data/storage"
```

### 3. Redémarrage et Contrôle d'Intégrité
```bash
# Redémarrage de l'application
docker compose start app

# Vérification du statut de santé
curl -f http://127.0.0.1:3000/api/health
```

---

## 6. Procédure de Rollback

Si un nouveau déploiement présente une anomalie bloquante :

1. **Rollback d'image Docker** :
   Dans Coolify, sélectionnez le commit précédent et cliquez sur **Redeploy**.
2. **Rollback de schéma DB (si migration exécutée)** :
   Si une migration Drizzle non rétrocompatible a été appliquée, appliquez le dump de la base réalisé immédiatement avant le déploiement.
3. **Vérification** :
   Validez que `/api/health` renvoie HTTP 200 et que le catalogue ECC est opérationnel.
`;


## Administration des comptes

Les inscriptions publiques sont fermées (`ALLOW_REGISTRATION` doit valoir exactement `true` pour les ouvrir). Les comptes se gèrent en ligne de commande, avec saisie masquée du mot de passe (12 caractères minimum, jamais passé en argument) :

```bash
# Créer un compte (rôle USER par défaut)
docker exec -it <conteneur-application> node dist/create-user.cjs prenom@exemple.fr --role ADMIN

# Réinitialiser un mot de passe (toutes les sessions du compte sont révoquées)
docker exec -it <conteneur-application> node dist/create-user.cjs prenom@exemple.fr --reset
```

En développement : `npm run admin:user -- prenom@exemple.fr [--role ADMIN] [--reset]`.

Les connexions sont limitées : 5 échecs consécutifs bloquent une adresse e-mail et 20 échecs une adresse IP pendant 15 minutes (mémoire de l'instance, remise à zéro au redémarrage).
