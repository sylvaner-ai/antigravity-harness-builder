import { describe, it, expect } from 'vitest';
import { renderEccSourcesMarkdown } from '../src/modules/package-exporter/templates';
import { GENERATOR_REPOSITORY_URL } from '../src/modules/ecc-catalog/catalog-sources';

describe('ECC_SOURCES : composants curated', () => {
  it("n'affiche pas de chemin amont pour un composant curated", () => {
    const md = renderEccSourcesMarkdown({
      eccCommitSha: 'a'.repeat(40),
      eccVersionTag: 'v1',
      selectedRules: [
        {
          slug: 'api-security-guards',
          title: 'API',
          frontmatter: { trigger: 'always_on', description: 'd' },
          markdownBody: 'x',
          selectionRationale: 'r',
          originStatus: 'ecc_adapted',
          eccProvenance: {
            repositoryUrl: GENERATOR_REPOSITORY_URL,
            commitSha: 'b'.repeat(40),
            versionTag: 'v1',
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
