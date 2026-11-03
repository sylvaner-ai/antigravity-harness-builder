import { z } from 'zod';

/**
 * Surfaces officielles Google Antigravity prises en charge (§3.1 & §15.4).
 */
export const AntigravitySurfaceSchema = z.enum(['APP', 'IDE', 'CLI']);
export type AntigravitySurface = z.infer<typeof AntigravitySurfaceSchema>;

/**
 * Niveaux de résultat de validation exigés par la section §15.4 du CDC :
 * 1. AUTO_VALIDATED : Validé automatiquement par une règle ou un validateur déterministe
 * 2. DOC_COMPATIBLE : Compatible selon la documentation officielle (dépend du contexte client)
 * 3. UNVERIFIED     : Non vérifié automatiquement
 */
export const ValidationTierSchema = z.enum([
  'AUTO_VALIDATED',
  'DOC_COMPATIBLE',
  'UNVERIFIED',
]);
export type ValidationTier = z.infer<typeof ValidationTierSchema>;

/**
 * Type de validation distingué dans le rapport (§15.4) :
 * validation syntaxique, validation documentaire, validation d'exécution.
 */
export const ValidationKindSchema = z.enum([
  'SYNTACTIC',
  'DOCUMENTARY',
  'RUNTIME',
]);
export type ValidationKind = z.infer<typeof ValidationKindSchema>;

/**
 * Statut d'origine et d'adaptation d'un composant (§4.5 & §5.2) :
 * - ecc_verbatim   : Fichier ECC utilisé tel quel
 * - ecc_adapted    : Fichier ECC adapté pour Antigravity et le projet
 * - project_custom : Fichier créé spécifiquement pour le projet cible
 */
export const ComponentOriginStatusSchema = z.enum([
  'ecc_verbatim',
  'ecc_adapted',
  'project_custom',
]);
export type ComponentOriginStatus = z.infer<typeof ComponentOriginStatusSchema>;

/**
 * Tiers de modèles natifs reconnus lors de l'analyse/traduction de sources amont (ECC).
 * Note : Non inscrits dans le frontmatter YAML des sous-agents générés ; utilisés uniquement
 * pour dériver la recommandation centralisée du couple modèle/effort.
 */
export const SubagentModelTierSchema = z.enum(['inherit', 'flash', 'pro']);
export type SubagentModelTier = z.infer<typeof SubagentModelTierSchema>;

/**
 * Paliers de modèles cibles pour la gouvernance centralisée du couple Modèle / Niveau d'effort.
 */
export const RecommendedModelTierSchema = z.enum(['flash', 'pro']);
export type RecommendedModelTier = z.infer<typeof RecommendedModelTierSchema>;

/**
 * Niveaux d'effort de raisonnement recommandés (§6.3).
 * Note : Non inscrits dans le YAML des sous-agents ; enregistrés comme politique d'orchestration.
 */
export const ReasoningEffortTierSchema = z.enum(['low', 'medium', 'high']);
export type ReasoningEffortTier = z.infer<typeof ReasoningEffortTierSchema>;

/**
 * Statut de configurabilité d'un paramètre de modèle ou d'effort dans HARNESS_MANIFEST.json (§5.2).
 */
export const ConfigurabilityStatusSchema = z.enum([
  'configurable',
  'compatible',
  'seulement indicatif',
  'non vérifiable',
]);
export type ConfigurabilityStatus = z.infer<typeof ConfigurabilityStatusSchema>;

/**
 * Outils natifs autorisés dans le frontmatter `tools:` des sous-agents Markdown Antigravity.
 * Référence : https://antigravity.google/docs/subagents & ECC/scripts/lib/install/antigravity-agent.js
 */
export const ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS = [
  'view_file',
  'write_to_file',
  'replace_file_content',
  'grep_search',
  'find_by_name',
  'run_command',
  'search_web',
  'read_url_content',
] as const;

export const AntigravitySubagentToolSchema = z.enum(ANTIGRAVITY_ALLOWED_SUBAGENT_TOOLS);
export type AntigravitySubagentTool = z.infer<typeof AntigravitySubagentToolSchema>;

/**
 * Outils de mutation (interdits aux sous-agents de revue/audit indépendants selon §6.2).
 */
export const ANTIGRAVITY_MUTATION_TOOLS: ReadonlySet<AntigravitySubagentTool> = new Set([
  'write_to_file',
  'replace_file_content',
]);

/**
 * Politique d'exécution des commandes shell d'un sous-agent Antigravity.
 */
export const CommandExecutionPolicySchema = z.enum([
  'off',
  'auto',
  'eager',
  'sandbox',
]);
export type CommandExecutionPolicy = z.infer<typeof CommandExecutionPolicySchema>;

/**
 * Déclencheurs de règles Antigravity (.agents/rules/*.md).
 * Référence : https://antigravity.google/docs/rules
 */
export const RuleTriggerSchema = z.enum([
  'always_on',
  'model_decision',
  'glob',
  'manual',
]);
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;

/**
 * Constantes de budget et limites officielles Antigravity (docs/rules.md).
 */
export const ANTIGRAVITY_LIMITS = {
  /** Limite stricte par fichier de règle : 24 000 octets (24 Ko) */
  MAX_RULE_FILE_BYTES: 24_000,
  /** Budget global des règles always_on dans Antigravity : 20 000 tokens */
  OFFICIAL_ALWAYS_ON_RULES_TOKEN_BUDGET: 20_000,
  /** Seuil d'alerte/blocage conservateur appliqué par le générateur : 18 000 tokens */
  SAFE_ALWAYS_ON_RULES_TOKEN_LIMIT: 18_000,
  /** Ratio conservateur octets -> tokens (1 token ≈ 3.5 octets en Markdown technique franco-anglais) */
  BYTES_PER_TOKEN_ESTIMATE: 3.5,
} as const;

/**
 * Table de correspondance officielle Claude Code / ECC -> Google Antigravity
 */
export const CLAUDE_TO_ANTIGRAVITY_TOOL_MAP: Readonly<Record<string, AntigravitySubagentTool>> = Object.freeze({
  Read: 'view_file',
  Write: 'write_to_file',
  Edit: 'replace_file_content',
  MultiEdit: 'replace_file_content',
  Grep: 'grep_search',
  Glob: 'find_by_name',
  Bash: 'run_command',
  WebSearch: 'search_web',
  WebFetch: 'read_url_content',
});

/**
 * Table de correspondance des tiers de modèles Claude Code -> Google Antigravity
 */
export const CLAUDE_TO_ANTIGRAVITY_MODEL_MAP: Readonly<Record<string, SubagentModelTier>> = Object.freeze({
  haiku: 'flash',
  sonnet: 'pro',
  opus: 'pro',
});

/**
 * Schéma du frontmatter YAML d'une règle modulaire (.agents/rules/<name>.md)
 */
export const AntigravityRuleFrontmatterSchema = z
  .object({
    trigger: RuleTriggerSchema,
    description: z.string().min(1).optional(),
    globs: z.string().min(1).optional(),
    glob: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.trigger === 'model_decision' && (!data.description || data.description.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: "Une règle avec 'trigger: model_decision' doit obligatoirement définir un champ 'description'.",
      });
    }
    if (
      data.trigger === 'glob' &&
      (!data.globs || data.globs.trim().length === 0) &&
      (!data.glob || data.glob.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['globs'],
        message: "Une règle avec 'trigger: glob' doit obligatoirement définir un champ 'globs' (ou 'glob').",
      });
    }
  });
export type AntigravityRuleFrontmatter = z.infer<typeof AntigravityRuleFrontmatterSchema>;

/**
 * Slug kebab-case strict pour les identifiants de skills, règles et sous-agents.
 */
export const KebabSlugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Le nom doit être en kebab-case (minuscules, chiffres et tirets uniquement).");

/**
 * Schéma du frontmatter YAML d'un skill (.agents/skills/<name>/SKILL.md)
 */
export const AntigravitySkillFrontmatterSchema = z
  .object({
    name: KebabSlugSchema,
    description: z
      .string()
      .min(10, "La description d'un skill doit expliquer clairement quand et pourquoi l'activer (min 10 caractères)."),
    license: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type AntigravitySkillFrontmatter = z.infer<typeof AntigravitySkillFrontmatterSchema>;

/**
 * Schéma du frontmatter YAML d'un sous-agent (.agents/agents/<name>.md).
 * Aucun champ `model` n'est autorisé dans le YAML : le couple modèle/effort est gouverné
 * de façon centralisée par `.agents/rules/model-effort-governance.md` et `docs/ORCHESTRATION.md`.
 */
export const AntigravitySubagentFrontmatterSchema = z
  .object({
    name: KebabSlugSchema,
    description: z
      .string()
      .min(10, "La description d'un sous-agent doit permettre au planificateur de déléguer les tâches (min 10 caractères)."),
    tools: z.array(AntigravitySubagentToolSchema).default([]),
    commandExecutionPolicy: CommandExecutionPolicySchema.optional(),
    subagent: z.boolean().optional(),
    mainAgent: z.boolean().optional(),
  })
  .strict();
export type AntigravitySubagentFrontmatter = z.infer<typeof AntigravitySubagentFrontmatterSchema>;

/**
 * Résultat individuel d'un contrôle de validation (FR-09 & §15.4).
 */
export const ValidationIssueSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  code: z.string().min(1),
  message: z.string().min(1),
  filePath: z.string().optional(),
  validationKind: ValidationKindSchema,
  validationTier: ValidationTierSchema,
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
