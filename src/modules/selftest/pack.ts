/**
 * Pack d'auto-test pour Antigravity.
 *
 * Objectif : vérifier, sur la version d'Antigravity réellement utilisée, ce que le harnais généré suppose sans l'avoir
 * constaté : chargement des règles (toujours actives, par fichier, par décision du modèle), des skills, des sous-agents
 * dans `.agents/agents/`, effet du champ `model`, visibilité du modèle actif, commandes slash, workflows hérités.
 *
 * Principe : chaque sonde est un petit fichier contenant un jeton secret (`XXXX-OK-<nonce>`). Si la réponse de l'agent
 * contient le jeton, le fichier a bien été chargé. Le jeton n'est écrit que dans les fichiers de sonde, jamais dans le
 * guide remis à l'utilisateur côté projet.
 *
 * Limite assumée : un agent peut lire un fichier du dépôt au lieu de le « tenir en contexte ». Les invites demandent de
 * n'ouvrir aucun fichier et le guide dit de noter « ? » si la trajectoire montre une lecture.
 */

export interface SelfTestFile {
  relativePath: string;
  content: string;
}

export interface SelfTestProbe {
  id: string;
  title: string;
  /** Invite à copier telle quelle dans Antigravity. */
  prompt: string;
  /** Résultat attendu si le comportement supposé par le harnais est exact. */
  expected: string;
  /** Conséquence pour le générateur si le résultat attendu n'est pas observé. */
  ifFails: string;
  /** Ouvrir une nouvelle conversation avant l'invite (les règles sont lues au démarrage). */
  newConversation: boolean;
  optional?: boolean;
  /** Exige que le vrai harnais soit installé dans le projet. */
  requiresHarness?: boolean;
  warning?: string;
}

export interface SelfTestPack {
  nonce: string;
  files: SelfTestFile[];
  probes: SelfTestProbe[];
}

export const SELFTEST_NONCE_PATTERN = /^[A-Z0-9]{6}$/;

/** Chemins que le pack peut créer ou supprimer. Tout autre chemin est refusé par le script. */
export const SELFTEST_ALLOWED_PATH =
  /^(?:\.agents\/(?:rules|agents|workflows)\/selftest-[a-z0-9-]+\.md|\.agents\/skills\/selftest-[a-z0-9-]+\/SKILL\.md|selftest-target\.txt)$/;

export function buildSelfTestPack(nonce: string): SelfTestPack {
  if (!SELFTEST_NONCE_PATTERN.test(nonce)) {
    throw new Error('Le jeton d’auto-test doit comporter exactement 6 caractères parmi A-Z et 0-9.');
  }
  const t = (prefix: string) => `${prefix}-${nonce}`;

  const files: SelfTestFile[] = [
    {
      relativePath: '.agents/rules/selftest-always.md',
      content: `---
trigger: always_on
description: Sonde d'auto-test, règle toujours active
---

# Sonde d'auto-test (règle toujours active)

Si le message de l'utilisateur contient \`SELFTEST-A\`, répondez uniquement par le jeton \`${t('ALWAYS-OK')}\`. Dans tous les autres cas, ignorez cette règle.
`,
    },
    {
      relativePath: '.agents/rules/selftest-glob.md',
      content: `---
trigger: glob
description: Sonde d'auto-test, règle liée à un fichier
globs: "**/selftest-target.txt"
---

# Sonde d'auto-test (règle par fichier)

Lorsque vous lisez ou modifiez un fichier nommé \`selftest-target.txt\`, terminez votre réponse par le jeton \`${t('GLOB-OK')}\`.
`,
    },
    {
      relativePath: '.agents/rules/selftest-decision.md',
      content: `---
trigger: model_decision
description: À consulter lorsque l'utilisateur parle de la « pomme-bleue »
---

# Sonde d'auto-test (règle à la décision du modèle)

Lorsqu'on vous parle de la pomme-bleue, répondez par une phrase contenant le jeton \`${t('MD-OK')}\`.
`,
    },
    {
      relativePath: '.agents/skills/selftest-skill/SKILL.md',
      content: `---
name: selftest-skill
description: À utiliser lorsque l'utilisateur écrit SELFTEST-SKILL ou tape /selftest-skill (sonde d'auto-test).
---

# Sonde d'auto-test (skill)

Répondez uniquement par le jeton \`${t('SKILL-OK')}\`.
`,
    },
    {
      relativePath: '.agents/agents/selftest-probe.md',
      content: `---
name: selftest-probe
description: Sous-agent de contrôle. À solliciter uniquement pour l'auto-test, il renvoie son jeton.
tools:
  - view_file
---

# Sonde d'auto-test (sous-agent)

Répondez uniquement par le jeton \`${t('AGENT-OK')}\`. N'ouvrez aucun fichier.
`,
    },
    {
      // Seul fichier du pack (et de tout le générateur) portant un champ `model` : c'est précisément ce qui est testé.
      relativePath: '.agents/agents/selftest-flash.md',
      content: `---
name: selftest-flash
description: Sous-agent de contrôle du champ model. À solliciter uniquement pour l'auto-test.
tools:
  - view_file
model: flash
---

# Sonde d'auto-test (champ model)

Répondez par le jeton \`${t('FLASH-OK')}\`, puis indiquez en une phrase le nom du modèle qui vous exécute, ou « inconnu ». N'ouvrez aucun fichier.
`,
    },
    {
      relativePath: '.agents/workflows/selftest-wf.md',
      content: `---
description: Sonde d'auto-test, workflow hérité
---

# Sonde d'auto-test (workflow hérité)

Répondez uniquement par le jeton \`${t('WF-RAN')}\`.
`,
    },
    {
      relativePath: 'selftest-target.txt',
      content: `Fichier cible de l'auto-test Antigravity. Sans intérêt : il sert uniquement à déclencher la règle par fichier.\n`,
    },
  ];

  const noRead = '(n’ouvre aucun fichier pour répondre)';
  const probes: SelfTestProbe[] = [
    {
      id: 'T1',
      title: 'Règle toujours active (.agents/rules, trigger always_on)',
      prompt: `SELFTEST-A ${noRead}`,
      expected: `La réponse est le jeton ${t('ALWAYS-OK')}.`,
      ifFails:
        'Les règles de `.agents/rules/` ne sont pas chargées dans cette surface : toute la gouvernance du harnais (modèle/effort, sécurité, TDD) est sans effet. À traiter en priorité (autre dossier, ou contenu à placer dans AGENTS.md).',
      newConversation: true,
    },
    {
      id: 'T2',
      title: 'Règle liée à un fichier (trigger glob)',
      prompt: 'Lis le fichier selftest-target.txt et résume-le en une phrase.',
      expected: `La réponse se termine par le jeton ${t('GLOB-OK')}.`,
      ifFails:
        'Les règles `glob` ne se déclenchent pas : les règles par langage et par framework (la majorité du harnais) ne s’appliquent jamais. Il faudrait les passer en `model_decision` ou les regrouper dans des skills.',
      newConversation: false,
    },
    {
      id: 'T3',
      title: 'Règle à la décision du modèle (trigger model_decision)',
      prompt: 'Parle-moi en une phrase de la pomme-bleue.', // pas de consigne « n’ouvre aucun fichier » : le corps d’une règle model_decision se lit à la demande
      expected: `La réponse contient le jeton ${t('MD-OK')}.`,
      ifFails:
        'Les règles `model_decision` ne sont pas honorées : les règles rétrogradées au Lot 3 pour économiser le contexte ne seraient jamais lues. Il faudrait les remplacer par des skills.',
      newConversation: false,
    },
    {
      id: 'T4',
      title: 'Skill découvert automatiquement et appelable par /nom',
      prompt: 'SELFTEST-SKILL', // pas de consigne « n’ouvre aucun fichier » : un skill se charge en lisant son SKILL.md
      expected: `La réponse est le jeton ${t('SKILL-OK')}. Répéter avec la commande /selftest-skill : même résultat.`,
      ifFails:
        'Les skills de `.agents/skills/` ne sont pas découverts : les ~35 skills du harnais sont invisibles. Vérifier le dossier et le format attendus par cette version.',
      newConversation: false,
    },
    {
      id: 'T5',
      title: 'Sous-agent chargé depuis .agents/agents/',
      prompt:
        'Délègue à l’agent selftest-probe et recopie mot pour mot sa réponse. Ne lis pas son fichier.',
      expected: `La réponse contient le jeton ${t('AGENT-OK')}, produit par le sous-agent.`,
      ifFails:
        'Les sous-agents de `.agents/agents/` ne sont pas chargés par cette version : les sept sous-agents du harnais (revue, sécurité, base de données…) ne servent à rien. Il faudrait les exprimer en skills ou les déclarer autrement.',
      newConversation: false,
    },
    {
      id: 'T6',
      title: 'Champ model: flash dans un sous-agent',
      prompt:
        'Délègue à l’agent selftest-flash et recopie mot pour mot sa réponse. Ne lis pas son fichier. (Avant d’envoyer : sélectionnez un modèle Pro pour la conversation, pas Flash.)',
      expected: `La conversation principale étant sur un modèle Pro, la réponse contient ${t('FLASH-OK')} ET l’interface (trajectoire ou panneau du sous-agent) indique que le sous-agent a tourné sur un modèle Flash. Notez le nom exact du modèle affiché pour la conversation et pour le sous-agent.`,
      ifFails:
        'Si l’agent n’est pas chargé ou si le modèle affiché ne change pas, le champ `model` est ignoré ou refusé : la gouvernance du modèle doit rester une simple recommandation à l’utilisateur. Si le modèle Flash est bien utilisé, le champ peut être activé pour les rôles légers.',
      newConversation: false,
      optional: true,
      warning:
        'Sonde à risque : un champ non reconnu peut bloquer l’IDE. Si Antigravity ne répond plus, fermez-le puis lancez « selftest.sh remove ».',
    },
    {
      id: 'T7',
      title: 'Visibilité du modèle et de l’effort actifs',
      prompt:
        'Quel est le modèle et le niveau d’effort actifs de cette session ? Cite la source exacte dans ton contexte (nom de balise ou de réglage), ou réponds INCONNU. N’invente rien.',
      expected:
        'Soit une source précise, citée mot pour mot (nom de la balise ou du réglage), soit INCONNU. Les deux sont valides : recopiez la réponse intégrale, source comprise. Une réponse sans source citée est notée « ? ».',
      ifFails:
        'Si la réponse est INCONNU, l’agent ne peut pas comparer le réglage actif au couple conseillé : la règle modèle/effort doit se limiter à recommander (c’est déjà le comportement prévu pour un réglage inconnu). Si une source précise existe, la règle pourra la citer.',
      newConversation: true,
    },
    {
      id: 'T8',
      title: 'Commandes slash : /grill-me et /learn existent, /compact non',
      prompt: 'Tapez successivement /grill-me, /learn puis /compact. Pour /compact, ne l’annulez pas : notez ce qui se passe.',
      expected: '/grill-me et /learn sont reconnues. Pour /compact (absente de la documentation), notez si elle est reconnue et son effet observable en une phrase (résumé de la conversation ? libération du contexte ? aucun effet visible ?).',
      ifFails:
        'Si /compact existe dans votre version, la documentation officielle est en retard : on pourra la réintroduire. Si /grill-me ou /learn n’existent pas, les retirer des recommandations.',
      newConversation: false,
    },
    {
      id: 'T9',
      title: 'Workflow hérité (.agents/workflows)',
      prompt: '/selftest-wf',
      expected: `Informatif : la documentation annonce l’arrêt des workflows (19 octobre 2026), mais le jeton ${t('WF-RAN')} peut encore apparaître selon la version. Notez simplement si le jeton apparaît.`,
      ifFails:
        'Si le jeton apparaît, votre version exécute encore les workflows : notez le numéro de version ; le choix « skills uniquement » reste valable mais n’est pas obligatoire.',
      newConversation: false,
      optional: true,
    },
    {
      id: 'T10',
      title: 'Gouvernance modèle/effort : tâche courte (harnais installé)',
      prompt: 'Corrige la faute de frappe éventuelle dans le titre du fichier README.md.',
      expected: 'L’agent fait la correction sans aucun commentaire sur le modèle ou l’effort.',
      ifFails:
        'Si l’agent commente le modèle sur une tâche courte, la règle de proportionnalité n’est pas suivie : à durcir.',
      newConversation: true,
      requiresHarness: true,
    },
    {
      id: 'T11',
      title: 'Gouvernance modèle/effort : tâche longue (harnais installé)',
      prompt:
        'Prépare un plan détaillé pour refondre l’authentification de ce projet sur plusieurs modules (ne modifie aucun fichier).',
      expected:
        'Avant de commencer, une seule ligne propose un seul couple modèle/effort (par exemple « Pro, effort élevé »), puis l’agent poursuit sans attendre.',
      ifFails:
        'Si aucune ligne n’apparaît, la règle n’est pas lue ou pas suivie ; si plusieurs couples ou plusieurs questions apparaissent, la règle est mal appliquée. Dans les deux cas, noter le texte exact.',
      newConversation: true,
      requiresHarness: true,
    },
  ];

  return { nonce, files, probes };
}

export function randomNonce(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Guide à garder hors du projet : il contient les jetons attendus. */
export function renderSelfTestGuide(pack: SelfTestPack): string {
  const rows = pack.probes
    .map((p) => {
      const tags = [p.optional ? 'facultatif' : null, p.requiresHarness ? 'harnais installé' : null].filter(Boolean).join(', ');
      return `### ${p.id} — ${p.title}${tags ? ` (${tags})` : ''}

- **Conversation** : ${p.newConversation ? 'ouvrir une **nouvelle** conversation avant l’invite' : 'même conversation que le test précédent'}
- **Invite à copier** :

\`\`\`
${p.prompt}
\`\`\`

- **Attendu** : ${p.expected}
- **Si ce n’est pas le cas** : ${p.ifFails}${p.warning ? `\n- **Attention** : ${p.warning}` : ''}
`;
    })
    .join('\n');

  const grid = pack.probes.map((p) => `| ${p.id} | ${p.title} |  |  |  |`).join('\n');

  return `# Auto-test Antigravity — guide

Durée : environ 20 minutes (seconde manche possible : T6, T7 et T8 uniquement). Jeton de cette série : \`${pack.nonce}\`. **Ne placez pas ce guide dans le projet testé** : il contient les jetons attendus.

## 1. Installation

Dans le dossier du projet à tester (idéalement un projet jetable, sans le harnais pour T1 à T9) :

\`\`\`bash
bash selftest.sh install
\`\`\`

Le script ne crée que des fichiers dont le nom commence par \`selftest-\` (et \`selftest-target.txt\`). Il n'en modifie aucun autre. \`bash selftest.sh status\` liste ce qui est installé ; \`bash selftest.sh remove\` supprime exactement ces fichiers.

## 2. Règles de passation

1. Ouvrez le projet dans Antigravity, puis une **nouvelle conversation**.
2. Copiez chaque invite telle quelle, dans l'ordre. Les invites T1 et T5 demandent de ne lire aucun fichier ; T3 et T4 ne le demandent pas, car une règle à la décision du modèle et un skill se chargent en lisant leur fichier.
3. Regardez dans la trajectoire de l'agent s'il a ouvert un fichier \`selftest-*\` : si oui, notez **?** (le jeton peut venir du fichier lu, pas du chargement automatique).
4. Un échec isolé peut être un oubli de l'agent : refaites le test une fois avant de noter ❌.

## 3. Tests

${rows}
## 4. Grille de résultats

Recopiez-la et complétez-la (✅ attendu observé, ❌ non, ? incertain).

Renseignez d'abord : **version d'Antigravity** (menu À propos), **surface** (IDE, application ou CLI), **modèle et effort sélectionnés**.

La colonne « Fichier lu ? » est indispensable pour T1 à T6 : indiquez oui si la trajectoire de l'agent montre l'ouverture d'un fichier \`selftest-*\`, non sinon. Un jeton obtenu après lecture du fichier ne prouve pas le chargement automatique.

| Test | Sujet | Résultat | Fichier lu ? | Observation (texte exact si utile) |
| :--- | :--- | :--- | :--- | :--- |
${grid}

## 5. Nettoyage

\`\`\`bash
bash selftest.sh remove
\`\`\`

Renvoyez la grille remplie : elle décide de ce qui est conservé, corrigé ou retiré dans le générateur.
`;
}

/**
 * Script d'installation autonome (bash 3.2 compatible). Les fichiers sont embarqués en clair (documents ici),
 * sans exécution du contenu. Le script refuse tout chemin hors liste blanche, y compris dans son propre manifeste.
 */
export function renderSelfTestScript(pack: SelfTestPack): string {
  for (const f of pack.files) {
    if (!SELFTEST_ALLOWED_PATH.test(f.relativePath)) throw new Error(`Chemin d’auto-test non autorisé : ${f.relativePath}`);
  }
  const allowed = '^(\\.agents/(rules|agents|workflows)/selftest-[a-z0-9-]+\\.md|\\.agents/skills/selftest-[a-z0-9-]+/SKILL\\.md|selftest-target\\.txt)$';

  const writes = pack.files
    .map((f, i) => {
      const delim = `__SELFTEST_EOF_${i}__`;
      if (f.content.includes(delim)) throw new Error('Délimiteur en collision dans le contenu d’une sonde.');
      return `write_file ${shellQuote(f.relativePath)} <<'${delim}'\n${f.content.replace(/\n$/, '')}\n${delim}`;
    })
    .join('\n\n');

  return `#!/usr/bin/env bash
# Auto-test Antigravity — jeton ${pack.nonce}
# Usage : bash selftest.sh [install|remove|status] [dossier-du-projet]
# Ne crée, ne liste et ne supprime que des fichiers « selftest-* » (liste blanche vérifiée à chaque opération).
set -u

ACTION="\${1:-install}"
TARGET="\${2:-.}"
MANIFEST=".agents/.selftest-manifest"
ALLOWED='${allowed}'

if [ ! -d "$TARGET" ]; then
  echo "Dossier introuvable : $TARGET" >&2
  exit 1
fi
cd "$TARGET" || exit 1

is_allowed() { printf '%s\\n' "$1" | grep -Eq "$ALLOWED"; }

write_file() {
  rel="$1"
  if ! is_allowed "$rel"; then echo "Chemin refusé : $rel" >&2; exit 1; fi
  mkdir -p "$(dirname "$rel")"
  cat > "$rel"
  printf '%s\\n' "$rel" >> "$MANIFEST.new"
  echo "  + $rel"
}

do_install() {
  mkdir -p .agents
  : > "$MANIFEST.new"
  echo "Installation de la série ${pack.nonce} dans $(pwd)"
${writes}
  sort -u "$MANIFEST.new" > "$MANIFEST"
  rm -f "$MANIFEST.new"
  echo "Terminé. Ouvrez une nouvelle conversation dans Antigravity, puis suivez le guide."
}

do_status() {
  if [ ! -f "$MANIFEST" ]; then echo "Aucune sonde installée."; return 0; fi
  echo "Sondes installées :"
  while IFS= read -r rel; do
    if is_allowed "$rel" && [ -f "$rel" ]; then echo "  $rel"; fi
  done < "$MANIFEST"
}

do_remove() {
  if [ ! -f "$MANIFEST" ]; then echo "Rien à supprimer."; return 0; fi
  while IFS= read -r rel; do
    if is_allowed "$rel"; then
      if [ -f "$rel" ]; then rm -f "$rel"; echo "  - $rel"; fi
      d="$(dirname "$rel")"
      case "$d" in .agents/skills/selftest-*) rmdir "$d" 2>/dev/null || true ;; esac
    else
      echo "  ! entrée ignorée (chemin non autorisé) : $rel" >&2
    fi
  done < "$MANIFEST"
  rmdir .agents/workflows 2>/dev/null || true
  rm -f "$MANIFEST"
  rmdir .agents/rules .agents/agents .agents/skills .agents 2>/dev/null || true
  echo "Sondes supprimées."
}

case "$ACTION" in
  install) do_install ;;
  status)  do_status ;;
  remove)  do_remove ;;
  *) echo "Usage : bash selftest.sh [install|remove|status] [dossier]" >&2; exit 2 ;;
esac
`;
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
