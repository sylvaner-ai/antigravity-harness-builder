/**
 * Générateur du script d'installation sûre du harnais (deploy.sh et commande « une ligne »).
 *
 * Garanties du script produit (vérifiées par tests/deploy-script.test.ts, qui l'exécute réellement) :
 * 1. N'écrit que les fichiers du paquet ; ne touche jamais un agent, une règle ou un skill qui n'en fait pas partie
 *    (aucune modification du frontmatter des fichiers de l'utilisateur, aucun déplacement de dossier).
 * 2. N'écrase jamais un fichier existant modifié ou non géré : sa version est déposée dans
 *    `.agents/.harness-proposed/` et le conflit est signalé.
 * 3. Met à jour un fichier uniquement s'il est resté identique à ce que le script avait installé
 *    (empreinte SHA-256 enregistrée dans `.agents/harness.lock`).
 * 4. Retire les fichiers disparus du paquet seulement s'ils sont intacts ; sinon les conserve et les signale.
 * 5. Sauvegarde ce qu'il remplace ou retire dans `.agents/.harness-backup/<horodatage>/` (5 dernières conservées).
 * 6. Vérifie après installation les empreintes et le frontmatter (`name`) des agents et skills installés.
 * 7. Refuse toute archive contenant un chemin absolu, un `..` ou autre chose que des fichiers réguliers.
 * 8. `--dry-run` affiche le plan sans rien écrire.
 *
 * Le corps du script évite volontairement les séquences `${` et les accents graves : il est inséré tel quel dans
 * un gabarit JavaScript. Il reste compatible avec bash 3.2 (macOS) : pas de tableau associatif ni de mapfile.
 */

export interface SafeInstallScriptParams {
  projectName: string;
  /** Archive .tar.gz encodée en Base64 (voir buildTarGzBase64). */
  base64Payload: string;
  /** Commande de non-régression déjà assainie ; réexaminée ici (liste blanche stricte de caractères). */
  smokeTestCommand?: string;
}

/** Échappe une chaîne pour l'insérer entre apostrophes dans un script shell. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sanitizeLabel(value: string): string {
  // Pas de saut de ligne ni de caractère de contrôle dans un libellé affiché.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) || 'projet';
}

const STRICT_SMOKE_TEST = /^[A-Za-z0-9 ._:/=@+,-]{1,200}$/;

const SCRIPT_BODY = String.raw`#!/usr/bin/env bash
# Installation sûre du harnais Antigravity — généré par Antigravity Harness Builder.
# N'écrit que les fichiers du paquet, n'écrase jamais un fichier modifié ou non géré,
# sauvegarde ce qu'il remplace dans .agents/.harness-backup/.  Usage : bash deploy.sh [--dry-run]
set -euo pipefail

PROJECT_LABEL=__PROJECT_LABEL__
SMOKE_TEST=__SMOKE_TEST__
DRY_RUN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "Usage : bash deploy.sh [--dry-run]"; exit 0 ;;
    *) echo "Option inconnue : $1 (utilisez --dry-run ou --help)" >&2; exit 2 ;;
  esac
  shift
done

die() { echo "❌ $*" >&2; exit 1; }

for tool in tar base64 awk find mktemp sort; do
  command -v "$tool" >/dev/null 2>&1 || die "Outil requis introuvable : $tool"
done
if command -v sha256sum >/dev/null 2>&1; then
  sha() { sha256sum "$1" | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  sha() { shasum -a 256 "$1" | awk '{print $1}'; }
else
  die "sha256sum ou shasum est requis."
fi

if [ "$PWD" = "/" ] || [ "$PWD" = "$HOME" ]; then
  die "Lancez ce script depuis la racine du projet (dossier courant : $PWD)."
fi
if [ -L ".agents" ] || [ -L "docs" ]; then
  die ".agents ou docs est un lien symbolique : installation refusée."
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir "$WORK/new"

if echo dGVzdA== | base64 -d >/dev/null 2>&1; then B64D="base64 -d"; else B64D="base64 -D"; fi
$B64D > "$WORK/harness.tar.gz" <<'HARNESS_PAYLOAD_EOF'
__PAYLOAD__
HARNESS_PAYLOAD_EOF

# --- 1. Contrôle de l'archive avant toute extraction -------------------------------------------
tar -tzf "$WORK/harness.tar.gz" > "$WORK/list.txt" 2>/dev/null || die "Archive illisible ou corrompue."
while IFS= read -r entry; do
  case "$entry" in
    ""|/*|../*|*/../*|*/..|..|*\\*) die "Chemin suspect dans l'archive : $entry" ;;
  esac
done < "$WORK/list.txt"
tar -xzf "$WORK/harness.tar.gz" -C "$WORK/new" 2>/dev/null || die "Extraction de l'archive impossible."
if [ -n "$(find "$WORK/new" ! -type f ! -type d -print | head -n 1)" ]; then
  die "L'archive contient autre chose que des fichiers réguliers."
fi

(cd "$WORK/new" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) > "$WORK/files_all.txt"
# README.md appartient au projet : le paquet ne l'installe jamais à la racine.
grep -vxF 'README.md' "$WORK/files_all.txt" > "$WORK/files.txt" || true
TOTAL="$(wc -l < "$WORK/files.txt" | tr -d ' ')"
[ "$TOTAL" -gt 0 ] || die "L'archive ne contient aucun fichier."

# --- 2. Plan : que faire de chaque fichier ? ----------------------------------------------------
LOCK=".agents/harness.lock"
locked_sha() {
  [ -f "$LOCK" ] || return 0
  awk -v p="$1" '/^#/ {next} { h=$1; sub(/^[^ ]+  /, ""); if ($0 == p) { print h; exit } }' "$LOCK"
}

: > "$WORK/plan.txt"
n_create=0; n_update=0; n_same=0; n_conflict=0; n_remove=0; n_keep=0
while IFS= read -r rel; do
  new_sha="$(sha "$WORK/new/$rel")"
  if [ -L "$rel" ] || [ -d "$rel" ]; then
    action=CONFLICT
  elif [ ! -e "$rel" ]; then
    action=CREATE
  else
    cur_sha="$(sha "$rel")"
    old_sha="$(locked_sha "$rel")"
    if [ "$cur_sha" = "$new_sha" ]; then
      action=SAME
    elif [ -n "$old_sha" ] && [ "$old_sha" = "$cur_sha" ]; then
      action=UPDATE
    else
      action=CONFLICT
    fi
  fi
  printf '%s\t%s\n' "$action" "$rel" >> "$WORK/plan.txt"
  case "$action" in
    CREATE) n_create=$((n_create + 1)) ;;
    UPDATE) n_update=$((n_update + 1)) ;;
    SAME) n_same=$((n_same + 1)) ;;
    CONFLICT) n_conflict=$((n_conflict + 1)) ;;
  esac
done < "$WORK/files.txt"

# Fichiers installés autrefois par ce script puis retirés du paquet.
if [ -f "$LOCK" ]; then
  awk '/^#/ {next} NF { sub(/^[^ ]+  /, ""); print }' "$LOCK" > "$WORK/locked_paths.txt"
  while IFS= read -r p; do
    case "$p" in ""|/*|../*|*/../*|*/..|..|*\\*) continue ;; esac
    case "$p" in .agents/*|docs/*|START_HERE.md) ;; *) continue ;; esac
    if grep -qxF -- "$p" "$WORK/files.txt"; then continue; fi
    if [ ! -e "$p" ]; then continue; fi
    if [ -f "$p" ] && [ ! -L "$p" ] && [ "$(sha "$p")" = "$(locked_sha "$p")" ]; then
      printf 'REMOVE\t%s\n' "$p" >> "$WORK/plan.txt"
      n_remove=$((n_remove + 1))
    else
      printf 'KEEP\t%s\n' "$p" >> "$WORK/plan.txt"
      n_keep=$((n_keep + 1))
    fi
  done < "$WORK/locked_paths.txt"
fi

list_action() { awk -F'\t' -v a="$1" '$1 == a { print "   - " $2 }' "$WORK/plan.txt"; }

echo "Harnais Antigravity — $PROJECT_LABEL"
echo "Plan : $TOTAL fichier(s) dans le paquet : $n_create à créer, $n_update à mettre à jour, $n_same déjà à jour, $n_conflict en conflit, $n_remove à retirer."
if [ "$n_update" -gt 0 ]; then echo "Mises à jour (fichiers non modifiés depuis la dernière installation) :"; list_action UPDATE; fi
if [ "$n_remove" -gt 0 ]; then echo "Retraits (fichiers disparus du paquet et non modifiés) :"; list_action REMOVE; fi
if [ "$n_conflict" -gt 0 ]; then
  echo "⚠ Conflits : ces fichiers existent déjà avec un contenu différent. Ils ne sont PAS modifiés ;"
  echo "  la version du paquet est déposée dans .agents/.harness-proposed/ pour comparaison."
  list_action CONFLICT
fi
if [ "$n_keep" -gt 0 ]; then echo "⚠ Retirés du paquet mais modifiés localement, donc conservés :"; list_action KEEP; fi

if [ "$DRY_RUN" = "1" ]; then
  echo "Simulation terminée : aucun fichier n'a été modifié."
  exit 0
fi

# --- 3. Application -----------------------------------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".agents/.harness-backup/$STAMP"
PROPOSED_DIR=".agents/.harness-proposed"

backup_file() {
  mkdir -p "$BACKUP_DIR/$(dirname "$1")"
  cp -p "$1" "$BACKUP_DIR/$1"
}

rm -rf "$PROPOSED_DIR"
TAB="$(printf '\t')"
while IFS="$TAB" read -r action rel; do
  case "$action" in
    CREATE) mkdir -p "$(dirname "$rel")"; cp "$WORK/new/$rel" "$rel" ;;
    UPDATE) backup_file "$rel"; cp "$WORK/new/$rel" "$rel" ;;
    REMOVE) backup_file "$rel"; rm -f "$rel" ;;
    CONFLICT) mkdir -p "$PROPOSED_DIR/$(dirname "$rel")"; cp "$WORK/new/$rel" "$PROPOSED_DIR/$rel" ;;
  esac
done < "$WORK/plan.txt"

if [ -d ".agents/.harness-backup" ]; then
  ls -1 ".agents/.harness-backup" | sort -r | awk 'NR > 5' | while IFS= read -r old; do
    if [ -n "$old" ]; then rm -rf ".agents/.harness-backup/$old"; fi
  done
fi

awk -F'\t' '$1 == "CREATE" || $1 == "UPDATE" || $1 == "SAME" { print $2 }' "$WORK/plan.txt" > "$WORK/installed.txt"
{
  echo "# Antigravity Harness Builder : fichiers installés par deploy.sh (empreintes SHA-256)."
  echo "# Ne pas modifier à la main : ce fichier permet de ne jamais écraser vos modifications."
  while IFS= read -r rel; do
    printf '%s  %s\n' "$(sha "$rel")" "$rel"
  done < "$WORK/installed.txt"
} > "$WORK/lock.new"
mkdir -p .agents
cp "$WORK/lock.new" "$LOCK"

# --- 4. Vérification après installation ---------------------------------------------------------
errors=0
warnings=0
fm_name() {
  awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 && /^name:/ { sub(/^name:[ ]*/, ""); gsub(/["\r]/, ""); print; exit }' "$1"
}
while IFS= read -r rel; do
  if [ "$(sha "$rel")" != "$(sha "$WORK/new/$rel")" ]; then
    echo "❌ Vérification échouée (contenu inattendu) : $rel" >&2
    errors=$((errors + 1))
    continue
  fi
  want=""
  case "$rel" in
    .agents/agents/*.md) want="$(basename "$rel" .md)" ;;
    .agents/skills/*/SKILL.md) want="$(basename "$(dirname "$rel")")" ;;
  esac
  if [ -n "$want" ]; then
    got="$(fm_name "$rel")"
    if [ "$got" != "$want" ]; then
      echo "⚠ Frontmatter à vérifier dans $rel : name attendu '$want', trouvé '$got' (Antigravity ignore silencieusement un fichier invalide)."
      warnings=$((warnings + 1))
    fi
  fi
done < "$WORK/installed.txt"

if [ -d ".agents/workflows" ]; then
  echo "ℹ Le dossier déprécié .agents/workflows/ existe : il n'a pas été modifié. Leur arrêt est annoncé au 19 octobre 2026 (certaines versions les exécutent encore) ; la commande /migrate-workflows les convertit en skills (.agents/skills/)."
fi
if [ "$((n_update + n_remove + n_conflict))" -gt 0 ] && command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git check-ignore -q .agents/.harness-backup/x 2>/dev/null; then
    echo "ℹ Pensez à ajouter à .gitignore : .agents/.harness-backup/ et .agents/.harness-proposed/"
  fi
fi

if [ -n "$SMOKE_TEST" ]; then
  echo "🧪 Test de non-régression : $SMOKE_TEST"
  set -f
  if ! $SMOKE_TEST < /dev/null; then
    echo "⚠ Le test de non-régression a échoué."
    errors=$((errors + 1))
  fi
  set +f
fi

if [ "$errors" -gt 0 ]; then
  die "Installation terminée avec $errors erreur(s)."
fi
echo "✅ Harnais installé : $n_create créé(s), $n_update mis à jour, $n_same inchangé(s), $n_conflict conflit(s) à arbitrer, $warnings avertissement(s)."
if [ "$n_update" -gt 0 ] || [ "$n_remove" -gt 0 ]; then echo "   Sauvegarde des fichiers remplacés : $BACKUP_DIR"; fi
`;

/** Retourne le script d'installation sûre, prêt à être servi ou inséré dans un bloc de code. */
export function renderSafeInstallScript(params: SafeInstallScriptParams): string {
  const label = shellSingleQuote(sanitizeLabel(params.projectName));
  const smoke =
    params.smokeTestCommand && STRICT_SMOKE_TEST.test(params.smokeTestCommand)
      ? params.smokeTestCommand
      : '';
  const payload = (params.base64Payload.match(/.{1,100}/g) ?? []).join('\n');

  return SCRIPT_BODY.replace('__PROJECT_LABEL__', () => label)
    .replace('__SMOKE_TEST__', () => shellSingleQuote(smoke))
    .replace('__PAYLOAD__', () => payload);
}
