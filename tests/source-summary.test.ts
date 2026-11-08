import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG_SOURCES, SyncedSourceSnapshot } from '../src/modules/catalog/catalog-sources';
import { summarizeSelectionBySource } from '../src/modules/selection-engine/source-summary';
import { PROJECT_CASES, fixtureExists, loadPinnedCatalog, profileFor, runSelection } from './support/catalog-fixture';

const snap = (id: string, error?: string): SyncedSourceSnapshot => {
  const s = DEFAULT_CATALOG_SOURCES.find((d) => d.id === id)!;
  return { id, name: s.name, owner: s.owner, repo: s.repo, commitSha: s.pinnedCommit, license: s.license, copyrightNotice: s.copyrightNotice, priority: s.priority, componentCount: 0, ...(error ? { error } : {}) };
};
const active = DEFAULT_CATALOG_SOURCES.map((s) => ({ id: s.id, name: s.name }));

describe.skipIf(!fixtureExists())('Bilan de la sélection par source', () => {
  const catalog = loadPinnedCatalog();
  const sepa = PROJECT_CASES.find((c) => c.id === 'sepa')!;

  it('indique, pour chaque source, ce qui est retenu et pourquoi le reste est écarté', () => {
    const selection = runSelection(profileFor(sepa), catalog, 'MINIMAL');
    const summary = summarizeSelectionBySource({ selection, catalog, syncedSources: DEFAULT_CATALOG_SOURCES.map((s) => snap(s.id)), activeSources: active });
    const byId = Object.fromEntries(summary.map((s) => [s.sourceId, s]));
    expect(byId['obra-superpowers']).toMatchObject({ status: 'OK', inCatalog: 15, selected: 13 });
    expect(byId['dietrichgebert-ponytail']!.selected).toBe(0);
    expect(byId['dietrichgebert-ponytail']!.rejections.map((r) => r.reason)).toContain('METHODOLOGY_DISABLED');
    const total = (id: string) => byId[id]!.selected + byId[id]!.rejections.reduce((n, r) => n + r.count, 0);
    for (const s of summary) expect(total(s.sourceId)).toBe(s.inCatalog);
  });

  it('signale une source active absente du catalogue, ou en échec', () => {
    const withoutComplementary = catalog.filter((c) => c.parsedMeta.sourceId === 'ecc-official');
    const selection = runSelection(profileFor(sepa), withoutComplementary, 'BALANCED');
    const summary = summarizeSelectionBySource({
      selection,
      catalog: withoutComplementary,
      syncedSources: [snap('ecc-official'), snap('cloudflare-security-audit', 'GitHub 403')],
      activeSources: active,
    });
    const byId = Object.fromEntries(summary.map((s) => [s.sourceId, s]));
    expect(byId['ecc-official']!.status).toBe('OK');
    expect(byId['obra-superpowers']!.status).toBe('MISSING');
    expect(byId['cloudflare-security-audit']).toMatchObject({ status: 'FAILED', error: 'GitHub 403' });
  });
});
