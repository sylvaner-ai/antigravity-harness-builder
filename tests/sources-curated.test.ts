import { describe, it, expect } from 'vitest';
import { renderSourcesMarkdown } from '../src/modules/package-exporter/templates';
import { GENERATOR_REPOSITORY_URL } from '../src/modules/catalog/catalog-sources';

describe('SOURCES.md : composants curated', () => {
  it("n'affiche pas de chemin amont pour un composant curated", () => {
    const md = renderSourcesMarkdown({
      catalog: { versionTag: 'v1', sources: [] },
      selectedRules: [
        {
          slug: 'api-security-guards',
          title: 'API',
          frontmatter: { trigger: 'always_on', description: 'd' },
          markdownBody: 'x',
          selectionRationale: 'r',
          originStatus: 'source_adapted',
          provenance: {
            repositoryUrl: GENERATOR_REPOSITORY_URL,
            sourceRelativePath: 'rules/security/api-security-guards.md',
            sourceUrl: 'https://github.com/OWASP/CheatSheetSeries',
            license: 'MIT',
            author: 'Antigravity Harness Builder (composant curated)',
            adaptationNotes: [],
          },
        },
      ],
      selectedSkills: [],
      selectedSubagents: [],
      discardedCandidatesSummary: [],
    } as never);
    const row = md.split('\n').find((l) => l.includes('api-security-guards.md`'))!;
    expect(row).toContain('Composant curated');
    expect(row).toContain('inspiration');
    expect(row).toContain('`project_custom`');
    expect(row).not.toContain('rules/security/api-security-guards.md](');
  });
});
