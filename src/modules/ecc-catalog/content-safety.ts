/**
 * Contrôles de contenu appliqués à chaque composant tiers avant qu'il puisse entrer dans un harnais.
 *
 * 1. Spécificité Claude Code : un composant qui décrit surtout les mécanismes de Claude Code (hooks PreToolUse,
 *    CLAUDE.md, ~/.claude, commandes /ecc:…) n'a pas d'équivalent fiable dans Antigravity.
 * 2. Sûreté : on bloque uniquement des signaux exécutables (caractères invisibles, commentaires cachés adressés à
 *    l'agent, exfiltration de secrets). Les textes qui *citent* une attaque pour s'en défendre
 *    (« ignore previous instructions », « `curl ... | sh` ») ne sont pas bloqués : la mesure sur le catalogue réel
 *    montre que ce sont tous des avertissements défensifs.
 */

const CLAUDE_SPECIFIC_PATTERNS: ReadonlyArray<RegExp> = [
  /\bCLAUDE\.md\b/g,
  /\b(?:PreToolUse|PostToolUse|SessionStart|UserPromptSubmit|SubagentStop)\b/g,
  /\/ecc:[a-z-]+|\becc:[a-z-]+/g,
  /\bClaude Code\b/gi,
  /\b(?:TodoWrite|Task tool|Skill tool|subagent_type)\b/g,
  /~?\/?\.claude\/(?:settings|agents|skills|commands|hooks|projects|plugins)\b/g,
  /\bsettings\.json\b/g,
];

/** Composants dont l'objet est l'outillage d'ECC ou de Claude Code lui-même (constat sur le commit figé). */
const META_TOOLING_SLUGS = new Set([
  'configure-ecc', 'ecc-guide', 'ecc-recipes', 'ecc-tools-cost-audit', 'skill-create', 'skill-health',
  'skill-stocktake', 'skill-comply', 'skill-scout', 'skill-host-compat', 'hookify', 'hookify-rules',
  'hookify-configure', 'hookify-help', 'hookify-list', 'gateguard', 'continuous-learning', 'continuous-learning-v2',
  'strategic-compact', 'codebase-onboarding', 'prompt-optimizer', 'config-gc', 'workspace-surface-audit',
  'rules-distill', 'deepseek-harness-setup', 'claude-devfleet', 'plankton-code-quality', 'dmux-workflows',
  'agent-sort', 'harness-optimizer', 'harness-audit', 'instinct-export', 'instinct-import', 'instinct-status',
  'evolve', 'promote', 'prune', 'learn', 'learn-eval', 'model-route', 'cost-report', 'auto-update',
  'save-session', 'resume-session', 'sessions', 'checkpoint', 'aside', 'loop-start', 'loop-status',
  'common-hooks', 'common-agents',
  // Méthodologies : outillage interne à l'éditeur, sans valeur dans un projet
  'writing-skills', 'diagnosing-superpowers', 'ponytail-gain', 'ponytail-help',
]);

export const CLAUDE_SPECIFIC_THRESHOLD = 6;

export function countClaudeSpecificReferences(text: string): number {
  let total = 0;
  for (const re of CLAUDE_SPECIFIC_PATTERNS) {
    total += (text.match(re) || []).length;
  }
  return total;
}

export interface PlatformFitVerdict {
  excluded: boolean;
  code?: 'META_TOOLING' | 'CLAUDE_SPECIFIC';
  reason?: string;
  claudeReferences: number;
}

export function assessPlatformFit(slug: string, rawContentOrCount: string | number): PlatformFitVerdict {
  const claudeReferences =
    typeof rawContentOrCount === 'number' ? rawContentOrCount : countClaudeSpecificReferences(rawContentOrCount);
  // Règles `<langage>-hooks` d'ECC : configuration des hooks Claude Code par langage
  if (META_TOOLING_SLUGS.has(slug) || /^[a-z0-9-]+-hooks$/.test(slug)) {
    return {
      excluded: true,
      code: 'META_TOOLING',
      reason: `« ${slug} » décrit l'outillage de Claude Code ou de la bibliothèque source, sans équivalent dans Antigravity.`,
      claudeReferences,
    };
  }
  if (claudeReferences >= CLAUDE_SPECIFIC_THRESHOLD) {
    return {
      excluded: true,
      code: 'CLAUDE_SPECIFIC',
      reason: `« ${slug} » repose sur des mécanismes propres à Claude Code (${claudeReferences} références : hooks, CLAUDE.md, ~/.claude, /ecc:…).`,
      claudeReferences,
    };
  }
  return { excluded: false, claudeReferences };
}

// --- Sûreté du contenu ---

/** Contrôle bidirectionnel et caractères « tags » Unicode : servent à dissimuler du texte, toujours bloquants. */
const HIDING_CHARS = /[\u202A-\u202E\u2066-\u2069]|[\u{E0000}-\u{E007F}]/u;
/** Caractères de largeur nulle (hors U+200D des émojis composés) : un usage isolé est courant (échapper un bloc de code). */
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200E\u200F\u2060-\u2064\uFEFF]/gu;
export const ZERO_WIDTH_BLOCK_THRESHOLD = 10;
/** Commentaire HTML caché qui s'adresse à l'agent. */
const HIDDEN_AGENT_COMMENT =
  /<!--(?:(?!-->)[\s\S]){0,400}?\b(?:ignore|disregard|you must|do not tell|exfiltrate|run the following|execute)\b(?:(?!-->)[\s\S]){0,400}?-->/i;
/** Envoi de secrets vers une URL. */
const SECRET_EXFILTRATION = [
  /\b(?:curl|wget|fetch|Invoke-WebRequest)\b[^\n]*(?:\$\{?[A-Z_]*(?:TOKEN|SECRET|API_KEY|PASSWORD)\b|\.env\b|~\/\.ssh|id_rsa|\.aws\/credentials)[^\n]*https?:\/\//i,
  /\b(?:curl|wget)\b[^\n]*https?:\/\/[^\n]*(?:-d|--data|--data-binary|-F)\s*@?(?:\.env\b|~\/\.ssh|id_rsa|\.aws\/credentials)/i,
];
/** Téléchargement exécuté directement (URL réelle redirigée vers un shell) : signalé, non bloquant. */
const PIPE_TO_SHELL = /\b(?:curl|wget)\b[^\n`]*https?:\/\/[^\s`'")]+[^\n`]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/i;

export interface ContentSafetyVerdict {
  blocked: boolean;
  reasons: string[];
  warnings: string[];
}

export function scanContentSafety(texts: ReadonlyArray<{ path: string; content: string }>): ContentSafetyVerdict {
  const reasons: string[] = [];
  const warnings: string[] = [];
  for (const { path, content } of texts) {
    if (HIDING_CHARS.test(content)) {
      reasons.push(`${path} : caractères de contrôle bidirectionnel ou « tags » Unicode (texte dissimulé possible).`);
    }
    const zeroWidth = (content.match(ZERO_WIDTH_CHARS) || []).length;
    if (zeroWidth >= ZERO_WIDTH_BLOCK_THRESHOLD) {
      reasons.push(`${path} : ${zeroWidth} caractères de largeur nulle (instructions dissimulées possibles).`);
    } else if (zeroWidth > 0) {
      warnings.push(`${path} : ${zeroWidth} caractère(s) de largeur nulle (usage typographique probable).`);
    }
    if (HIDDEN_AGENT_COMMENT.test(content)) {
      reasons.push(`${path} : commentaire HTML caché contenant des instructions adressées à l'agent.`);
    }
    if (SECRET_EXFILTRATION.some((re) => re.test(content))) {
      reasons.push(`${path} : commande envoyant des secrets (.env, clés, jetons) vers une URL.`);
    }
    if (PIPE_TO_SHELL.test(content)) {
      warnings.push(`${path} : télécharge et exécute un script distant (curl … | sh) ; l'agent doit demander l'accord avant.`);
    }
  }
  return { blocked: reasons.length > 0, reasons, warnings };
}
