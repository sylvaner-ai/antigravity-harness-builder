import { and, asc, eq } from 'drizzle-orm';
import { AppDatabase, catalogSources, catalogComponents, catalogSyncs } from '../../db';
import { buildMultiSourceCatalog } from './catalog-builder';
import {
  CatalogSourceAnalysis,
  CatalogSourceCategory,
  CatalogSourceConfig,
  CatalogSourceRole,
  DEFAULT_CATALOG_SOURCES,
} from './catalog-sources';
import { CLAUDE_SPECIFIC_THRESHOLD } from './content-safety';
import { classifyComponent } from '../selection-engine/component-classifier';
import type { CatalogFetcher } from './catalog-service';
import { TarFileEntry, extractTarGzTextFilesInMemory } from './tar-extractor';

export type CatalogSourceRecord = typeof catalogSources.$inferSelect;

/**
 * Registre des sources du catalogue, en base. Cycle de vie d'une source :
 * ajout (PENDING, analysée aussitôt) → activation (ACTIVE, si l'analyse est favorable) → désactivation (DISABLED).
 * Changer le commit figé repasse la source en PENDING : elle doit être réanalysée avant de revenir au catalogue.
 */

/** Accepte « owner/repo », « https://github.com/owner/repo » (avec ou sans .git, /tree/…). */
export function parseGitHubRepository(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\/+$/, '');
  const m =
    trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:\/.*)?$/i) ??
    trimmed.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?$/);
  if (!m || m[2] === '.' || m[2] === '..') {
    throw new Error('Dépôt GitHub non reconnu : indiquez « propriétaire/dépôt » ou l’adresse https://github.com/propriétaire/dépôt.');
  }
  return { owner: m[1]!, repo: m[2]! };
}

export function sourceIdFor(owner: string, repo: string): string {
  return `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Amorce une base vide avec les sources de référence, déjà vérifiées (licence et contenu sur leur commit figé). */
export async function ensureDefaultSources(db: AppDatabase): Promise<void> {
  const [any] = await db.select({ id: catalogSources.id }).from(catalogSources).limit(1);
  if (any) return;
  await db
    .insert(catalogSources)
    .values(
      DEFAULT_CATALOG_SOURCES.map((s) => ({
        id: s.id,
        name: s.name,
        owner: s.owner,
        repo: s.repo,
        pinnedCommit: s.pinnedCommit,
        license: s.license,
        role: s.role,
        priority: s.priority,
        category: s.category,
        tags: s.tags,
        copyrightNotice: s.copyrightNotice,
        nativeInstall: s.nativeInstall ?? null,
        status: s.enabled ? ('ACTIVE' as const) : ('DISABLED' as const),
      }))
    )
    .onConflictDoNothing();
}

export async function listCatalogSources(db: AppDatabase): Promise<CatalogSourceRecord[]> {
  await ensureDefaultSources(db);
  return db.select().from(catalogSources).orderBy(asc(catalogSources.createdAt), asc(catalogSources.id));
}

export function toSourceConfig(row: CatalogSourceRecord): CatalogSourceConfig {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    repo: row.repo,
    pinnedCommit: row.pinnedCommit,
    ref: row.pinnedCommit,
    license: row.license,
    role: row.role,
    priority: row.priority,
    category: row.category,
    tags: row.tags,
    copyrightNotice: row.copyrightNotice,
    nativeInstall: row.nativeInstall ?? undefined,
    enabled: row.status === 'ACTIVE',
  };
}

/** Sources actives, par priorité décroissante : celles que la synchronisation intègre au catalogue. */
export async function activeSourceConfigs(db: AppDatabase): Promise<CatalogSourceConfig[]> {
  const rows = await listCatalogSources(db);
  return rows
    .filter((r) => r.status === 'ACTIVE')
    .map(toSourceConfig)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Analyse pure d'une source sur son archive : licence, composants détectables, sûreté et doublons avec les
 * composants déjà fournis par les autres sources actives (`existingKeys` = `kind:slug`).
 */
export function analyzeSourceEntries(
  source: CatalogSourceConfig,
  commitSha: string,
  entries: readonly TarFileEntry[],
  existingKeys: ReadonlySet<string>,
  now: Date = new Date()
): CatalogSourceAnalysis {
  const built = buildMultiSourceCatalog([{ source, commitSha, entries }], { includeCurated: false });
  const report = built.reports[0]!;
  const counts = { RULE: 0, SKILL: 0, SUBAGENT: 0, COMMAND_CONVERTED: 0 };
  const duplicates: string[] = [];
  let usable = 0;
  let autoSelectable = 0;
  let safetyWarnings = 0;
  let claudeSpecific = 0;

  for (const c of built.components) {
    counts[c.kind]++;
    const key = `${c.kind}:${c.slug}`;
    const duplicate = existingKeys.has(key);
    if (duplicate) duplicates.push(key);
    if ((c.parsedMeta.safetyWarnings ?? []).length > 0) safetyWarnings++;
    if ((c.parsedMeta.claudeReferences ?? 0) >= CLAUDE_SPECIFIC_THRESHOLD) claudeSpecific++;
    if (!duplicate && c.compatibilityStatus !== 'INCOMPATIBLE') {
      usable++;
      const cls = classifyComponent(c);
      if (cls.slot && !cls.exclusion) autoSelectable++;
    }
  }

  const redistributable = report.license !== 'UNKNOWN' && built.components.every((c) => !c.compatibilityIssues.some((i) => i.code === 'LICENSE_NOT_REDISTRIBUTABLE'));
  const reasons: string[] = [];
  if (!redistributable) reasons.push(`Licence « ${report.license} » non reconnue comme permissive : ses composants ne peuvent pas être copiés dans un harnais.`);
  if (built.components.length === 0) reasons.push('Aucun composant détectable (règles, skills ou sous-agents) dans ce dépôt.');
  else if (usable === 0) reasons.push('Aucun composant utilisable : tous sont incompatibles, bloqués ou déjà fournis par une autre source.');

  return {
    analyzedAt: now.toISOString(),
    commitSha,
    license: report.license,
    redistributable,
    copyrightNotice: report.copyrightNotice,
    counts,
    usable,
    autoSelectable,
    blockedUnsafe: report.blockedUnsafe,
    safetyWarnings,
    duplicates,
    claudeSpecific,
    verdict: reasons.length === 0 ? 'READY' : 'BLOCKED',
    reasons,
  };
}

/** `kind:slug` des composants du catalogue actif, hors ceux de la source analysée. */
async function activeCatalogKeys(db: AppDatabase, excludeSourceId: string): Promise<Set<string>> {
  const [active] = await db
    .select({ id: catalogSyncs.id })
    .from(catalogSyncs)
    .where(and(eq(catalogSyncs.isActiveCatalog, true), eq(catalogSyncs.status, 'VALID')))
    .limit(1);
  if (!active) return new Set();
  const rows = await db
    .select({ kind: catalogComponents.kind, slug: catalogComponents.slug, parsedMeta: catalogComponents.parsedMeta })
    .from(catalogComponents)
    .where(eq(catalogComponents.catalogSyncId, active.id));
  return new Set(rows.filter((r) => r.parsedMeta.sourceId !== excludeSourceId).map((r) => `${r.kind}:${r.slug}`));
}

async function getSource(db: AppDatabase, id: string): Promise<CatalogSourceRecord> {
  const [row] = await db.select().from(catalogSources).where(eq(catalogSources.id, id)).limit(1);
  if (!row) throw new Error('Source introuvable.');
  return row;
}

/** Télécharge la source sur son commit figé, l'analyse et enregistre le résultat. */
export async function analyzeCatalogSource(db: AppDatabase, fetcher: CatalogFetcher, id: string): Promise<CatalogSourceRecord> {
  const row = await getSource(db, id);
  const bytes = await fetcher.downloadRepositoryTarball(row.owner, row.repo, row.pinnedCommit);
  const analysis = analyzeSourceEntries(
    toSourceConfig(row),
    row.pinnedCommit,
    extractTarGzTextFilesInMemory(bytes),
    await activeCatalogKeys(db, row.id)
  );
  const [updated] = await db
    .update(catalogSources)
    .set({
      analysis,
      license: analysis.license,
      copyrightNotice: analysis.copyrightNotice || row.copyrightNotice,
      updatedAt: new Date(),
    })
    .where(eq(catalogSources.id, id))
    .returning();
  return updated!;
}

export interface NewSourceInput {
  repository: string;
  /** Branche, étiquette ou SHA ; résolu en SHA complet et figé. Par défaut : la branche principale. */
  ref?: string;
  role?: CatalogSourceRole;
  priority?: number;
  category?: CatalogSourceCategory;
}

/** Enregistre un nouveau dépôt (statut PENDING) et l'analyse aussitôt. */
export async function addCatalogSource(db: AppDatabase, fetcher: CatalogFetcher, input: NewSourceInput): Promise<CatalogSourceRecord> {
  await ensureDefaultSources(db);
  const { owner, repo } = parseGitHubRepository(input.repository);
  const id = sourceIdFor(owner, repo);
  const existing = await db.select({ id: catalogSources.id }).from(catalogSources).where(eq(catalogSources.id, id)).limit(1);
  if (existing.length > 0) throw new Error(`Le dépôt ${owner}/${repo} est déjà enregistré.`);

  const commit = await fetcher.resolveRefCommitSha(owner, repo, input.ref?.trim() || 'HEAD');
  await db.insert(catalogSources).values({
    id,
    name: `${owner}/${repo}`,
    owner,
    repo,
    pinnedCommit: commit,
    role: input.role ?? 'SPECIALIST',
    priority: input.priority ?? 70,
    category: input.category ?? 'QUALITY',
    status: 'PENDING',
  });
  return analyzeCatalogSource(db, fetcher, id);
}

/** Fige la source sur un autre commit : elle repasse en attente et doit être réanalysée puis réactivée. */
export async function repinCatalogSource(db: AppDatabase, fetcher: CatalogFetcher, id: string, ref: string): Promise<CatalogSourceRecord> {
  const row = await getSource(db, id);
  const commit = await fetcher.resolveRefCommitSha(row.owner, row.repo, ref.trim());
  if (commit === row.pinnedCommit) return row;
  await db
    .update(catalogSources)
    .set({ pinnedCommit: commit, status: 'PENDING', analysis: null, updatedAt: new Date() })
    .where(eq(catalogSources.id, id));
  return analyzeCatalogSource(db, fetcher, id);
}

/** Active ou désactive une source. L'activation exige une analyse favorable faite sur le commit figé. */
export async function setCatalogSourceStatus(db: AppDatabase, id: string, status: 'ACTIVE' | 'DISABLED'): Promise<CatalogSourceRecord> {
  const row = await getSource(db, id);
  if (status === 'ACTIVE') {
    // Les sources de référence amorcées sans analyse ont été vérifiées sur leur commit figé.
    const isUnchangedDefault = DEFAULT_CATALOG_SOURCES.some((d) => d.id === row.id && d.pinnedCommit === row.pinnedCommit);
    if (!isUnchangedDefault) {
      if (!row.analysis || row.analysis.commitSha !== row.pinnedCommit) throw new Error('Analysez la source sur son commit figé avant de l’activer.');
      if (row.analysis.verdict !== 'READY') throw new Error(`Activation refusée : ${row.analysis.reasons.join(' ')}`);
    }
  }
  const [updated] = await db
    .update(catalogSources)
    .set({ status, updatedAt: new Date() })
    .where(eq(catalogSources.id, id))
    .returning();
  return updated!;
}

/** Supprime une source qui n'est pas active (ses composants déjà synchronisés restent dans les catalogues passés). */
export async function deleteCatalogSource(db: AppDatabase, id: string): Promise<void> {
  const row = await getSource(db, id);
  if (row.status === 'ACTIVE') throw new Error('Désactivez la source avant de la supprimer.');
  await db.delete(catalogSources).where(eq(catalogSources.id, id));
}
