/**
 * Commandes slash natives d'Antigravity que le harnais recommande à l'utilisateur.
 *
 * Source : documentation officielle https://antigravity.google/docs/slash-commands/ (consultée le 3 novembre 2026).
 * Seules les commandes dont l'usage est décrit par la documentation sont listées. `/compact` n'y figure pas ;
 * `/effort` et `/agents` y sont nommées sans description : elles ne sont donc pas recommandées.
 * Les anciens workflows (`.agents/workflows/`) ne sont plus exécutables depuis le 19 octobre 2026 : une
 * procédure réutilisable est un skill (`.agents/skills/<nom>/SKILL.md`), appelable par `/<nom>`.
 */
export interface SlashCommandGuide {
  command: string;
  /** Situation dans laquelle l'agent suggère la commande. */
  when: string;
  /** Effet documenté de la commande. */
  effect: string;
}

export const NATIVE_SLASH_COMMANDS: readonly SlashCommandGuide[] = [
  {
    command: '/plan',
    when: "Fonctionnalité complexe ou modification touchant plusieurs fichiers, avant d'écrire du code",
    effect: 'Explore le code, pose les questions nécessaires et produit un plan relisible',
  },
  {
    command: '/goal',
    when: 'Jalon complet à mener sans interruption une fois le plan validé',
    effect: "Poursuit l'objectif de façon autonome jusqu'à son accomplissement",
  },
  {
    command: '/teamwork',
    when: 'Chantier de grande ampleur (migration sur tout le dépôt, recherche) justifiant plusieurs agents',
    effect: "Réunit une équipe d'agents collaborant sur le chantier",
  },
  {
    command: '/boost',
    when: 'Bogue difficile, condition de concurrence ou algorithme ardu',
    effect: 'Raisonnement approfondi par plusieurs agents',
  },
  {
    command: '/grill-me',
    when: 'Besoin ou décision encore flou avant de commencer',
    effect: "Interroge l'utilisateur question par question, avec une réponse recommandée à chacune",
  },
  {
    command: '/learn',
    when: 'Correction ou convention réutilisable donnée par l’utilisateur en cours de session',
    effect: 'Transforme les corrections de la session en règles ou skills persistants',
  },
];

/** Consigne de suggestion, commune à AGENTS.md, à ORCHESTRATION.md et à la documentation. */
export const SLASH_COMMAND_SUGGESTION_POLICY =
  "Suggérez une commande uniquement quand elle change réellement la façon de travailler, une seule fois par sujet, en une phrase. Ne l'imposez pas.";

export function renderSlashCommandBullets(): string {
  return NATIVE_SLASH_COMMANDS.map((c) => `- **\`${c.command}\`** : ${c.when}. ${c.effect}.`).join('\n');
}

export function renderSlashCommandTable(): string {
  return [
    '| Commande | Contexte recommandé | Effet |',
    '| :--- | :--- | :--- |',
    ...NATIVE_SLASH_COMMANDS.map((c) => `| **\`${c.command}\`** | ${c.when} | ${c.effect} |`),
  ].join('\n');
}
