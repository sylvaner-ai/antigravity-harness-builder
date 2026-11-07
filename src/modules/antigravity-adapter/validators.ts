import path from 'node:path';
import {
  ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS,
  ANTIGRAVITY_LIMITS,
  ANTIGRAVITY_MUTATION_TOOLS,
  AntigravityRuleFrontmatterSchema,
  AntigravitySkillFrontmatterSchema,
  AntigravitySubagentFrontmatterSchema,
  AntigravitySubagentTool,
  ValidationIssue,
  ValidationTier,
} from './schema';
import { splitMarkdownFrontmatter } from './adapter';

/**
 * Représentation d'un fichier candidat à l'export dans le paquet.
 */
export interface PackageFileEntry {
  relativePath: string;
  content: string;
  isReviewerAgent?: boolean;
}

const FORBIDDEN_CLAUDE_TOKENS = [
  '${CLAUDE_SESSION_ID}',
  '$CLAUDE_SESSION_ID',
  '${CLAUDE_SKILL_DIR}',
  '$CLAUDE_SKILL_DIR',
  '${CLAUDE_PLUGIN_ROOT}',
  '$CLAUDE_PLUGIN_ROOT',
  '${CLAUDE_PROJECT_DIR}',
  '$CLAUDE_PROJECT_DIR',
  '$ARGUMENTS',
  '${ARGUMENTS}',
] as const;

const ALLOWED_ROOT_FILES = new Set(['START_HERE.md', 'README.md', 'AGENTS.md']);

const ALLOWED_DOCS_FILES = new Set([
  'docs/PROJECT_SPEC.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/ARCHITECTURE.md',
  'docs/ORCHESTRATION.md',
  'docs/ACCEPTANCE_CRITERIA.md',
  'docs/ASSUMPTIONS.md',
  'docs/SOURCES.md',
  'docs/HARNESS_MANIFEST.json',
]);

const ALLOWED_TOOLS_SET = new Set<string>(ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS);

/**
 * 1. Validateur de sécurité et de conformité des chemins (PathSafetyValidator — FR-08, FR-09, §9)
 */
export function validatePackagePathSafety(relativePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!relativePath || relativePath.trim() === '') {
    issues.push({
      severity: 'error',
      code: 'PATH_EMPTY',
      message: 'Le chemin relatif du fichier ne peut pas être vide.',
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
    return issues;
  }

  // Interdiction des chemins absolus Unix ou Windows, des backslashes et des caractères de contrôle
  if (
    relativePath.startsWith('/') ||
    relativePath.startsWith('\\') ||
    /^[A-Za-z]:/.test(relativePath) ||
    relativePath.includes('\\') ||
    /[\x00-\x1f\x7f]/.test(relativePath)
  ) {
    issues.push({
      severity: 'error',
      code: 'PATH_UNSAFE_FORMAT',
      message: `Chemin interdit ou non portable détecté : '${relativePath}'. Les chemins absolus, lecteurs Windows et backslashes sont bloqués.`,
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
    return issues;
  }

  const segments = relativePath.split('/');
  if (
    segments.some(
      (seg) =>
        seg === '' ||
        seg === '.' ||
        seg === '..' ||
        seg.endsWith(' ') ||
        seg.endsWith('.')
    )
  ) {
    issues.push({
      severity: 'error',
      code: 'PATH_TRAVERSAL_OR_INVALID_SEGMENT',
      message: `Tentative de traversée de répertoire ('..') ou segment invalide dans '${relativePath}'.`,
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
    return issues;
  }

  // Blocage explicite des workflows legacy dépréciés le 19 octobre 2026 (§4.4 CDC & Q3)
  if (relativePath.startsWith('.agents/workflows/') || relativePath.startsWith('.agent/')) {
    issues.push({
      severity: 'error',
      code: 'LEGACY_ANTIGRAVITY_PATH_FORBIDDEN',
      message: `Le chemin '${relativePath}' utilise un format legacy déprécié (.agents/workflows/ ou .agent/). Utilisez exclusivement '.agents/skills/<name>/SKILL.md' et '.agents/'.`,
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
    return issues;
  }

  // Blocage de hooks.json et des scripts exécutables en V1 (§4.4, §9 & Q5)
  if (
    relativePath === '.agents/hooks.json' ||
    relativePath.endsWith('/hooks.json') ||
    /\.(sh|bash|zsh|ps1|bat|cmd|exe|dll|so|dylib|py)$/i.test(relativePath)
  ) {
    issues.push({
      severity: 'error',
      code: 'EXECUTABLE_OR_HOOK_FORBIDDEN_V1',
      message: `Le fichier '${relativePath}' est un hook ou un script exécutable non autorisé par défaut en V1.`,
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
    return issues;
  }

  // Vérification que le fichier appartient à l'arborescence canonique du paquet (§5 CDC)
  const isAllowedRoot = ALLOWED_ROOT_FILES.has(relativePath);
  const isAllowedDoc = ALLOWED_DOCS_FILES.has(relativePath);
  const isAllowedRule = /^\.agents\/rules\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(relativePath);
  const isAllowedAgent = /^\.agents\/agents\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(relativePath);
  const isAllowedSkill =
    /^\.agents\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:SKILL\.md|(?:(?:references|resources|examples)\/)?[a-zA-Z0-9._-]+\.(?:md|json|yaml|yml|txt|css))$/.test(
      relativePath
    );

  if (!isAllowedRoot && !isAllowedDoc && !isAllowedRule && !isAllowedAgent && !isAllowedSkill) {
    issues.push({
      severity: 'error',
      code: 'PATH_OUTSIDE_HARNESS_CONTRACT',
      message: `Le chemin '${relativePath}' ne correspond à aucun emplacement natif autorisé du contrat de paquet Antigravity.`,
      filePath: relativePath,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
  }

  return issues;
}

/**
 * 2. Validateur de AGENTS.md et des règles (.agents/rules/*.md) + Budget de contexte 24 Ko / 20k tokens
 */
export function validateRulesAndContextBudget(files: readonly PackageFileEntry[]): {
  issues: ValidationIssue[];
  estimatedAlwaysOnTokens: number;
} {
  const issues: ValidationIssue[] = [];
  let alwaysOnBytes = 0;

  for (const file of files) {
    if (file.relativePath === 'AGENTS.md') {
      const byteLength = Buffer.byteLength(file.content, 'utf8');
      alwaysOnBytes += byteLength;

      if (byteLength > ANTIGRAVITY_LIMITS.MAX_RULE_FILE_BYTES) {
        issues.push({
          severity: 'error',
          code: 'AGENTS_MD_SIZE_LIMIT_EXCEEDED',
          message: `AGENTS.md dépasse la limite stricte Antigravity de ${ANTIGRAVITY_LIMITS.MAX_RULE_FILE_BYTES} octets (${byteLength} octets).`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }

      const split = splitMarkdownFrontmatter(file.content);
      if (split.hasFrontmatter) {
        issues.push({
          severity: 'error',
          code: 'AGENTS_MD_FORBIDDEN_FRONTMATTER',
          message:
            'AGENTS.md ne doit pas contenir de frontmatter YAML selon la documentation officielle Antigravity (docs/rules.md).',
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
    }

    if (file.relativePath.startsWith('.agents/rules/')) {
      const byteLength = Buffer.byteLength(file.content, 'utf8');
      if (byteLength > ANTIGRAVITY_LIMITS.MAX_RULE_FILE_BYTES) {
        issues.push({
          severity: 'error',
          code: 'RULE_FILE_SIZE_LIMIT_EXCEEDED',
          message: `La règle '${file.relativePath}' (${byteLength} octets) dépasse le plafond strict Antigravity de ${ANTIGRAVITY_LIMITS.MAX_RULE_FILE_BYTES} octets (24 Ko).`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }

      const split = splitMarkdownFrontmatter(file.content);
      if (!split.hasFrontmatter || !split.parsedFrontmatter) {
        issues.push({
          severity: 'error',
          code: 'RULE_FRONTMATTER_INVALID',
          message: `La règle '${file.relativePath}' doit posséder un frontmatter YAML valide (${split.parseError ?? 'frontmatter manquant'}).`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
        continue;
      }

      const parsed = AntigravityRuleFrontmatterSchema.safeParse(split.parsedFrontmatter);
      if (!parsed.success) {
        for (const err of parsed.error.issues) {
          issues.push({
            severity: 'error',
            code: 'RULE_SCHEMA_VIOLATION',
            message: `Frontmatter invalide dans '${file.relativePath}' (${err.path.join('.')}) : ${err.message}`,
            filePath: file.relativePath,
            validationKind: 'SYNTACTIC',
            validationTier: 'AUTO_VALIDATED',
          });
        }
        continue;
      }

      if (parsed.data.trigger === 'always_on') {
        alwaysOnBytes += byteLength;
      }

      if (split.body.trim().length === 0) {
        issues.push({
          severity: 'error',
          code: 'RULE_EMPTY_BODY',
          message: `Le corps Markdown de la règle '${file.relativePath}' est vide.`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
    }
  }

  const estimatedAlwaysOnTokens = Math.ceil(
    alwaysOnBytes / ANTIGRAVITY_LIMITS.BYTES_PER_TOKEN_ESTIMATE
  );

  if (estimatedAlwaysOnTokens > ANTIGRAVITY_LIMITS.SAFE_ALWAYS_ON_RULES_TOKEN_LIMIT) {
    issues.push({
      severity: 'error',
      code: 'ALWAYS_ON_RULES_TOKEN_BUDGET_EXCEEDED',
      message: `Le budget cumulé estimé des règles always_on + AGENTS.md (${estimatedAlwaysOnTokens} tokens) dépasse la limite de sécurité (${ANTIGRAVITY_LIMITS.SAFE_ALWAYS_ON_RULES_TOKEN_LIMIT} tokens, plafond Antigravity à ${ANTIGRAVITY_LIMITS.OFFICIAL_ALWAYS_ON_RULES_TOKEN_BUDGET} tokens). Basculez les règles spécifiques en 'trigger: glob' ou 'trigger: model_decision'.`,
      validationKind: 'SYNTACTIC',
      validationTier: 'AUTO_VALIDATED',
    });
  }

  return { issues, estimatedAlwaysOnTokens };
}

/**
 * 3. Validateur des Skills (.agents/skills/<slug>/SKILL.md)
 */
export function validateSkills(files: readonly PackageFileEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allPaths = new Set(files.map((f) => f.relativePath));

  // Regrouper tous les fichiers sous .agents/skills/<slug>/
  const skillSlugs = new Set<string>();
  for (const file of files) {
    const match = file.relativePath.match(/^\.agents\/skills\/([^/]+)\//);
    if (match?.[1]) {
      skillSlugs.add(match[1]);
    }
  }

  for (const slug of skillSlugs) {
    const expectedSkillMdPath = `.agents/skills/${slug}/SKILL.md`;
    const skillFile = files.find((f) => f.relativePath === expectedSkillMdPath);

    if (!skillFile) {
      issues.push({
        severity: 'error',
        code: 'SKILL_MISSING_SKILL_MD',
        message: `Le dossier de skill '.agents/skills/${slug}/' ne contient pas le fichier obligatoire 'SKILL.md'.`,
        filePath: expectedSkillMdPath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
      continue;
    }

    const split = splitMarkdownFrontmatter(skillFile.content);
    if (!split.hasFrontmatter || !split.parsedFrontmatter) {
      issues.push({
        severity: 'error',
        code: 'SKILL_FRONTMATTER_MISSING_OR_INVALID',
        message: `Frontmatter YAML manquant ou invalide dans '${expectedSkillMdPath}' (${split.parseError ?? 'inconnu'}).`,
        filePath: expectedSkillMdPath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
      continue;
    }

    // Détection des blocs scalaires littéraux `|` sur `description:` (cf. validate-skills.js d'ECC)
    if (/^\s*description\s*:\s*[|>]/m.test(split.rawFrontmatter)) {
      issues.push({
        severity: 'error',
        code: 'SKILL_BLOCK_SCALAR_DESCRIPTION_FORBIDDEN',
        message: `La propriété 'description' de '${expectedSkillMdPath}' utilise un bloc scalaire YAML ('|' ou '>'). Utilisez une chaîne inline sur une seule ligne.`,
        filePath: expectedSkillMdPath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }

    const parsed = AntigravitySkillFrontmatterSchema.safeParse(split.parsedFrontmatter);
    if (!parsed.success) {
      for (const err of parsed.error.issues) {
        issues.push({
          severity: 'error',
          code: 'SKILL_SCHEMA_VIOLATION',
          message: `Frontmatter invalide dans '${expectedSkillMdPath}' (${err.path.join('.')}) : ${err.message}`,
          filePath: expectedSkillMdPath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
      continue;
    }

    if (parsed.data.name !== slug) {
      issues.push({
        severity: 'error',
        code: 'SKILL_NAME_DIRECTORY_MISMATCH',
        message: `Le champ 'name: ${parsed.data.name}' dans '${expectedSkillMdPath}' ne correspond pas au nom du dossier '${slug}'.`,
        filePath: expectedSkillMdPath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }

    if (split.body.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'SKILL_EMPTY_BODY',
        message: `Le fichier '${expectedSkillMdPath}' a un corps d'instructions vide.`,
        filePath: expectedSkillMdPath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }

    // Détection des variables Claude Code interdites
    for (const token of FORBIDDEN_CLAUDE_TOKENS) {
      if (skillFile.content.includes(token)) {
        issues.push({
          severity: 'error',
          code: 'SKILL_UNTRANSLATED_CLAUDE_VARIABLE',
          message: `Variable spécifique à Claude Code '${token}' détectée dans '${expectedSkillMdPath}'.`,
          filePath: expectedSkillMdPath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
    }

    // Vérification des liens Markdown relatifs dans SKILL.md
    const linkRegex = /\[[^\]]+\]\((\.\/[^)#\s]+)\)/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(split.body)) !== null) {
      const relTarget = linkMatch[1];
      if (!relTarget) continue;
      const resolvedPath = path.posix.normalize(
        path.posix.join(`.agents/skills/${slug}`, relTarget)
      );
      if (!allPaths.has(resolvedPath)) {
        issues.push({
          severity: 'error',
          code: 'SKILL_BROKEN_RELATIVE_LINK',
          message: `Lien relatif cassé '${relTarget}' dans '${expectedSkillMdPath}' (cible attendue : '${resolvedPath}').`,
          filePath: expectedSkillMdPath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
    }
  }

  return issues;
}

/**
 * 4. Validateur des Sous-agents (.agents/agents/<slug>.md)
 */
export function validateSubagents(files: readonly PackageFileEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (!file.relativePath.startsWith('.agents/agents/')) continue;

    const slugMatch = file.relativePath.match(/^\.agents\/agents\/([^/]+)\.md$/);
    const expectedSlug = slugMatch?.[1] ?? '';

    const split = splitMarkdownFrontmatter(file.content);
    if (!split.hasFrontmatter || !split.parsedFrontmatter) {
      issues.push({
        severity: 'error',
        code: 'SUBAGENT_FRONTMATTER_MISSING_OR_INVALID',
        message: `Frontmatter YAML manquant ou invalide dans '${file.relativePath}' (${split.parseError ?? 'inconnu'}).`,
        filePath: file.relativePath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
      continue;
    }

    // Vérification préalable explicite des outils et de l'absence de `model` dans le YAML des sous-agents
    if ('model' in split.parsedFrontmatter) {
      issues.push({
        severity: 'error',
        code: 'SUBAGENT_FORBIDDEN_MODEL_IN_FRONTMATTER',
        message: `Le champ 'model' est interdit dans le frontmatter YAML de '${file.relativePath}'. Le choix du couple modèle/effort est centralisé dans '.agents/rules/model-effort-governance.md' et 'docs/ORCHESTRATION.md'.`,
        filePath: file.relativePath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }

    const rawTools = split.parsedFrontmatter.tools;
    if (Array.isArray(rawTools)) {
      for (const tool of rawTools) {
        if (typeof tool !== 'string' || !ALLOWED_TOOLS_SET.has(tool)) {
          issues.push({
            severity: 'error',
            code: 'SUBAGENT_FORBIDDEN_OR_UNKNOWN_TOOL',
            message: `Outil non reconnu '${String(tool)}' dans '${file.relativePath}'. Seuls [${ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS.join(', ')}] sont autorisés dans Antigravity.`,
            filePath: file.relativePath,
            validationKind: 'SYNTACTIC',
            validationTier: 'AUTO_VALIDATED',
          });
        }
      }
    }

    const parsed = AntigravitySubagentFrontmatterSchema.safeParse(split.parsedFrontmatter);
    if (!parsed.success) {
      for (const err of parsed.error.issues) {
        issues.push({
          severity: 'error',
          code: 'SUBAGENT_SCHEMA_VIOLATION',
          message: `Frontmatter invalide dans '${file.relativePath}' (${err.path.join('.')}) : ${err.message}`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
      continue;
    }

    if (parsed.data.name !== expectedSlug) {
      issues.push({
        severity: 'error',
        code: 'SUBAGENT_NAME_FILENAME_MISMATCH',
        message: `Le champ 'name: ${parsed.data.name}' dans '${file.relativePath}' ne correspond pas au nom de fichier '${expectedSlug}.md'.`,
        filePath: file.relativePath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }

    // Règle §6.2 du CDC : un agent de revue ou d'audit indépendant ne doit jamais posséder d'outils d'écriture
    const isReviewerByNameOrFlag =
      file.isReviewerAgent === true ||
      /(?:reviewer|auditor|audit)(?:$|-)/i.test(parsed.data.name);

    if (isReviewerByNameOrFlag) {
      const forbiddenWriteTools = parsed.data.tools.filter((tool) =>
        ANTIGRAVITY_MUTATION_TOOLS.has(tool as AntigravitySubagentTool)
      );
      if (forbiddenWriteTools.length > 0) {
        issues.push({
          severity: 'error',
          code: 'REVIEWER_SUBAGENT_HAS_MUTATION_TOOLS',
          message: `Violation du §6.2 du CDC : le sous-agent de revue '${parsed.data.name}' possède des outils d'écriture (${forbiddenWriteTools.join(', ')}). Un relecteur indépendant ne doit pas pouvoir modifier le code qu'il audite.`,
          filePath: file.relativePath,
          validationKind: 'SYNTACTIC',
          validationTier: 'AUTO_VALIDATED',
        });
      }
    }

    // Information documentaire si des outils réseau sont utilisés (dépend de l'Internet Access Policy du client)
    if (
      parsed.data.tools.includes('search_web') ||
      parsed.data.tools.includes('read_url_content')
    ) {
      issues.push({
        severity: 'info',
        code: 'SUBAGENT_NETWORK_TOOLS_DEPEND_ON_POLICY',
        message: `Le sous-agent '${parsed.data.name}' utilise des outils web ('search_web' / 'read_url_content') ; leur exécution dépend de la politique 'Internet Access Policy' du projet Antigravity de l'utilisateur.`,
        filePath: file.relativePath,
        validationKind: 'DOCUMENTARY',
        validationTier: 'DOC_COMPATIBLE',
      });
    }

    if (split.body.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'SUBAGENT_EMPTY_BODY',
        message: `Le corps d'instructions du sous-agent '${file.relativePath}' est vide.`,
        filePath: file.relativePath,
        validationKind: 'SYNTACTIC',
        validationTier: 'AUTO_VALIDATED',
      });
    }
  }

  return issues;
}

/**
 * Calcule le statut de validation global d'un fichier à partir des issues détectées.
 */
export function resolveFileValidationTier(
  filePath: string,
  allIssues: readonly ValidationIssue[]
): {
  tier: ValidationTier;
  valid: boolean;
  fileIssues: ValidationIssue[];
} {
  const fileIssues = allIssues.filter((issue) => issue.filePath === filePath);
  const hasError = fileIssues.some((issue) => issue.severity === 'error');
  const hasUnverified = fileIssues.some((issue) => issue.validationTier === 'UNVERIFIED');
  const hasDocCompatible = fileIssues.some((issue) => issue.validationTier === 'DOC_COMPATIBLE');

  if (hasUnverified) {
    return { tier: 'UNVERIFIED', valid: !hasError, fileIssues };
  }
  if (hasDocCompatible) {
    return { tier: 'DOC_COMPATIBLE', valid: !hasError, fileIssues };
  }
  return { tier: 'AUTO_VALIDATED', valid: !hasError, fileIssues };
}
