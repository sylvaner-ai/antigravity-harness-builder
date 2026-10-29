import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import {
  AppDatabase,
  eccComponents,
  eccSyncs,
  getDb,
} from '../../db';
import { sanitizeErrorMessage } from '../jobs-observability/job-queue';
import { extractTarGzTextFilesInMemory } from './tar-extractor';
import { parseAndQualifyEccRepositoryEntries } from './indexer';

export type EccSyncRecord = typeof eccSyncs.$inferSelect;
export type EccComponentRecord = typeof eccComponents.$inferSelect;

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
   * Synchronise le catalogue ECC depuis la source officielle (ou une référence/commit donné).
   *
   * Garanties de résilience (FR-04 & §11.2) :
   * 1. Si le commit demandé est déjà le catalogue actif valide, le retourne immédiatement (cache SHA).
   * 2. Toute erreur réseau, tarball corrompu ou catalogue vide est enregistrée avec le statut `FAILED`
   *    et **ne remplace jamais** le dernier catalogue actif valide.
   * 3. La bascule de `isActiveCatalog = true` s'effectue dans une transaction PostgreSQL atomique
   *    uniquement après validation et insertion complète des composants.
   */
  async synchronizeCatalog(options?: {
    owner?: string;
    repo?: string;
    ref?: string;
    forceResync?: boolean;
    includeEmilKowalskiSkills?: boolean;
  }): Promise<EccSyncRecord> {
    const owner = options?.owner ?? process.env.ECC_REPO_OWNER ?? 'affaan-m';
    const repo = options?.repo ?? process.env.ECC_REPO_NAME ?? 'ECC';
    const ref = options?.ref ?? process.env.ECC_DEFAULT_REF ?? 'main';

    let resolvedSha = ref;

    try {
      resolvedSha = await this.fetcher.resolveRefCommitSha(owner, repo, ref);

      if (!options?.forceResync) {
        const currentActive = await this.getActiveCatalogSync();
        if (currentActive && currentActive.commitSha === resolvedSha) {
          return currentActive;
        }
      }

      const tarGzBytes = await this.fetcher.downloadRepositoryTarball(owner, repo, resolvedSha);
      const entries = extractTarGzTextFilesInMemory(tarGzBytes);

      if (entries.length === 0) {
        throw new Error(
          'Catalogue ECC vide ou structure du dépôt incompatible : aucun fichier pertinent trouvé dans le tarball.'
        );
      }

      const parsedCatalog = parseAndQualifyEccRepositoryEntries(
        entries,
        resolvedSha,
        `https://github.com/${owner}/${repo}`
      );

      if (parsedCatalog.components.length === 0) {
        throw new Error(
          'Aucun composant valide (règle, skill ou sous-agent) extrait du tarball ECC.'
        );
      }

      // Téléchargement et qualification complémentaire des skills de Design Engineering (emilkowalski/skills)
      const allComponents = [...parsedCatalog.components];
      let versionTag = parsedCatalog.versionTag;

      if (options?.includeEmilKowalskiSkills) {
        try {
          const emilSha = await this.fetcher.resolveRefCommitSha('emilkowalski', 'skills', 'main');
          const emilBytes = await this.fetcher.downloadRepositoryTarball('emilkowalski', 'skills', emilSha);
          const emilEntries = extractTarGzTextFilesInMemory(emilBytes);
          const emilParsed = parseAndQualifyEccRepositoryEntries(
            emilEntries,
            emilSha,
            'https://github.com/emilkowalski/skills'
          );

          for (const comp of emilParsed.components) {
            comp.parsedMeta.tags.push('design-engineering', 'ui-polish', 'animation', 'emil-kowalski');
            if (!comp.parsedMeta.frameworks.includes('react')) comp.parsedMeta.frameworks.push('react');
            if (!comp.parsedMeta.frameworks.includes('nextjs')) comp.parsedMeta.frameworks.push('nextjs');
            if (!comp.parsedMeta.languages.includes('typescript')) comp.parsedMeta.languages.push('typescript');
            if (!comp.parsedMeta.languages.includes('javascript')) comp.parsedMeta.languages.push('javascript');

            if (!allComponents.some((c) => c.slug === comp.slug)) {
              allComponents.push(comp);
            }
          }
          versionTag = `${parsedCatalog.versionTag} + emilkowalski/skills@${emilSha.slice(0, 7)}`;
        } catch (emilErr) {
          console.warn('Note : synchronisation complémentaire de emilkowalski/skills ignorée :', emilErr);
        }
      }

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
            catalogSha256: parsedCatalog.catalogSha256,
            errorDetails: null,
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

      throw new Error(`Synchronisation ECC échouée : ${safeErr.message}`);
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
