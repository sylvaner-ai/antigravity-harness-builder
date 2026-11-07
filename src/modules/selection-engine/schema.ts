import { z } from 'zod';
import {
  AntigravitySurfaceSchema,
  ReasoningEffortTierSchema,
  RecommendedModelTierSchema,
} from '../antigravity-adapter/schema';

export const PresetModeSchema = z.enum(['MINIMAL', 'BALANCED', 'THOROUGH']);
export type PresetMode = z.infer<typeof PresetModeSchema>;

/**
 * Packs d'Excellence activables pour garantir zéro faille, zéro défaut visuel et rigueur absolue.
 */
export const ExcellencePackSchema = z.enum([
  'SECURITY_HARDENED',     // OWASP, Zero-Trust, Zod boundaries, requêtes paramétrées
  'DESIGN_CRAFT_POLISH',   // Règle des 5 états UI, Emil Kowalski polish, tokens stricts, WCAG AA
  'EXTREME_TDD_ANTI_BUG',  // Red-Green-Refactor, couverture >80%, checklist pré-commit
]);
export type ExcellencePack = z.infer<typeof ExcellencePackSchema>;

export const ALL_EXCELLENCE_PACKS: ExcellencePack[] = [
  'SECURITY_HARDENED',
  'DESIGN_CRAFT_POLISH',
  'EXTREME_TDD_ANTI_BUG',
];

export const ComponentOriginSchema = z.enum(['ECC_ADAPTED', 'PROJECT_CUSTOM']);
export type ComponentOrigin = z.infer<typeof ComponentOriginSchema>;

export const ComponentKindSchema = z.enum(['RULE', 'SKILL', 'SUBAGENT', 'COMMAND_CONVERTED']);
export type ComponentKind = z.infer<typeof ComponentKindSchema>;

/**
 * Score détaillé et critères ayant motivé la sélection (§7 FR-05).
 */
export const ScoreBreakdownSchema = z.object({
  totalScore: z.number().min(0).max(100),
  languageMatch: z.number().default(0),
  frameworkMatch: z.number().default(0),
  domainTagMatch: z.number().default(0),
  architectureSecurityMatch: z.number().default(0),
  coreBaseBonus: z.number().default(0),
  excellenceBonus: z.number().default(0),
  synergyBonus: z.number().default(0),
  matchingKeywords: z.array(z.string()).default([]),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

/**
 * Composant sélectionné avec justification explicite (§7 FR-05 & §15.1).
 */
export const SelectedComponentSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: ComponentKindSchema,
  origin: ComponentOriginSchema,
  description: z.string().default(''),
  sourceRelativePath: z.string().optional(),
  sourceUrl: z.string().optional(),
  license: z.string().default('MIT'),
  acceptedRationale: z.string().min(1),
  score: ScoreBreakdownSchema,
  family: z.string().optional(),
  /** Fonction remplie par le composant (ex. skill:workflow:tdd). */
  slot: z.string().optional(),
  /** Source du catalogue (catalog-sources.ts) ou 'curated'. */
  sourceId: z.string().optional(),
  /** Auteur de la source, pour l'attribution dans le harnais. */
  sourceAuthor: z.string().optional(),
  /** Méthodologie d'appartenance, le cas échéant. */
  methodology: z.enum(['superpowers', 'ponytail']).optional(),
  dependencies: z.array(z.string()).default([]),
  adaptedContent: z.string(),
  /** Fichiers d'accompagnement d'un skill (références, exemples), déjà contrôlés à l'indexation. */
  resources: z.array(z.object({ relativeSubPath: z.string(), content: z.string() })).optional(),
  recommendedModelTier: RecommendedModelTierSchema.optional(),
  recommendedEffort: ReasoningEffortTierSchema.optional(),
  userModified: z.boolean().default(false),
});
export type SelectedComponent = z.infer<typeof SelectedComponentSchema>;

/**
 * Candidat écarté avec justification (§7 FR-05).
 */
export const RejectedComponentSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: ComponentKindSchema,
  rejectedRationale: z.string().min(1),
  rejectionReason: z.enum([
    'STACK_INCOMPATIBLE',
    'SURFACE_INCOMPATIBLE',
    'SCORE_BELOW_PRESET_THRESHOLD',
    'DEDUPLICATED_FAMILY_OVERRIDDEN',
    'SECURITY_OR_SAFETY_REJECTION',
    'USER_EXCLUDED',
    'PLATFORM_SPECIFIC_OR_META',
    'NOT_APPLICABLE_TO_PROJECT',
    'NO_FUNCTIONAL_SLOT',
    'TIER_NOT_IN_PRESET',
    'METHODOLOGY_DISABLED',
  ]),
  rawScore: z.number().default(0),
  supersededBySlug: z.string().optional(),
});
export type RejectedComponent = z.infer<typeof RejectedComponentSchema>;

/**
 * Spécification d'un composant sur mesure généré pour combler un besoin non couvert par ECC.
 */
export const CustomComponentSpecSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: ComponentKindSchema,
  description: z.string().min(1),
  gapReason: z.string().min(1),
  content: z.string().min(1),
});
export type CustomComponentSpec = z.infer<typeof CustomComponentSpecSchema>;

/**
 * Résultat complet et explicable du moteur de sélection (§7 FR-05 & §11.1).
 */
export const SelectionResultSchema = z.object({
  presetMode: PresetModeSchema,
  targetSurface: AntigravitySurfaceSchema,
  excellencePacks: z.array(ExcellencePackSchema).default(ALL_EXCELLENCE_PACKS),
  selectedComponents: z.array(SelectedComponentSchema),
  rejectedComponents: z.array(RejectedComponentSchema),
  customComponents: z.array(CustomComponentSpecSchema),
  dependencyWarnings: z.array(z.string()).default([]),
  conflictWarnings: z.array(z.string()).default([]),
  totalTokensEstimated: z.number().default(0),
  budgetCompliance: z.object({
    rulesBudgetTokens: z.number(),
    rulesBudgetPercent: z.number(),
    isWithinLimit: z.boolean(),
  }),
});
export type SelectionResult = z.infer<typeof SelectionResultSchema>;
