import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { ProjectProfile } from '../modules/project-profile/schema';
import type { ValidationIssue, ValidationTier } from '../modules/antigravity-adapter/schema';
import type { HarnessManifest } from '../modules/package-exporter/schema';

/**
 * 1. Table `users` — Comptes et préférences (§12 User)
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<'USER' | 'ADMIN'>().notNull().default('USER'),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 1b. Table `sessions` — Sessions authentifiées (§12 & §14)
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
);

/**
 * 2. Table `projects` — Projets de génération (§12 Project)
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    targetSurface: text('target_surface').$type<'APP' | 'IDE' | 'CLI'>().notNull().default('IDE'),
    status: text('status').$type<'ACTIVE' | 'ARCHIVED'>().notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)]
);

/**
 * 3. Table `source_documents` — Documents importés et texte extrait (§12 SourceDocument)
 */
export const sourceDocuments = pgTable(
  'source_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<'SPECIFICATION' | 'DESIGN_SYSTEM' | 'SUPPLEMENTARY'>()
      .notNull(),
    originalName: text('original_name').notNull(),
    safeStoragePath: text('safe_storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256Hash: text('sha256_hash').notNull(),
    extractionStatus: text('extraction_status')
      .$type<'PENDING' | 'COMPLETED' | 'FAILED'>()
      .notNull()
      .default('PENDING'),
    extractedText: text('extracted_text'),
    extractionMeta: jsonb('extraction_meta')
      .$type<{
        method?: string;
        pagesCount?: number;
        warnings?: string[];
        error?: string;
      }>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('source_documents_project_id_idx').on(table.projectId)]
);

/**
 * 4. Table `project_profiles` — Profil extrait et version confirmée (§12 ProjectProfile)
 */
export const projectProfiles = pgTable(
  'project_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    status: text('status')
      .$type<'DRAFT_EXTRACTED' | 'USER_CONFIRMED'>()
      .notNull()
      .default('DRAFT_EXTRACTED'),
    profileData: jsonb('profile_data').$type<ProjectProfile>().notNull(),
    userNotes: jsonb('user_notes').$type<Record<string, string>>().notNull().default({}),
    profileSha256: text('profile_sha256').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('project_profiles_project_id_idx').on(table.projectId)]
);

/**
 * 5. Table `ecc_syncs` — Historique de synchronisation du catalogue ECC (§12 EccSync & FR-04)
 */
export const eccSyncs = pgTable(
  'ecc_syncs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    commitSha: text('commit_sha').notNull(),
    versionTag: text('version_tag').notNull(),
    status: text('status')
      .$type<'IN_PROGRESS' | 'VALID' | 'FAILED'>()
      .notNull()
      .default('IN_PROGRESS'),
    isActiveCatalog: boolean('is_active_catalog').notNull().default(false),
    componentCount: integer('component_count').notNull().default(0),
    catalogSha256: text('catalog_sha256').notNull().default(''),
    errorDetails: jsonb('error_details')
      .$type<{ code?: string; message?: string } | null>()
      .default(null),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('ecc_syncs_active_idx').on(table.isActiveCatalog)]
);

/**
 * Métadonnées structurées d'un composant ECC indexé.
 */
export interface EccComponentParsedMeta {
  family?: string; // ex: 'common', 'typescript', 'python', 'security', 'backend', etc.
  tags: string[];
  languages: string[];
  frameworks: string[];
  rawTools?: string[];
  adaptedTools?: string[];
  rawModel?: string;
  adaptedModel?: 'inherit' | 'flash' | 'pro';
  recommendedRuleTrigger?: 'always_on' | 'model_decision' | 'glob' | 'manual';
  recommendedRuleGlobs?: string;
  dependencies: string[];
  hasResources: boolean;
  resourcesList: Array<{ relativeSubPath: string; content: string; sha256: string }>;
  skippedUnsafeFiles: string[];
  adaptationNotes: string[];
}

/**
 * 6. Table `ecc_components` — Composants indexés depuis ECC avec provenance et compatibilité (§12 EccComponent)
 */
export const eccComponents = pgTable(
  'ecc_components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eccSyncId: uuid('ecc_sync_id')
      .notNull()
      .references(() => eccSyncs.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(), // ex: "rule:common-coding-style", "skill:backend-patterns", "subagent:architect"
    slug: text('slug').notNull(),
    kind: text('kind')
      .$type<'RULE' | 'SKILL' | 'SUBAGENT' | 'COMMAND_CONVERTED'>()
      .notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    sourceRelativePath: text('source_relative_path').notNull(),
    sourceUrl: text('source_url').notNull(),
    license: text('license').notNull().default('MIT'),
    contentSha256: text('content_sha256').notNull(),
    rawContent: text('raw_content').notNull(),
    adaptedContent: text('adapted_content').notNull(),
    parsedMeta: jsonb('parsed_meta').$type<EccComponentParsedMeta>().notNull(),
    compatibilityStatus: text('compatibility_status')
      .$type<ValidationTier | 'INCOMPATIBLE'>()
      .notNull(),
    compatibilityIssues: jsonb('compatibility_issues')
      .$type<ValidationIssue[]>()
      .notNull()
      .default([]),
    searchText: text('search_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ecc_components_sync_external_idx').on(table.eccSyncId, table.externalId),
    index('ecc_components_sync_kind_idx').on(table.eccSyncId, table.kind),
  ]
);

/**
 * 7. Table `harness_generations` — Historique des générations de harnais (§12 HarnessGeneration)
 */
export const harnessGenerations = pgTable(
  'harness_generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    projectProfileId: uuid('project_profile_id')
      .notNull()
      .references(() => projectProfiles.id, { onDelete: 'restrict' }),
    eccSyncId: uuid('ecc_sync_id')
      .notNull()
      .references(() => eccSyncs.id, { onDelete: 'restrict' }),
    status: text('status')
      .$type<'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED'>()
      .notNull()
      .default('PENDING'),
    presetMode: text('preset_mode')
      .$type<'BALANCED' | 'MINIMAL' | 'THOROUGH'>()
      .notNull()
      .default('BALANCED'),
    selectionState: jsonb('selection_state').$type<Record<string, unknown>>().notNull().default({}),
    orchestrationPlan: jsonb('orchestration_plan')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    validationReport: jsonb('validation_report').$type<HarnessManifest['validationSummary'] | null>().default(null),
    manifestData: jsonb('manifest_data').$type<HarnessManifest | null>().default(null),
    zipStoragePath: text('zip_storage_path'),
    zipSha256: text('zip_sha256'),
    llmTokensUsed: integer('llm_tokens_used').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('harness_generations_project_id_idx').on(table.projectId)]
);

/**
 * 8. Table `generated_artifacts` — Fichiers générés associés à une génération (§12 GeneratedArtifact)
 */
export const generatedArtifacts = pgTable(
  'generated_artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => harnessGenerations.id, { onDelete: 'cascade' }),
    relativePath: text('relative_path').notNull(),
    artifactType: text('artifact_type')
      .$type<'START_HERE' | 'AGENTS_MD' | 'DOC' | 'RULE' | 'SKILL' | 'SUBAGENT' | 'MANIFEST'>()
      .notNull(),
    originStatus: text('origin_status')
      .$type<'ecc_verbatim' | 'ecc_adapted' | 'project_custom'>()
      .notNull(),
    sourceEccComponentId: uuid('source_ecc_component_id').references(() => eccComponents.id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256Hash: text('sha256_hash').notNull(),
    validationTier: text('validation_tier').$type<ValidationTier>().notNull(),
    validationIssues: jsonb('validation_issues').$type<ValidationIssue[]>().notNull().default([]),
  },
  (table) => [index('generated_artifacts_generation_id_idx').on(table.generationId)]
);

/**
 * 9. Table `jobs` — File de tâches persistante adossée à PostgreSQL (§8.2 & §12 Job)
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id').references(() => harnessGenerations.id, {
      onDelete: 'cascade',
    }),
    type: text('type')
      .$type<'DOCUMENT_EXTRACT' | 'PROFILE_ANALYZE' | 'ECC_SYNC' | 'HARNESS_GENERATE'>()
      .notNull(),
    status: text('status')
      .$type<'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED'>()
      .notNull()
      .default('QUEUED'),
    currentStep: text('current_step').notNull().default('INITIALIZED'),
    progressPercent: integer('progress_percent').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    checkpointData: jsonb('checkpoint_data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    safeError: jsonb('safe_error')
      .$type<{ code: string; message: string; occurredAt: string } | null>()
      .default(null),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    runAfter: timestamp('run_after', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('jobs_status_run_after_idx').on(table.status, table.runAfter)]
);
