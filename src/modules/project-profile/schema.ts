import { z } from 'zod';
import { AntigravitySurfaceSchema } from '../antigravity-adapter/schema';

/**
 * Catégorie épistémique obligatoire pour chaque information du profil (§3.3 & §15.1 Jalon 3) :
 * - explicit                  : Source explicite présente dans les documents
 * - deduced                   : Interprétation accompagnée d'un niveau de confiance
 * - hypothesis                : Choix provisoire proposé à confirmer
 * - missing_or_contradictory  : Élément manquant ou contradictoire nécessitant une décision
 */
export const EpistemicStatusSchema = z.enum([
  'explicit',
  'deduced',
  'hypothesis',
  'missing_or_contradictory',
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/**
 * Référence traçable vers le document source (§7 FR-03 & §15.1 Jalon 3)
 */
export const SourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  documentName: z.string().min(1),
  location: z.string().optional(), // ex: "Section 2.1", "Page 4", "variables.css:L12"
  excerpt: z.string().optional(),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

/**
 * Enveloppe générique d'un élément de profil traçable.
 */
export function createTraceableFieldSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z
    .object({
      id: z.string().min(1),
      value: valueSchema,
      epistemicStatus: EpistemicStatusSchema,
      confidence: ConfidenceLevelSchema.optional(),
      rationale: z.string().optional(),
      sourceRefs: z.array(SourceReferenceSchema).default([]),
      userEdited: z.boolean().default(false),
    })
    .superRefine((item, ctx) => {
      if (item.epistemicStatus === 'deduced' && !item.confidence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confidence'],
          message: "Tout élément classé comme 'deduced' (déduction) doit obligatoirement inclure un niveau de confiance.",
        });
      }
    });
}

export const TraceableStringSchema = createTraceableFieldSchema(z.string().min(1));
export type TraceableString = z.infer<typeof TraceableStringSchema>;

/**
 * Fonctionnalité ou règle métier extraite avec ses critères d'acceptation.
 */
export const FeatureSpecificationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['P0', 'P1', 'P2']).default('P0'),
  businessRules: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  epistemicStatus: EpistemicStatusSchema,
  confidence: ConfidenceLevelSchema.optional(),
  sourceRefs: z.array(SourceReferenceSchema).default([]),
});
export type FeatureSpecification = z.infer<typeof FeatureSpecificationSchema>;

/**
 * Tokens et règles du Design System du projet cible (§3.3).
 */
export const DesignSystemProfileSchema = z.object({
  brandIdentity: z.string().min(1),
  colorTokens: z.record(z.string(), z.string()).default({}),
  typography: z.object({
    fontFamilies: z.record(z.string(), z.string()).default({}),
    scaleNotes: z.string().default(''),
  }),
  spacingAndLayout: z.string().default(''),
  componentGuidelines: z.array(z.string()).default([]),
  uxAndAccessibilityRules: z.array(z.string()).default([]),
  epistemicStatus: EpistemicStatusSchema.default('explicit'),
  sourceRefs: z.array(SourceReferenceSchema).default([]),
});
export type DesignSystemProfile = z.infer<typeof DesignSystemProfileSchema>;

/**
 * Hypothèse, contradiction ou information manquante explicite (§3.3 & docs/ASSUMPTIONS.md).
 */
export const UncertaintyItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['hypothesis', 'missing_information', 'contradiction']),
  topic: z.string().min(1),
  statement: z.string().min(1),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  proposedFallback: z.string().min(1),
  requiresHumanDecision: z.boolean().default(true),
  sourceRefs: z.array(SourceReferenceSchema).default([]),
});
export type UncertaintyItem = z.infer<typeof UncertaintyItemSchema>;

/**
 * Profil complet et normalisé du projet cible (§3.3 & FR-03).
 */
export const ProjectProfileSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  projectDescription: z.string().min(1),
  targetSurface: AntigravitySurfaceSchema,
  profileVersion: z.number().int().positive().default(1),

  domainAndObjective: TraceableStringSchema,
  personasAndRoles: z.array(TraceableStringSchema).min(1),
  features: z.array(FeatureSpecificationSchema).min(1),

  techStack: z.object({
    languages: z.array(z.string().min(1)).min(1),
    frameworks: z.array(z.string().min(1)).default([]),
    databases: z.array(z.string().min(1)).default([]),
    infrastructureAndDeployment: z.array(z.string().min(1)).default([]),
    testingTools: z.array(z.string().min(1)).default([]),
    epistemicStatus: EpistemicStatusSchema,
    confidence: ConfidenceLevelSchema.optional(),
    sourceRefs: z.array(SourceReferenceSchema).default([]),
  }),

  architectureConstraints: z.array(TraceableStringSchema).default([]),
  securityAndCompliance: z.array(TraceableStringSchema).default([]),
  qualityAndTestingStrategy: z.array(TraceableStringSchema).default([]),
  designSystem: DesignSystemProfileSchema,
  uncertainties: z.array(UncertaintyItemSchema).default([]),

  supplementaryNotes: z
    .object({
      deploymentConstraints: z.string().optional(),
      regulatoryRequirements: z.string().optional(),
      qualityLevel: z.string().optional(),
      costPreferences: z.string().optional(),
      teamConstraints: z.string().optional(),
    })
    .default({}),
});
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;
