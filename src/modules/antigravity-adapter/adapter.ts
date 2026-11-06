import yaml from 'js-yaml';
import {
  ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS,
  AntigravityRuleFrontmatter,
  AntigravityRuleFrontmatterSchema,
  AntigravitySkillFrontmatter,
  AntigravitySkillFrontmatterSchema,
  AntigravitySubagentFrontmatter,
  AntigravitySubagentFrontmatterSchema,
  AntigravitySubagentTool,
  CLAUDE_TO_ANTIGRAVITY_MODEL_MAP,
  CLAUDE_TO_ANTIGRAVITY_TOOL_MAP,
  ReasoningEffortTier,
  RecommendedModelTier,
  SubagentModelTier,
} from './schema';

const ALLOWED_TOOLS_SET = new Set<string>(ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS);

/**
 * Résultat de la traduction d'une liste d'outils vers Antigravity.
 */
export interface ToolTranslationResult {
  tools: AntigravitySubagentTool[];
  translatedTools: Array<{ from: string; to: AntigravitySubagentTool }>;
  removedTools: Array<{ tool: string; reason: string }>;
}

/**
 * Traduit de manière déterministe une liste d'outils (Claude Code / ECC ou Antigravity)
 * vers la liste blanche stricte des outils de sous-agents Google Antigravity.
 * Aucun outil non reconnu n'est jamais conservé (§4.4 CDC).
 */
export function translateToolsToAntigravity(
  rawTools: readonly string[] | string | undefined
): ToolTranslationResult {
  if (!rawTools) {
    return { tools: [], translatedTools: [], removedTools: [] };
  }

  const inputList = Array.isArray(rawTools)
    ? rawTools
    : String(rawTools)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const tools: AntigravitySubagentTool[] = [];
  const seen = new Set<AntigravitySubagentTool>();
  const translatedTools: Array<{ from: string; to: AntigravitySubagentTool }> = [];
  const removedTools: Array<{ tool: string; reason: string }> = [];

  for (const rawTool of inputList) {
    const trimmed = String(rawTool).trim();
    if (!trimmed) continue;

    // 1. Déjà un outil natif Antigravity valide
    if (ALLOWED_TOOLS_SET.has(trimmed)) {
      const validTool = trimmed as AntigravitySubagentTool;
      if (!seen.has(validTool)) {
        seen.add(validTool);
        tools.push(validTool);
      }
      continue;
    }

    // 2. Outil Claude Code connu dans la table de traduction officielle
    const mapped = CLAUDE_TO_ANTIGRAVITY_TOOL_MAP[trimmed];
    if (mapped) {
      translatedTools.push({ from: trimmed, to: mapped });
      if (!seen.has(mapped)) {
        seen.add(mapped);
        tools.push(mapped);
      }
      continue;
    }

    // 3. Outil MCP ou inconnu : retiré avec justification traçable (§4.4)
    const reason = trimmed.startsWith('mcp__')
      ? `Outil MCP '${trimmed}' retiré par défaut : nécessite un serveur MCP explicitement déclaré et actif dans Antigravity.`
      : `Outil '${trimmed}' non reconnu par le schéma des sous-agents Google Antigravity et retiré par sécurité.`;
    removedTools.push({ tool: trimmed, reason });
  }

  return { tools, translatedTools, removedTools };
}

/**
 * Résultat de la traduction d'un tier de modèle vers Antigravity.
 */
export interface ModelTranslationResult {
  model: SubagentModelTier;
  wasAdapted: boolean;
  note?: string;
}

/**
 * Traduit un identifiant de modèle (Claude haiku/sonnet/opus ou autre)
 * vers les seules valeurs de champ `model` confirmées par le schéma officiel Antigravity :
 * `inherit`, `flash`, `pro` (§6.3 CDC).
 */
export function translateModelToAntigravity(rawModel: string | undefined): ModelTranslationResult {
  if (!rawModel || rawModel.trim() === '') {
    return { model: 'inherit', wasAdapted: false };
  }

  const normalized = rawModel.trim().toLowerCase();
  if (normalized === 'inherit' || normalized === 'flash' || normalized === 'pro') {
    return { model: normalized, wasAdapted: false };
  }

  const mapped = CLAUDE_TO_ANTIGRAVITY_MODEL_MAP[normalized];
  if (mapped) {
    return {
      model: mapped,
      wasAdapted: true,
      note: `Modèle source '${rawModel}' adapté vers le tier natif Antigravity '${mapped}'.`,
    };
  }

  return {
    model: 'inherit',
    wasAdapted: true,
    note: `Modèle source '${rawModel}' non standard ; repli sécurisé vers 'inherit' conformément au §6.3 du CDC.`,
  };
}

/**
 * Détermine de manière déterministe le couple (Modèle, Niveau d'effort) optimal
 * hors-YAML pour un sous-agent selon son rôle et son éventuel modèle source amont.
 */
export function inferRecommendedModelEffortPair(params: {
  slug: string;
  rawModel?: string;
  isIndependentReviewer?: boolean;
}): {
  recommendedModelTier: RecommendedModelTier;
  recommendedEffort: ReasoningEffortTier;
  qualityCostRecommendation: string;
} {
  const normModel = params.rawModel?.trim().toLowerCase() ?? '';
  const slug = params.slug.toLowerCase();

  const isLightweightDocOrFormat =
    normModel === 'haiku' ||
    ((normModel === 'flash' || normModel === '') &&
      /(?:^|-)(?:doc|docs|readme|codemap|format)(?:$|-)/i.test(slug)) ||
    /(?:^|-)(?:doc-updater|codemap)(?:$|-)/i.test(slug);

  if (isLightweightDocOrFormat) {
    return {
      recommendedModelTier: 'flash',
      recommendedEffort: 'low',
      qualityCostRecommendation:
        'Couple Standard — Effort Low : latence minimale et coût très réduit pour la documentation et les mises à jour ciblées.',
    };
  }

  if (normModel === 'flash' || /(?:^|-)(?:qa|test-runner)(?:$|-)/i.test(slug)) {
    return {
      recommendedModelTier: 'flash',
      recommendedEffort: 'medium',
      qualityCostRecommendation:
        'Couple Standard — Effort Medium : exécution rapide et économique pour la vérification automatisée et les tâches bornées.',
    };
  }

  const isHighReasoningRole =
    normModel === 'opus' ||
    params.isIndependentReviewer === true ||
    /(?:architect|security|audit|reviewer|review|performance|planner)/i.test(slug);

  if (isHighReasoningRole) {
    return {
      recommendedModelTier: 'pro',
      recommendedEffort: 'high',
      qualityCostRecommendation:
        'Couple Flagship — Effort High : raisonnement approfondi requis pour l’architecture, la performance critique, la sécurité et la revue indépendante.',
    };
  }

  return {
    recommendedModelTier: 'pro',
    recommendedEffort: 'medium',
    qualityCostRecommendation:
      'Couple Flagship — Effort Medium : ratio coût/performance optimal pour l’ingénierie standard, le refactoring sûr et la résolution d’erreurs de build.',
  };
}

/**
 * Sépare le frontmatter YAML éventuel et le corps Markdown d'un fichier.
 */
export function splitMarkdownFrontmatter(content: string): {
  hasFrontmatter: boolean;
  rawFrontmatter: string;
  parsedFrontmatter: Record<string, unknown> | null;
  body: string;
  parseError?: string;
} {
  const clean = content.replace(/^\uFEFF/, '');
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return {
      hasFrontmatter: false,
      rawFrontmatter: '',
      parsedFrontmatter: null,
      body: clean,
    };
  }

  const rawFrontmatter = match[1] ?? '';
  const body = clean.slice(match[0].length);

  try {
    const loaded = yaml.load(rawFrontmatter, { schema: yaml.CORE_SCHEMA });
    if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
      return {
        hasFrontmatter: true,
        rawFrontmatter,
        parsedFrontmatter: null,
        body,
        parseError: 'Le frontmatter YAML doit être un objet clé-valeur.',
      };
    }
    return {
      hasFrontmatter: true,
      rawFrontmatter,
      parsedFrontmatter: loaded as Record<string, unknown>,
      body,
    };
  } catch (err) {
    return {
      hasFrontmatter: true,
      rawFrontmatter,
      parsedFrontmatter: null,
      body,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Nettoie les variables et chemins spécifiques à Claude Code dans un corps Markdown
 * afin de le rendre portable et sûr pour Google Antigravity.
 */
export function sanitizeClaudeSpecificReferences(markdownBody: string): {
  content: string;
  replacements: string[];
} {
  const replacements: string[] = [];
  let updated = markdownBody;

  const patterns: Array<{ regex: RegExp; replacement: string; label: string }> = [
    {
      regex: /\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PROJECT_DIR\b/g,
      replacement: '.',
      label: 'CLAUDE_PROJECT_DIR -> .',
    },
    {
      regex: /\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g,
      replacement: '.agents',
      label: 'CLAUDE_PLUGIN_ROOT -> .agents',
    },
    {
      regex: /\$\{CLAUDE_SKILL_DIR\}|\$CLAUDE_SKILL_DIR\b/g,
      replacement: '.',
      label: 'CLAUDE_SKILL_DIR -> .',
    },
    {
      regex: /\$\{CLAUDE_SESSION_ID\}|\$CLAUDE_SESSION_ID\b/g,
      replacement: 'current-session',
      label: 'CLAUDE_SESSION_ID -> current-session',
    },
    {
      regex: /\$\{ARGUMENTS\}|\$ARGUMENTS\b/g,
      replacement: '<user-request>',
      label: 'ARGUMENTS -> <user-request>',
    },
    {
      regex: /~\/\.claude\b/g,
      replacement: '.agents',
      label: '~/.claude -> .agents',
    },
    // Modèles Claude -> Google Antigravity
    {
      regex: /\bHaiku\b/g,
      replacement: 'Standard',
      label: 'Haiku -> Standard',
    },
    {
      regex: /\bSonnet\b/g,
      replacement: 'Flagship',
      label: 'Sonnet -> Flagship',
    },
    {
      regex: /\bOpus\b/g,
      replacement: 'Flagship',
      label: 'Opus -> Flagship',
    },
    // Raccourcis et flags spécifiques Claude Code
    {
      regex: /Option\+T\s*\(macOS\)\s*\/\s*Alt\+T\s*\(Windows\/Linux\)/gi,
      replacement: 'raccourci de session Antigravity',
      label: 'Option+T -> raccourci Antigravity',
    },
    {
      regex: /\/effort\b/g,
      replacement: 'sélecteur de modèle Antigravity',
      label: '/effort -> sélecteur de modèle',
    },
    {
      regex: /CLAUDE_CODE_EFFORT_LEVEL/g,
      replacement: 'ANTIGRAVITY_EFFORT_LEVEL',
      label: 'CLAUDE_CODE_EFFORT_LEVEL -> ANTIGRAVITY_EFFORT_LEVEL',
    },
    {
      regex: /alwaysThinkingEnabled/g,
      replacement: 'thinkingEnabled',
      label: 'alwaysThinkingEnabled -> thinkingEnabled',
    },
    {
      regex: /Claude Code/g,
      replacement: 'Google Antigravity',
      label: 'Claude Code -> Google Antigravity',
    },
    {
      regex: /Claude API/g,
      replacement: 'Antigravity API',
      label: 'Claude API -> Antigravity API',
    },
    {
      regex: /\.claude\/settings\.json/g,
      replacement: '.agents/settings.json',
      label: '.claude/settings.json -> .agents/settings.json',
    },
    {
      regex: /\bCLAUDE\.md\b/g,
      replacement: 'AGENTS.md',
      label: 'CLAUDE.md -> AGENTS.md',
    },
    {
      regex: /\bTodoWrite\b/g,
      replacement: 'Task tracking',
      label: 'TodoWrite -> Task tracking',
    },
    // Sous-agents fantômes -> Sous-agents réels Antigravity
    {
      regex: /\bsecurity-reviewer\b/g,
      replacement: 'security-auditor',
      label: 'security-reviewer -> security-auditor',
    },
    {
      regex: /\btdd-guide\b/g,
      replacement: 'tdd-workflow',
      label: 'tdd-guide -> tdd-workflow',
    },
    {
      regex: /\btypescript-reviewer\b/g,
      replacement: 'code-reviewer',
      label: 'typescript-reviewer -> code-reviewer',
    },
    {
      regex: /\bpython-reviewer\b/g,
      replacement: 'code-reviewer',
      label: 'python-reviewer -> code-reviewer',
    },
    {
      regex: /\bgo-reviewer\b/g,
      replacement: 'code-reviewer',
      label: 'go-reviewer -> code-reviewer',
    },
    {
      regex: /\brust-reviewer\b/g,
      replacement: 'code-reviewer',
      label: 'rust-reviewer -> code-reviewer',
    },
    // Liens relatifs cassés
    {
      regex: /\[testing\.md\]\(testing\.md\)/g,
      replacement: '[common-testing.md](common-testing.md)',
      label: 'testing.md -> common-testing.md',
    },
    {
      regex: /\[git-workflow\.md\]\(\.\/git-workflow\.md\)/g,
      replacement: '[common-git-workflow.md](common-git-workflow.md)',
      label: 'git-workflow.md -> common-git-workflow.md',
    },
    {
      regex: /\[development-workflow\.md\]\(\.\/development-workflow\.md\)/g,
      replacement: '[common-development-workflow.md](common-development-workflow.md)',
      label: 'development-workflow.md -> common-development-workflow.md',
    },
    {
      regex: /\[security\.md\]\(security\.md\)/g,
      replacement: '[common-security.md](common-security.md)',
      label: 'security.md -> common-security.md',
    },
    {
      regex: /\[agents\.md\]\(agents\.md\)/g,
      replacement: '[AGENTS.md](../../AGENTS.md)',
      label: 'agents.md -> AGENTS.md',
    },
  ];

  for (const { regex, replacement, label } of patterns) {
    if (regex.test(updated)) {
      updated = updated.replace(regex, replacement);
      replacements.push(label);
    }
  }

  return { content: updated, replacements };
}

/**
 * Sérialise de manière canonique et déterministe une règle modulaire Antigravity (.agents/rules/<name>.md).
 */
export function serializeAntigravityRule(
  frontmatter: AntigravityRuleFrontmatter,
  markdownBody: string
): string {
  const validated = AntigravityRuleFrontmatterSchema.parse(frontmatter);
  const ordered: Record<string, unknown> = {
    trigger: validated.trigger,
  };
  if (validated.description) {
    ordered.description = validated.description.trim();
  }
  if (validated.globs) {
    ordered.globs = validated.globs.trim();
  } else if (validated.glob) {
    ordered.globs = validated.glob.trim();
  }

  const yamlText = yaml
    .dump(ordered, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
    })
    .trimEnd();

  const cleanBody = markdownBody.replace(/^\r?\n+/, '').trimEnd();
  return `---\n${yamlText}\n---\n\n${cleanBody}\n`;
}

/**
 * Sérialise de manière canonique et déterministe un fichier SKILL.md Antigravity (.agents/skills/<name>/SKILL.md).
 * Force une description en ligne unique (sans bloc `|`) conformément aux exigences de compatibilité.
 */
export function serializeAntigravitySkill(
  frontmatter: AntigravitySkillFrontmatter,
  markdownBody: string
): string {
  const normalizedDescription = frontmatter.description.replace(/\s*\r?\n\s*/g, ' ').trim();
  const validated = AntigravitySkillFrontmatterSchema.parse({
    ...frontmatter,
    description: normalizedDescription,
  });

  const ordered: Record<string, unknown> = {
    name: validated.name,
    description: validated.description,
  };
  if (validated.license) {
    ordered.license = validated.license;
  }
  if (validated.metadata && Object.keys(validated.metadata).length > 0) {
    ordered.metadata = validated.metadata;
  }

  const yamlText = yaml
    .dump(ordered, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
    })
    .trimEnd();

  const cleanBody = markdownBody.replace(/^\r?\n+/, '').trimEnd();
  return `---\n${yamlText}\n---\n\n${cleanBody}\n`;
}

/**
 * Sérialise de manière canonique et déterministe un sous-agent Antigravity (.agents/agents/<name>.md).
 * Le champ `model` n'est jamais inscrit dans le frontmatter YAML (gouvernance centralisée).
 */
export function serializeAntigravitySubagent(
  frontmatter: AntigravitySubagentFrontmatter,
  markdownBody: string
): string {
  const normalizedDescription = frontmatter.description.replace(/\s*\r?\n\s*/g, ' ').trim();
  const validated = AntigravitySubagentFrontmatterSchema.parse({
    ...frontmatter,
    description: normalizedDescription,
  });

  const ordered: Record<string, unknown> = {
    name: validated.name,
    description: validated.description,
    tools: validated.tools,
  };

  if (validated.commandExecutionPolicy) {
    ordered.commandExecutionPolicy = validated.commandExecutionPolicy;
  }
  if (typeof validated.subagent === 'boolean') {
    ordered.subagent = validated.subagent;
  }
  if (typeof validated.mainAgent === 'boolean') {
    ordered.mainAgent = validated.mainAgent;
  }

  const yamlText = yaml
    .dump(ordered, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
    })
    .trimEnd();

  const cleanBody = markdownBody.replace(/^\r?\n+/, '').trimEnd();
  return `---\n${yamlText}\n---\n\n${cleanBody}\n`;
}

/**
 * Adapte un fichier d'agent brut provenant d'ECC (format Claude Code)
 * vers un fichier de sous-agent Google Antigravity valide (sans `model` dans le YAML)
 * et retourne séparément le couple (Modèle, Effort) recommandé pour la gouvernance centralisée.
 */
export function adaptEccAgentMarkdown(
  rawEccMarkdown: string,
  expectedSlug: string,
  options?: { isIndependentReviewer?: boolean }
): {
  content: string;
  frontmatter: AntigravitySubagentFrontmatter;
  recommendedModelTier: RecommendedModelTier;
  recommendedEffort: ReasoningEffortTier;
  qualityCostRecommendation: string;
  adaptationNotes: string[];
} {
  const split = splitMarkdownFrontmatter(rawEccMarkdown);
  if (!split.hasFrontmatter || !split.parsedFrontmatter) {
    throw new Error(
      `Impossible d'adapter l'agent ECC '${expectedSlug}' : frontmatter YAML manquant ou invalide (${split.parseError ?? 'inconnu'}).`
    );
  }

  const fm = split.parsedFrontmatter;
  const adaptationNotes: string[] = [];

  if ('color' in fm) {
    adaptationNotes.push("Suppression de la propriété 'color' spécifique à Claude Code.");
  }

  const rawTools = Array.isArray(fm.tools)
    ? fm.tools.map(String)
    : typeof fm.tools === 'string'
      ? fm.tools
      : undefined;

  const toolResult = translateToolsToAntigravity(rawTools);
  for (const t of toolResult.translatedTools) {
    adaptationNotes.push(`Outil traduit : '${t.from}' -> '${t.to}'.`);
  }
  for (const r of toolResult.removedTools) {
    adaptationNotes.push(r.reason);
  }

  let finalTools = toolResult.tools;
  if (options?.isIndependentReviewer) {
    const beforeCount = finalTools.length;
    finalTools = finalTools.filter(
      (tool) => tool !== 'write_to_file' && tool !== 'replace_file_content'
    );
    if (finalTools.length < beforeCount) {
      adaptationNotes.push(
        "Politique de sécurité §6.2 : retrait des outils d'écriture ('write_to_file', 'replace_file_content') pour garantir un agent de revue indépendant en lecture seule."
      );
    }
  }

  const rawModelString = typeof fm.model === 'string' ? fm.model : undefined;
  if ('model' in fm) {
    adaptationNotes.push(
      `Suppression du champ 'model' ('${String(fm.model)}') du frontmatter YAML de l'agent : le couple modèle/effort est gouverné de manière centralisée dans '.agents/rules/model-effort-governance.md' et 'docs/ORCHESTRATION.md'.`
    );
  }

  const recommendedPair = inferRecommendedModelEffortPair({
    slug: expectedSlug,
    rawModel: rawModelString,
    isIndependentReviewer: options?.isIndependentReviewer,
  });

  const sanitizedBody = sanitizeClaudeSpecificReferences(split.body);
  for (const rep of sanitizedBody.replacements) {
    adaptationNotes.push(`Référence Claude Code normalisée : ${rep}.`);
  }

  const description =
    typeof fm.description === 'string' && fm.description.trim().length >= 10
      ? fm.description.trim()
      : `Sous-agent spécialisé ${expectedSlug} adapté pour Google Antigravity.`;

  const adaptedFrontmatter: AntigravitySubagentFrontmatter = {
    name: expectedSlug,
    description,
    tools: finalTools,
    commandExecutionPolicy: 'sandbox',
  };

  const content = serializeAntigravitySubagent(adaptedFrontmatter, sanitizedBody.content);

  return {
    content,
    frontmatter: adaptedFrontmatter,
    recommendedModelTier: recommendedPair.recommendedModelTier,
    recommendedEffort: recommendedPair.recommendedEffort,
    qualityCostRecommendation: recommendedPair.qualityCostRecommendation,
    adaptationNotes,
  };
}
