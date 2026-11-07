import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import {
  AppDatabase,
  eccComponents,
  eccSyncs,
  getDb,
} from '../../db';
import { sanitizeErrorMessage } from '../../lib/sanitize-error';
import { extractTarGzTextFilesInMemory } from './tar-extractor';

export type EccSyncRecord = typeof eccSyncs.$inferSelect;
export type EccComponentRecord = typeof eccComponents.$inferSelect;

import { CatalogSourceConfig, DEFAULT_CATALOG_SOURCES, SyncedSourceSnapshot } from './catalog-sources';
import { buildMultiSourceCatalog, SourceSnapshot } from './catalog-builder';
import { computeSha256 } from '../package-exporter/exporter';
import { activeSourceConfigs } from './source-registry';
export { DEFAULT_CATALOG_SOURCES };
export type { CatalogSourceConfig };

import { getBuiltinCuratedExcellenceComponents } from './curated-excellence';
export { getBuiltinCuratedExcellenceComponents };

/**
 * Interface de transport permettant d'injecter un client GitHub réel ou un mock déterministe en test (FR-04).
 */
export interface EccRemoteFetcher {
  resolveRefCommitSha(owner: string, repo: string, ref: string): Promise<string>;
  downloadRepositoryTarball(owner: string, repo: string, commitSha: string): Promise<Uint8Array>;
}

/**
 * Client HTTP officiel vers GitHub API + codeload.github.com (sans scraping HTML — §4.2 CDC).
 */
export class GitHubOfficialEccFetcher implements EccRemoteFetcher {
  private readonly githubToken?: string;

  constructor(githubToken = process.env.GITHUB_TOKEN) {
    this.githubToken = githubToken && githubToken.trim() !== '' ? githubToken.trim() : undefined;
  }

  private buildHeaders(accept = 'application/vnd.github+json'): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: accept,
      'User-Agent': 'AntigravityHarnessBuilder/0.1.0',
    };
    if (this.githubToken) {
      headers.Authorization = `Bearer ${this.githubToken}`;
    }
    return headers;
  }

  async resolveRefCommitSha(owner: string, repo: string, ref: string): Promise<string> {
    if (/^[0-9a-f]{40}$/i.test(ref.trim())) {
      return ref.trim().toLowerCase();
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error (${response.status} ${response.statusText}) lors de la résolution de '${owner}/${repo}@${ref}'.`
      );
    }

    const payload = (await response.json()) as { sha?: string };
    if (!payload.sha || !/^[0-9a-f]{40}$/i.test(payload.sha)) {
      throw new Error('Réponse GitHub invalide : SHA du commit introuvable.');
    }

    return payload.sha.toLowerCase();
  }

  async downloadRepositoryTarball(
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<Uint8Array> {
    const url = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tar.gz/${encodeURIComponent(commitSha)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders('application/octet-stream'),
    });

    if (!response.ok) {
      throw new Error(
        `Échec du téléchargement du tarball GitHub (${response.status} ${response.statusText}) depuis '${url}'.`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}

export interface SearchCatalogOptions {
  eccSyncId?: string;
  kinds?: Array<'RULE' | 'SKILL' | 'SUBAGENT' | 'COMMAND_CONVERTED'>;
  query?: string;
  languages?: string[];
  frameworks?: string[];
  tags?: string[];
  onlyCompatible?: boolean;
  limit?: number;
}

/**
 * Service de gestion, synchronisation atomique et recherche du catalogue ECC (FR-04 & §4.2-4.3).
 */
export class EccCatalogService {
  private readonly db: AppDatabase;
  private readonly fetcher: EccRemoteFetcher;

  constructor(
    db: AppDatabase = getDb(),
    fetcher: EccRemoteFetcher = new GitHubOfficialEccFetcher()
  ) {
    this.db = db;
    this.fetcher = fetcher;
  }

  /**
   * Retourne le catalogue actif de référence (`isActiveCatalog = true` et `status = 'VALID'`).
   */
  async getActiveCatalogSync(): Promise<EccSyncRecord | null> {
    const [active] = await this.db
      .select()
      .from(eccSyncs)
      .where(and(eq(eccSyncs.isActiveCatalog, true), eq(eccSyncs.status, 'VALID')))
      .orderBy(desc(eccSyncs.syncedAt))
      .limit(1);

    return active ?? null;
  }

  /**
   * Synchronise le catalogue depuis les sources actives (table `catalog_sources`), chacune sur son commit figé.
   *
   * Garanties de résilience (FR-04 & §11.2) :
   * 1. Si le catalogue obtenu est identique au catalogue actif valide, celui-ci est retourné (sauf `forceResync`).
   * 2. L'échec d'une bibliothèque de base (rôle BASE_LIBRARY), un catalogue vide ou une erreur réseau sont
   *    enregistrés avec le statut `FAILED` et **ne remplacent jamais** le dernier catalogue actif valide.
   *    L'échec d'une source complémentaire est consigné dans `sources` sans bloquer la synchronisation.
   * 3. La bascule de `isActiveCatalog = true` s'effectue dans une transaction PostgreSQL atomique
   *    uniquement après validation et insertion complète des composants.
   */
  async synchronizeCatalog(options?: {
    forceResync?: boolean;
    /** Sources à synchroniser ; par défaut, les sources actives en base. */
    sources?: CatalogSourceConfig[];
    includeCuratedExcellence?: boolean;
  }): Promise<EccSyncRecord> {
    let resolvedSha = 'unknown';

    try {
      const sources = options?.sources ?? (await activeSourceConfigs(this.db));
      if (sources.length === 0) throw new Error('Aucune source active : activez au moins une source du catalogue.');

      const snapshots: SourceSnapshot[] = [];
      const synced: SyncedSourceSnapshot[] = [];
      for (const source of sources) {
        try {
          const sha = await this.fetcher.resolveRefCommitSha(source.owner, source.repo, source.pinnedCommit);
          const bytes = await this.fetcher.downloadRepositoryTarball(source.owner, source.repo, sha);
          snapshots.push({ source: { ...source, pinnedCommit: sha, ref: sha }, commitSha: sha, entries: extractTarGzTextFilesInMemory(bytes) });
          if (resolvedSha === 'unknown' && source.role === 'BASE_LIBRARY') resolvedSha = sha;
        } catch (err) {
          if (source.role === 'BASE_LIBRARY') throw err;
          synced.push({
            id: source.id, name: source.name, owner: source.owner, repo: source.repo, commitSha: source.pinnedCommit,
            license: source.license, copyrightNotice: source.copyrightNotice, priority: source.priority, componentCount: 0,
            error: sanitizeErrorMessage(err).message,
          });
        }
      }

      const built = buildMultiSourceCatalog(snapshots, { includeCurated: options?.includeCuratedExcellence === true });
      const allComponents = built.components;
      const versionTag = built.versionTag;
      if (resolvedSha === 'unknown') resolvedSha = snapshots[0]?.commitSha ?? 'unknown';

      if (!allComponents.some((c) => c.parsedMeta.sourceId && c.parsedMeta.sourceId !== 'curated')) {
        throw new Error('Aucun composant valide (règle, skill ou sous-agent) extrait des sources actives.');
      }

      for (const r of built.reports) {
        const snap = snapshots.find((s) => s.source.id === r.sourceId)!;
        synced.push({
          id: r.sourceId, name: snap.source.name, owner: snap.source.owner, repo: snap.source.repo, commitSha: r.commitSha,
          license: r.license, copyrightNotice: r.copyrightNotice, priority: snap.source.priority, componentCount: r.indexed,
        });
      }
      synced.sort((a, b) => b.priority - a.priority);

      if (!options?.forceResync) {
        const currentActive = await this.getActiveCatalogSync();
        if (currentActive && currentActive.commitSha === resolvedSha && currentActive.versionTag === versionTag) {
          return currentActive;
        }
      }

      const catalogSha256 = computeSha256(
        allComponents
          .map((c) => `${c.parsedMeta.sourceId}:${c.kind}:${c.slug}:${c.contentSha256}`)
          .sort()
          .join('\n')
      );

      // Transaction atomique : insertion du nouveau snapshot + insertion par lots des composants + bascule du catalogue actif
      const committedSync = await this.db.transaction(async (tx) => {
        const [newSync] = await tx
          .insert(eccSyncs)
          .values({
            commitSha: resolvedSha,
            versionTag,
            status: 'VALID',
            isActiveCatalog: false,
            componentCount: allComponents.length,
            catalogSha256,
            errorDetails: null,
            sources: synced,
          })
          .returning();

        if (!newSync) {
          throw new Error('Échec de création de l’entrée ecc_syncs.');
        }

        // Insertion par lots de 50 composants pour éviter de dépasser la limite de paramètres PostgreSQL
        const batchSize = 50;
        for (let i = 0; i < allComponents.length; i += batchSize) {
          const batch = allComponents.slice(i, i + batchSize);
          await tx.insert(eccComponents).values(
            batch.map((c) => ({
              eccSyncId: newSync.id,
              externalId: c.externalId,
              slug: c.slug,
              kind: c.kind,
              name: c.name,
              description: c.description,
              sourceRelativePath: c.sourceRelativePath,
              sourceUrl: c.sourceUrl,
              license: c.license,
              contentSha256: c.contentSha256,
              rawContent: c.rawContent,
              adaptedContent: c.adaptedContent,
              parsedMeta: c.parsedMeta,
              compatibilityStatus: c.compatibilityStatus,
              compatibilityIssues: c.compatibilityIssues,
              searchText: c.searchText,
            }))
          );
        }

        // Désactiver l'ancien catalogue actif et activer le nouveau de manière atomique
        await tx
          .update(eccSyncs)
          .set({ isActiveCatalog: false })
          .where(eq(eccSyncs.isActiveCatalog, true));

        const [activatedSync] = await tx
          .update(eccSyncs)
          .set({ isActiveCatalog: true })
          .where(eq(eccSyncs.id, newSync.id))
          .returning();

        return activatedSync!;
      });

      return committedSync;
    } catch (err) {
      const safeErr = sanitizeErrorMessage(err);

      // Enregistrer la tentative échouée sans jamais toucher au catalogue actif existant (FR-04)
      await this.db.insert(eccSyncs).values({
        commitSha: resolvedSha,
        versionTag: 'unknown',
        status: 'FAILED',
        isActiveCatalog: false,
        componentCount: 0,
        catalogSha256: '',
        errorDetails: {
          code: safeErr.code,
          message: safeErr.message,
        },
      });

      throw new Error(`Synchronisation du catalogue échouée : ${safeErr.message}`);
    }
  }

  /**
   * Recherche hybride (filtres de type/compatibilité + recherche lexicale et métadonnées stack)
   * dans le catalogue actif (ou dans une version spécifique `eccSyncId`).
   */
  async searchComponents(options: SearchCatalogOptions = {}): Promise<EccComponentRecord[]> {
    let targetSyncId = options.eccSyncId;
    if (!targetSyncId) {
      const active = await this.getActiveCatalogSync();
      if (!active) {
        return [];
      }
      targetSyncId = active.id;
    }

    const conditions = [eq(eccComponents.eccSyncId, targetSyncId)];

    if (options.kinds && options.kinds.length > 0) {
      conditions.push(inArray(eccComponents.kind, options.kinds));
    }

    if (options.onlyCompatible !== false) {
      conditions.push(
        inArray(eccComponents.compatibilityStatus, ['AUTO_VALIDATED', 'DOC_COMPATIBLE'])
      );
    }

    if (options.query && options.query.trim() !== '') {
      const terms = options.query
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2);
      if (terms.length > 0) {
        const termFilters = terms.map((term) => ilike(eccComponents.searchText, `%${term}%`));
        conditions.push(or(...termFilters)!);
      }
    }

    const candidates = await this.db
      .select()
      .from(eccComponents)
      .where(and(...conditions))
      .limit(options.limit ?? 250);

    // Filtrage fin en mémoire sur les langages, frameworks et tags si spécifiés
    const wantedLangs = new Set((options.languages ?? []).map((l) => l.toLowerCase()));
    const wantedFrameworks = new Set((options.frameworks ?? []).map((f) => f.toLowerCase()));
    const wantedTags = new Set((options.tags ?? []).map((t) => t.toLowerCase()));

    if (wantedLangs.size === 0 && wantedFrameworks.size === 0 && wantedTags.size === 0) {
      return candidates;
    }

    return candidates.filter((c) => {
      const meta = c.parsedMeta;
      const isCommon = meta.family === 'common';
      const matchesLang =
        wantedLangs.size > 0 && meta.languages.some((l) => wantedLangs.has(l.toLowerCase()));
      const matchesFw =
        wantedFrameworks.size > 0 &&
        meta.frameworks.some((f) => wantedFrameworks.has(f.toLowerCase()));
      const matchesTag =
        wantedTags.size > 0 && meta.tags.some((t) => wantedTags.has(t.toLowerCase()));

      return isCommon || matchesLang || matchesFw || matchesTag;
    });
  }
}
