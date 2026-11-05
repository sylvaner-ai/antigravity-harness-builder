import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildSelfTestPack } from '../selftest/pack';
import { modelDecisionDescriptionForGlob } from '../harness-builder/context-budget';
import { renderRuleIndex } from '../package-exporter/templates';
import type { SelectedRuleSpec } from '../package-exporter/schema';

/**
 * Scénarios du banc d'essai Antigravity (mode non interactif `agy -p`).
 *
 * Chaque scénario prépare une copie jetable du projet, envoie une invite et juge la réponse par des critères
 * mécaniques. Les critères de gouvernance (G1, G2) sont des heuristiques : ils repèrent des formulations typiques,
 * ils ne remplacent pas la lecture des réponses conservées dans `runs.jsonl`.
 */

export interface BenchRunContext {
  /** Dossier jetable dans lequel `agy` a travaillé. */
  dir: string;
  response: string;
  status: string;
  /** Fichiers créés ou modifiés pendant l'exécution (hors .git, .gemini, node_modules). */
  filesChanged: string[];
}

export interface Verdict {
  pass: boolean;
  detail: string;
  /** Erreur du service (indisponibilité, quota) : l'essai ne dit rien du harnais et n'entre pas dans les taux. */
  inconclusive?: boolean;
}

export interface BenchScenario {
  id: string;
  title: string;
  group: 'chargement' | 'gouvernance' | 'informatif';
  prompt: string;
  /** Exige que le harnais du projet soit présent (`.agents/` ou `AGENTS.md`). */
  requiresHarness: boolean;
  prepare(dir: string): void;
  evaluate(ctx: BenchRunContext): Verdict;
}

export const BENCH_PLANTED_FILE = 'BENCH-README.md';

/** Formulations qui trahissent un commentaire sur le modèle ou l'effort. */
const SETTING_COMMENT = /Model Selection|r[ée]glage (?:conseill|recommand|actif|actuel)|niveau d.effort|couple (?:mod[eè]le|conseill|pr[ée]conis)/i;
/** Formulations qui trahissent un arrêt en attente de l'utilisateur. */
const WAITS_FOR_USER = /dites-le-moi|confirmez|souhaitez(?:-vous)? conserver|pr[ée]f[ée]rez (?:garder|conserver)|attends votre|avant de poursuivre/i;

function write(dir: string, relativePath: string, content: string): void {
  const full = join(dir, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

function containsToken(response: string, token: string): Verdict {
  const pass = response.includes(token);
  return { pass, detail: pass ? `jeton ${token} présent` : `jeton ${token} absent` };
}

/** Section d'AGENTS.md produite par le générateur pour une règle chargée à la demande (option C). */
function onDemandSection(slug: string, trigger: 'model_decision' | 'glob', description: string, globs?: string): string {
  const rule = {
    slug,
    title: slug,
    frontmatter: { trigger, description, ...(globs ? { globs } : {}) },
    markdownBody: '',
    selectionRationale: 'bench',
    originStatus: 'project_custom',
  } as unknown as SelectedRuleSpec;
  return `\n\n## Règles du harnais (banc d'essai)\n\n${renderRuleIndex([rule])}\n`;
}

function appendToAgents(dir: string, section: string): void {
  const agentsPath = join(dir, 'AGENTS.md');
  const current = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '# Instructions\n';
  writeFileSync(agentsPath, current + section, 'utf8');
}

export function buildBenchScenarios(nonce: string): BenchScenario[] {
  const pack = buildSelfTestPack(nonce);
  const t = (prefix: string) => `${prefix}-${nonce}`;
  const installPack = (dir: string) => {
    for (const f of pack.files) write(dir, f.relativePath, f.content);
  };
  const noRead = "(n'ouvre aucun fichier pour répondre)";
  const appleToken = t('MD-OK');

  return [
    {
      id: 'C1-always-on',
      title: 'Règle toujours active chargée',
      group: 'chargement',
      prompt: `SELFTEST-A ${noRead}`,
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, t('ALWAYS-OK')),
    },
    {
      id: 'C2-glob',
      title: 'Règle liée à un fichier (glob) appliquée',
      group: 'chargement',
      prompt: 'Lis le fichier selftest-target.txt et résume-le en une phrase.',
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, t('GLOB-OK')),
    },
    {
      id: 'C2b-glob-pointeur',
      title: 'Règle glob appliquée (avec pointeur dans AGENTS.md, option C)',
      group: 'chargement',
      prompt: 'Lis le fichier selftest-target.txt et résume-le en une phrase.',
      requiresHarness: false,
      prepare: (dir) => {
        installPack(dir);
        appendToAgents(dir, onDemandSection('selftest-glob', 'glob', "Sonde d'auto-test, règle liée à un fichier", '**/selftest-target.txt'));
      },
      evaluate: (c) => containsToken(c.response, t('GLOB-OK')),
    },
    {
      id: 'C3-decision',
      title: 'Règle model_decision appliquée (sans pointeur dans AGENTS.md)',
      group: 'chargement',
      prompt: 'Parle-moi en une phrase de la pomme-bleue.',
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, appleToken),
    },
    {
      id: 'C2m-glob-en-decision',
      title: 'Règle de fichiers convertie en model_decision (description produite par le générateur)',
      group: 'chargement',
      prompt: 'Lis le fichier selftest-target.txt et résume-le en une phrase.',
      requiresHarness: false,
      prepare: (dir) => {
        installPack(dir);
        const glob = pack.files.find((f) => f.relativePath === '.agents/rules/selftest-glob.md')!;
        write(
          dir,
          glob.relativePath,
          glob.content
            .replace('trigger: glob', 'trigger: model_decision')
            .replace(/^description:.*$/m, `description: ${JSON.stringify(modelDecisionDescriptionForGlob('Règle de sonde liée à un fichier', '**/selftest-target.txt'))}`)
            .replace(/^globs:.*\n/m, '')
        );
      },
      evaluate: (c) => containsToken(c.response, t('GLOB-OK')),
    },
    {
      id: 'C3n-decision-sans-lecture',
      title: "Règle model_decision avec la consigne « n'ouvre aucun fichier » (ancienne sonde T3)",
      group: 'chargement',
      prompt: `Parle-moi en une phrase de la pomme-bleue ${noRead}.`,
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, appleToken),
    },
    {
      id: 'C3b-decision-pointeur',
      title: 'Règle model_decision appliquée (avec pointeur dans AGENTS.md, option C)',
      group: 'chargement',
      prompt: 'Parle-moi en une phrase de la pomme-bleue.',
      requiresHarness: false,
      prepare: (dir) => {
        installPack(dir);
        appendToAgents(dir, onDemandSection('selftest-decision', 'model_decision', "À consulter lorsque l'utilisateur parle de la « pomme-bleue »"));
      },
      evaluate: (c) => containsToken(c.response, appleToken),
    },
    {
      id: 'C4-skill',
      title: 'Skill découvert automatiquement',
      group: 'chargement',
      prompt: 'SELFTEST-SKILL',
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, t('SKILL-OK')),
    },
    {
      id: 'C4b-skill-slash',
      title: 'Skill appelé par /nom (invocation documentée)',
      group: 'chargement',
      prompt: '/selftest-skill',
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, t('SKILL-OK')),
    },
    {
      id: 'C5-subagent',
      title: 'Sous-agent de .agents/agents/ appelé',
      group: 'chargement',
      prompt: "Délègue à l'agent selftest-probe et recopie mot pour mot sa réponse. Ne lis pas son fichier.",
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => containsToken(c.response, t('AGENT-OK')),
    },
    {
      id: 'C6-model-flash',
      title: 'Sous-agent avec champ model: flash appelé (effet du champ non vérifiable ici)',
      group: 'chargement',
      prompt: "Délègue à l'agent selftest-flash et recopie mot pour mot sa réponse. Ne lis pas son fichier.",
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => {
        const v = containsToken(c.response, t('FLASH-OK'));
        return v.pass ? { pass: true, detail: `${v.detail} ; le nom de modèle annoncé par l'agent n'est pas une preuve` } : v;
      },
    },
    {
      id: 'W1-workflow',
      title: 'Workflow hérité encore exécuté (informatif)',
      group: 'informatif',
      prompt: '/selftest-wf',
      requiresHarness: false,
      prepare: installPack,
      evaluate: (c) => {
        const v = containsToken(c.response, t('WF-RAN'));
        return { pass: v.pass, detail: v.pass ? 'workflow exécuté' : 'workflow non exécuté' };
      },
    },
    {
      id: 'G1-tache-courte',
      title: 'Tâche courte : correction faite, aucun commentaire sur le modèle',
      group: 'gouvernance',
      prompt: `Corrige la faute de frappe éventuelle dans le titre du fichier ${BENCH_PLANTED_FILE}.`,
      requiresHarness: true,
      prepare: (dir) => write(dir, BENCH_PLANTED_FILE, '# Guide de dévelopement du projet\n\nContenu sans intérêt.\n'),
      evaluate: (c) => {
        const path = join(c.dir, BENCH_PLANTED_FILE);
        const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
        const fixed = /^# Guide de d[ée]veloppement du projet/m.test(text);
        const commented = SETTING_COMMENT.test(c.response);
        return {
          pass: fixed && !commented,
          detail: `faute corrigée : ${fixed ? 'oui' : 'non'} ; commentaire sur le modèle : ${commented ? 'oui' : 'non'}`,
        };
      },
    },
    {
      id: 'G2-tache-longue',
      title: "Tâche longue : plan livré sans attente ni modification de fichier",
      group: 'gouvernance',
      prompt:
        "Prépare un plan détaillé pour refondre l'authentification de ce projet sur plusieurs modules (ne modifie aucun fichier).",
      requiresHarness: true,
      prepare: () => undefined,
      evaluate: (c) => {
        const delivered = c.response.length >= 1_200;
        const waits = WAITS_FOR_USER.test(c.response);
        const modified = c.filesChanged.length > 0;
        const intro = SETTING_COMMENT.test(c.response.slice(0, 400));
        return {
          pass: delivered && !waits && !modified,
          detail: `plan livré (${c.response.length} car.) : ${delivered ? 'oui' : 'non'} ; attente de l'utilisateur : ${waits ? 'oui' : 'non'} ; fichiers modifiés : ${modified ? c.filesChanged.join(', ') : 'aucun'} ; mention du réglage en tête : ${intro ? 'oui' : 'non'}`,
        };
      },
    },
  ];
}
