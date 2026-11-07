import { describe, expect, it } from 'vitest';
import { resolveComponentProvenance } from '../src/modules/catalog/catalog-sources';
import { buildDeterministicHarnessPackage } from '../src/modules/package-exporter/exporter';
import { parseHarnessManifest } from '../src/modules/package-exporter/schema';
import { createSampleDeterministicInput } from './fixtures';

const snapshot = {
  id: 'jeanne-skills',
  name: 'jeanne/skills',
  owner: 'jeanne',
  repo: 'skills',
  commitSha: 'c'.repeat(40),
  license: 'Apache-2.0',
  copyrightNotice: 'Copyright (c) 2025-2026 Jeanne Martin',
  priority: 70,
  componentCount: 4,
};

describe('Provenance multi-sources', () => {
  it('prend le dépôt, le commit, la licence et l’auteur dans la source qui a fourni le composant', () => {
    const p = resolveComponentProvenance({ sourceId: 'jeanne-skills' }, [snapshot]);
    expect(p).toEqual({
      repositoryUrl: 'https://github.com/jeanne/skills',
      commitSha: 'c'.repeat(40),
      author: 'Jeanne Martin',
      license: 'Apache-2.0',
      curated: false,
    });
  });

  it('ne rattache jamais un composant curated à un commit amont', () => {
    expect(resolveComponentProvenance({ sourceId: 'curated' }, [snapshot]).commitSha).toBeUndefined();
  });
});

describe('Manifeste 2.0.0', () => {
  const pkg = buildDeterministicHarnessPackage(createSampleDeterministicInput());

  it('décrit chaque source du catalogue avec le nombre de composants retenus', () => {
    expect(pkg.manifest.manifestSchemaVersion).toBe('2.0.0');
    expect(pkg.manifest.catalog.sources[0]).toMatchObject({ id: 'ecc-official', commitSha: expect.stringMatching(/^[0-9a-f]{40}$/), selectedComponents: 3 });
    expect(pkg.manifest.components.every((c) => !String(c.originStatus).startsWith('ecc_'))).toBe(true);
  });

  it('SOURCES.md remplace ECC_SOURCES.md et liste les sources', () => {
    const paths = pkg.files.map((f) => f.relativePath);
    expect(paths).toContain('docs/SOURCES.md');
    expect(paths).not.toContain('docs/ECC_SOURCES.md');
    const md = pkg.files.find((f) => f.relativePath === 'docs/SOURCES.md')!.content;
    expect(md).toContain('| Everything Claude Code (ECC) | [https://github.com/affaan-m/ECC]');
  });

  it('relit un manifeste 1.0.0 (référence ECC unique) en le convertissant', () => {
    const legacy = JSON.parse(JSON.stringify(pkg.manifest));
    delete legacy.catalog;
    legacy.manifestSchemaVersion = '1.0.0';
    legacy.eccReference = { repositoryUrl: 'https://github.com/affaan-m/ECC', commitSha: 'a'.repeat(40), versionTag: 'v2', license: 'MIT' };
    legacy.components = legacy.components.map((c: { originStatus: string }) => ({ ...c, originStatus: c.originStatus.replace('source_', 'ecc_') }));
    const m = parseHarnessManifest(legacy);
    expect(m.catalog.sources[0]?.commitSha).toBe('a'.repeat(40));
    expect(m.components.some((c) => c.originStatus === 'source_adapted')).toBe(true);
  });
});
