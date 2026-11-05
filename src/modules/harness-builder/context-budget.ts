import type { AntigravitySubagentTool } from '../antigravity-adapter/schema';
import type { SelectedRuleSpec } from '../package-exporter/schema';
import type { PresetMode } from '../selection-engine/schema';

/**
 * Contrôle du contexte permanent et de la délégation des sous-agents.
 *
 * - Les règles `always_on` sont relues à chaque requête : leur volume est plafonné par preset. Les règles
 *   en excès passent en `model_decision` (chargées quand la tâche les concerne), sans être supprimées.
 * - Les descriptions de sous-agents venues d'ECC contiennent des injonctions de délégation systématique
 *   (« MUST BE USED », « PROACTIVELY ») : elles sont neutralisées pour que la délégation reste proportionnée.
 * - Les agents de revue n'ont jamais d'outil d'écriture.
 */

/** Plafond (octets) des règles `always_on` hors AGENTS.md, par preset. */
export const ALWAYS_ON_BUDGET_BYTES: Readonly<Record<PresetMode, number>> = {
  MINIMAL: 6_000,
  BALANCED: 8_000,
  THOROUGH: 10_000,
};

export interface AlwaysOnBudgetResult {
  rules: SelectedRuleSpec[];
  demoted: Array<{ slug: string; bytes: number }>;
  alwaysOnBytesBefore: number;
  alwaysOnBytesAfter: number;
  budgetBytes: number;
}

function ruleBytes(rule: SelectedRuleSpec): number {
  return Buffer.byteLength(rule.markdownBody, 'utf8') + Buffer.byteLength(rule.frontmatter.description ?? '', 'utf8') + 40;
}

/** Une règle protégée n'est jamais rétrogradée : gouvernance du modèle et règles écrites pour le projet. */
function isProtected(rule: SelectedRuleSpec): boolean {
  return rule.slug === 'model-effort-governance' || rule.originStatus === 'project_custom';
}

/** Priorité de maintien en `always_on` (plus petit = gardé en premier). */
function keepRank(rule: SelectedRuleSpec): number {
  if (/security|secret/.test(rule.slug)) return 1;
  if (/testing|test/.test(rule.slug)) return 2;
  if (/git-workflow|review/.test(rule.slug)) return 3;
  return 4;
}

function topicOf(slug: string): string {
  return slug.replace(/^(?:common|web|typescript|python|react|nextjs)-/, '').replace(/-/g, ' ');
}

/**
 * Plafonne les règles `always_on`. Algorithme déterministe : les règles protégées sont conservées ; les autres
 * le sont par rang puis par taille croissante tant que le budget n'est pas dépassé ; le reste devient
 * `model_decision` avec une description permettant à l'agent de décider de les charger.
 */
export function enforceAlwaysOnBudget(
  rules: readonly SelectedRuleSpec[],
  presetMode: PresetMode = 'BALANCED',
  budgetOverrideBytes?: number
): AlwaysOnBudgetResult {
  const budgetBytes = budgetOverrideBytes ?? ALWAYS_ON_BUDGET_BYTES[presetMode];
  const alwaysOn = rules.filter((r) => r.frontmatter.trigger === 'always_on');
  const alwaysOnBytesBefore = alwaysOn.reduce((n, r) => n + ruleBytes(r), 0);

  let used = alwaysOn.filter(isProtected).reduce((n, r) => n + ruleBytes(r), 0);
  const candidates = alwaysOn
    .filter((r) => !isProtected(r))
    .sort((a, b) => keepRank(a) - keepRank(b) || ruleBytes(a) - ruleBytes(b) || a.slug.localeCompare(b.slug));

  const demotedSlugs = new Set<string>();
  for (const rule of candidates) {
    const bytes = ruleBytes(rule);
    if (used + bytes <= budgetBytes) used += bytes;
    else demotedSlugs.add(rule.slug);
  }

  const demoted: Array<{ slug: string; bytes: number }> = [];
  const result = rules.map((rule) => {
    if (!demotedSlugs.has(rule.slug)) return rule;
    demoted.push({ slug: rule.slug, bytes: ruleBytes(rule) });
    return {
      ...rule,
      frontmatter: {
        ...rule.frontmatter,
        trigger: 'model_decision' as const,
        description: `À consulter lorsque la tâche concerne : ${topicOf(rule.slug)}.`,
      },
      selectionRationale: `${rule.selectionRationale} (chargée à la demande : budget de contexte permanent de ${budgetBytes} octets)`,
    };
  });

  return {
    rules: result,
    demoted,
    alwaysOnBytesBefore,
    alwaysOnBytesAfter: used,
    budgetBytes,
  };
}

/**
 * Neutralise les injonctions de délégation systématique d'une description de sous-agent.
 * La description reste exploitable par le planificateur (elle dit quand utiliser l'agent) sans l'inciter
 * à déléguer chaque modification.
 */
export function normalizeDelegationDescription(description: string): string {
  let d = description;
  d = d.replace(/\bMUST BE USED for all [^.]*\.?/gi, '');
  d = d.replace(/\bMUST BE USED\s+(when|for|after|before|on)\b/gi, 'Use $1');
  d = d.replace(/\bMUST BE USED\b[^.]*\.?/gi, '');
  d = d.replace(/\bUse (?:it )?PROACTIVELY\b/gi, 'Use');
  d = d.replace(/\bUse immediately after writing or modifying code\b/gi, 'Use after a substantial change (several files or sensitive logic)');
  d = d.replace(/\bUse immediately after\b/gi, 'Use after');
  d = d.replace(/\bProactively\s+(\w)/gi, (_m, c: string) => c.toUpperCase());
  d = d.replace(/\bPROACTIVELY\b/gi, '');
  return d.replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
}

const MUTATION_TOOLS: ReadonlySet<string> = new Set(['write_to_file', 'replace_file_content']);

export function isReviewerSlug(slug: string): boolean {
  return /(?:^|-)(?:reviewer|review|auditor|audit)(?:$|-)/.test(slug);
}

/** Retire les outils d'écriture d'un agent de revue ou d'audit. */
export function restrictReviewerTools(tools: readonly AntigravitySubagentTool[]): AntigravitySubagentTool[] {
  return tools.filter((t) => !MUTATION_TOOLS.has(t));
}

/** Longueurs maximales (caractères) des éléments de la description d'une règle de fichiers convertie. */
const GLOB_DESCRIPTION_MAX = { globs: 100, original: 140 } as const;

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/**
 * Description `model_decision` d'une règle initialement liée à des fichiers : les motifs en tête, puis le sujet
 * d'origine. Les motifs ne sont plus un déclencheur automatique, ils servent à l'agent pour décider s'il doit lire la règle.
 */
export function modelDecisionDescriptionForGlob(originalDescription: string, globs: string): string {
  const subject = originalDescription.trim().replace(/\.$/, '');
  const patterns = clip(globs.trim().replace(/\s+/g, ' '), GLOB_DESCRIPTION_MAX.globs);
  return `À consulter lorsque la tâche concerne des fichiers ${patterns}${subject ? ` — ${clip(subject, GLOB_DESCRIPTION_MAX.original)}` : ''}`;
}

/**
 * Convertit les règles `glob` en `model_decision`. Le déclenchement par fichier s'est révélé peu fiable à l'auto-test
 * (0 essai réussi sur 6 pour une règle `glob`, 6 sur 6 pour la même règle en `model_decision`, même modèle et même
 * lot : docs/AUTO_TEST_RESULTATS.md). La conversion s'applique aussi aux règles écrites pour le projet.
 */
export function convertGlobRulesToModelDecision(rules: readonly SelectedRuleSpec[]): SelectedRuleSpec[] {
  return rules.map((rule) => {
    if (rule.frontmatter.trigger !== 'glob') return rule;
    const globs = (rule.frontmatter.globs ?? rule.frontmatter.glob ?? '').trim();
    const { globs: _globs, glob: _glob, ...rest } = rule.frontmatter;
    return {
      ...rule,
      frontmatter: {
        ...rest,
        trigger: 'model_decision' as const,
        description: modelDecisionDescriptionForGlob(rule.frontmatter.description ?? '', globs),
      },
      selectionRationale: `${rule.selectionRationale} Convertie de « glob » en « model_decision » : le déclenchement par fichier n'est pas fiable (voir docs/AUTO_TEST_RESULTATS.md).`,
    };
  });
}

