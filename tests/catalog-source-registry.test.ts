import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { catalogSources, closeDbPool, eccSyncs, getDb } from '../src/db';
import { EccCatalogService, EccRemoteFetcher } from '../src/modules/ecc-catalog/catalog-service';
import { DEFAULT_CATALOG_SOURCES } from '../src/modules/ecc-catalog/catalog-sources';
import {
  addCatalogSource,
  analyzeSourceEntries,
  deleteCatalogSource,
  ensureDefaultSources,
  parseGitHubRepository,
  repinCatalogSource,
  setCatalogSourceStatus,
} from '../src/modules/ecc-catalog/source-registry';
import { buildSyntheticTarGz } from './support/synthetic-tar';

const MIT = 'MIT License\n\nCopyright (c) 2026 Jeanne Martin\n\nPermission is hereby granted, free of charge, to any person obtaining a copy';
const skill = (name: string, description: string) => ({
  path: `root/skills/${name}/SKILL.md`,
  content: `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nContenu du skill.\n`,
});

describe('Analyse d’une source (sans réseau)', () => {
  const source = { ...DEFAULT_CATALOG_SOURCES[1]!, id: 'test-source', priority: 70 };
  const entries = (license: string) => [
    { relativePath: 'LICENSE', content: license, sizeBytes: license.length },
    ...[skill('tdd-workflow', 'Cycle TDD'), skill('outil-maison', 'Outil sans fonction connue')].map((f) => ({
      relativePath: f.path.replace(/^root\//, ''),
      content: f.content,
      sizeBytes: f.content.length,
    })),
  ];

  it('compte les composants, repère les noms déjà fournis et lit l’auteur de la licence', () => {
    const a = analyzeSourceEntries(source, 'c'.repeat(40), entries(MIT), new Set(['SKILL:tdd-workflow']));
    expect(a.verdict).toBe('READY');
    expect(a.license).toBe('MIT');
    expect(a.copyrightNotice).toBe('Copyright (c) 2026 Jeanne Martin');
    expect(a.counts.SKILL).toBe(2);
    expect(a.duplicates).toEqual(['SKILL:tdd-workflow']);
    expect(a.usable).toBe(1);
  });

  it('refuse une licence non permissive', () => {
    const a = analyzeSourceEntries(source, 'c'.repeat(40), entries('Tous droits réservés.'), new Set());
    expect(a.verdict).toBe('BLOCKED');
    expect(a.redistributable).toBe(false);
    expect(a.reasons[0]).toMatch(/Licence « UNKNOWN »/);
  });

  it('lit les adresses de dépôt usuelles et refuse le reste', () => {
    expect(parseGitHubRepository('https://github.com/obra/superpowers.git')).toEqual({ owner: 'obra', repo: 'superpowers' });
    expect(parseGitHubRepository('cloudflare/security-audit-skill')).toEqual({ owner: 'cloudflare', repo: 'security-audit-skill' });
    expect(parseGitHubRepository('https://github.com/a/b/tree/main/skills')).toEqual({ owner: 'a', repo: 'b' });
    expect(() => parseGitHubRepository('https://gitlab.com/a/b')).toThrow(/non reconnu/);
    expect(() => parseGitHubRepository('../etc/passwd')).toThrow(/non reconnu/);
  });
});

describe('Cycle de vie d’une source en base', () => {
  const db = getDb();
  const owner = `test-${crypto.randomUUID().slice(0, 8)}`;
  const id = `${owner}-skills`;
  const commits = { HEAD: 'a'.repeat(40), v2: 'b'.repeat(40) } as Record<string, string>;
  let license = MIT;
  const fetcher: EccRemoteFetcher = {
    async resolveRefCommitSha(_o, _r, ref) {
      return commits[ref] ?? ref;
    },
    async downloadRepositoryTarball() {
      return buildSyntheticTarGz([{ path: 'root/LICENSE', content: license }, skill('mon-skill', 'Un skill')]);
    },
  };
  const syncIds: string[] = [];

  beforeAll(async () => {
    await ensureDefaultSources(db);
  });

  afterAll(async () => {
    await db.delete(catalogSources).where(eq(catalogSources.id, id));
    if (syncIds.length) await db.delete(eccSyncs).where(inArray(eccSyncs.id, syncIds));
    await closeDbPool();
  });

  it('amorce les sources de référence, actives', async () => {
    const rows = await db.select().from(catalogSources).where(inArray(catalogSources.id, DEFAULT_CATALOG_SOURCES.map((s) => s.id)));
    expect(rows).toHaveLength(DEFAULT_CATALOG_SOURCES.length);
  });

  it('ajoute un dépôt en attente, l’analyse, puis n’autorise l’activation qu’avec une analyse favorable', async () => {
    const added = await addCatalogSource(db, fetcher, { repository: `https://github.com/${owner}/skills` });
    expect(added.id).toBe(id);
    expect(added.status).toBe('PENDING');
    expect(added.pinnedCommit).toBe(commits.HEAD);
    expect(added.analysis?.verdict).toBe('READY');
    expect(added.copyrightNotice).toBe('Copyright (c) 2026 Jeanne Martin');
    await expect(addCatalogSource(db, fetcher, { repository: `${owner}/skills` })).rejects.toThrow(/déjà enregistré/);

    expect((await setCatalogSourceStatus(db, id, 'ACTIVE')).status).toBe('ACTIVE');
    await expect(deleteCatalogSource(db, id)).rejects.toThrow(/Désactivez/);
  });

  it('un changement de commit repasse la source en attente ; une analyse défavorable bloque l’activation', async () => {
    license = 'Licence propriétaire.';
    const repinned = await repinCatalogSource(db, fetcher, id, 'v2');
    expect(repinned.pinnedCommit).toBe(commits.v2);
    expect(repinned.status).toBe('PENDING');
    expect(repinned.analysis?.verdict).toBe('BLOCKED');
    await expect(setCatalogSourceStatus(db, id, 'ACTIVE')).rejects.toThrow(/Activation refusée/);
    license = MIT;
  });

  it('la synchronisation consigne les sources réellement intégrées, avec auteur et commit', async () => {
    const [row] = await db.select().from(catalogSources).where(eq(catalogSources.id, id));
    const service = new EccCatalogService(db, fetcher);
    const sync = await service.synchronizeCatalog({
      forceResync: true,
      sources: [{ ...DEFAULT_CATALOG_SOURCES[0]!, id, owner, repo: 'skills', pinnedCommit: row!.pinnedCommit, role: 'BASE_LIBRARY' }],
    });
    syncIds.push(sync.id);
    expect(sync.sources).toEqual([
      expect.objectContaining({ id, owner, repo: 'skills', commitSha: commits.v2, license: 'MIT', componentCount: 1 }),
    ]);
    const comps = await service.searchComponents({ eccSyncId: sync.id });
    expect(comps[0]?.parsedMeta.sourceAuthor).toBe('Jeanne Martin');
  });
});
