import { z } from 'zod';
import {
  AntigravityRuleFrontmatterSchema,
  AntigravitySkillFrontmatterSchema,
  AntigravitySubagentFrontmatterSchema,
  AntigravitySurfaceSchema,
  ComponentOriginStatusSchema,
  ConfigurabilityStatusSchema,
  KebabSlugSchema,
  ReasoningEffortTierSchema,
  RecommendedModelTierSchema,
  ValidationIssueSchema,
  ValidationTierSchema,
} from '../antigravity-adapter/schema';
import { ProjectProfileSchema } from '../project-profile/schema';

/**
 * Référence de provenance d'un composant ECC (pour ECC_SOURCES.md et HARNESS_MANIFEST.json — §4.5 & §5.2).
 */
export const EccProvenanceSchema = z.object({
  repositoryUrl: z.string().url().default('https://github.com/affaan-m/ECC'),
  commitSha: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/i, 'Le commit SHA ECC doit être un identifiant hexadécimal Git valide.'),
  versionTag: z.string().min(1).default('v2.2.3'),
  sourceRelativePath: z.string().min(1),
  sourceUrl: z.string().url(),
  license: z.string().min(1).default('MIT'),
  author: z.string().min(1).default('Affaan Mustafa'),
  adaptationNotes: z.array(z.string()).default([]),
});
export type EccProvenance = z.infer<typeof EccProvenanceSchema>;

/**
 * Spécification d'une règle retenue pour le paquet (.agents/rules/<slug>.md).
 */
export const SelectedRuleSpecSchema = z.object({
  slug: KebabSlugSchema,
  title: z.string().min(1),
  frontmatter: AntigravityRuleFrontmatterSchema,
  markdownBody: z.string().min(1),
  selectionRationale: z.string().min(1),
  originStatus: ComponentOriginStatusSchema,
  eccProvenance: EccProvenanceSchema.optional(),
});
export type SelectedRuleSpec = z.infer<typeof SelectedRuleSpecSchema>;

/**
 * Fichier de ressource additionnel d'un skill (ex: references/*.md, resources/*.json).
 */
export const SkillResourceFileSchema = z.object({
  relativeSubPath: z
    .string()
    .regex(
      /^(?:(?:references|resources|examples)\/)?[a-zA-Z0-9._-]+\.(?:md|json|yaml|yml|txt|css)$/,
      "Une ressource de skill doit résider à la racine du skill ou dans references/, resources/, examples/, avec une extension sûre."
    ),
  content: z.string().min(1),
});
export type SkillResourceFile = z.infer<typeof SkillResourceFileSchema>;

/**
 * Spécification d'un skill retenu pour le paquet (.agents/skills/<slug>/SKILL.md).
 */
export const SelectedSkillSpecSchema = z.object({
  slug: KebabSlugSchema,
  frontmatter: AntigravitySkillFrontmatterSchema,
  markdownBody: z.string().min(1),
  resources: z.array(SkillResourceFileSchema).default([]),
  selectionRationale: z.string().min(1),
  originStatus: ComponentOriginStatusSchema,
  eccProvenance: EccProvenanceSchema.optional(),
});
export type SelectedSkillSpec = z.infer<typeof SelectedSkillSpecSchema>;

/**
 * Spécification d'un sous-agent retenu pour le paquet (.agents/agents/<slug>.md).
 * Le frontmatter YAML ne contient aucun champ `model` ; le couple (recommendedModelTier, recommendedEffort)
 * est piloté de manière centralisée par `.agents/rules/model-effort-governance.md` et `docs/ORCHESTRATION.md`.
 */
export const SelectedSubagentSpecSchema = z.object({
  slug: KebabSlugSchema,
  roleTitle: z.string().min(1),
  frontmatter: AntigravitySubagentFrontmatterSchema,
  markdownBody: z.string().min(1),
  isIndependentReviewer: z.boolean().default(false),
  recommendedModelTier: RecommendedModelTierSchema.default('pro'),
  recommendedEffort: ReasoningEffortTierSchema,
  qualityCostRecommendation: z.string().min(1),
  selectionRationale: z.string().min(1),
  originStatus: ComponentOriginStatusSchema,
  eccProvenance: EccProvenanceSchema.optional(),
});
export type SelectedSubagentSpec = z.infer<typeof SelectedSubagentSpecSchema>;

/**
 * Métadonnées d'un document d'entrée (sans jamais inclure son contenu confidentiel brut — §5.2).
 */
export const InputDocumentDigestSchema = z.object({
  documentId: z.string().min(1),
  role: z.enum(['SPECIFICATION', 'DESIGN_SYSTEM', 'SUPPLEMENTARY']),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
});
export type InputDocumentDigest = z.infer<typeof InputDocumentDigestSchema>;

/**
 * Entrée complète permettant au moteur déterministe (Jalon 1) de construire le paquet.
 */
export const DeterministicPackageInputSchema = z.object({
  generationId: z.string().min(1),
  generatedAtIso: z.string().datetime(),
  packageRootName: KebabSlugSchema,
  eccCommitSha: z.string().regex(/^[0-9a-f]{7,40}$/i),
  eccVersionTag: z.string().min(1).default('v2.2.3'),
  inputDocuments: z.array(InputDocumentDigestSchema).min(1),
  profile: ProjectProfileSchema,
  excellencePacks: z.array(z.string()).default([]),
  selectedRules: z.array(SelectedRuleSpecSchema).min(1),
  selectedSkills: z.array(SelectedSkillSpecSchema).min(1),
  selectedSubagents: z.array(SelectedSubagentSpecSchema).min(1),
  discardedCandidatesSummary: z
    .array(
      z.object({
        componentId: z.string().min(1),
        reason: z.string().min(1),
      })
    )
    .default([]),
});
export type DeterministicPackageInput = z.infer<typeof DeterministicPackageInputSchema>;

/**
 * Schéma machine-readable strict de `docs/HARNESS_MANIFEST.json` (§5.2 CDC).
 */
export const HarnessManifestSchema = z.object({
  manifestSchemaVersion: z.literal('1.0.0'),
  generationId: z.string().min(1),
  generatedAt: z.string().datetime(),
  packageRootName: z.string().min(1),
  targetSurface: AntigravitySurfaceSchema,
  eccReference: z.object({
    repositoryUrl: z.string().url(),
    commitSha: z.string(),
    versionTag: z.string(),
    license: z.string(),
  }),
  inputDocuments: z.array(InputDocumentDigestSchema),
  profileDigest: z.object({
    projectId: z.string(),
    projectName: z.string(),
    profileVersion: z.number(),
    profileSha256: z.string(),
  }),
  components: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['RULE', 'SKILL', 'SUBAGENT', 'CORE_DOC']),
      destinationPath: z.string(),
      originStatus: ComponentOriginStatusSchema,
      selectionRationale: z.string(),
      sourceCommitSha: z.string().optional(),
      sourceUrl: z.string().optional(),
      adaptationNotes: z.array(z.string()).default([]),
      modelPolicy: z
        .object({
          recommendedModelTier: RecommendedModelTierSchema,
          modelConfigurability: ConfigurabilityStatusSchema,
          recommendedEffort: ReasoningEffortTierSchema,
          effortConfigurability: ConfigurabilityStatusSchema,
          qualityCostRecommendation: z.string(),
        })
        .optional(),
      validationTier: ValidationTierSchema,
    })
  ),
  assumptionsAndWarnings: z.object({
    uncertaintiesCount: z.number().int().nonnegative(),
    uncertainties: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        topic: z.string(),
        statement: z.string(),
        impact: z.string(),
      })
    ),
    compatibilityWarnings: z.array(ValidationIssueSchema),
  }),
  filesInventory: z.array(
    z.object({
      relativePath: z.string(),
      sizeBytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/i),
      validationTier: ValidationTierSchema,
    })
  ),
  validationSummary: z.object({
    valid: z.boolean(),
    totalFilesCount: z.number().int().positive(),
    estimatedAlwaysOnRulesTokens: z.number().int().nonnegative(),
    alwaysOnRulesTokenLimit: z.number().int().positive(),
    syntacticChecksPassed: z.boolean(),
    documentaryChecksCount: z.number().int().nonnegative(),
    unverifiedChecksCount: z.number().int().nonnegative(),
    errorsCount: z.number().int().nonnegative(),
    warningsCount: z.number().int().nonnegative(),
    issues: z.array(ValidationIssueSchema),
  }),
});
export type HarnessManifest = z.infer<typeof HarnessManifestSchema>;
