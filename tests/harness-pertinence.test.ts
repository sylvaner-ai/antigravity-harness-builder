import { describe, expect, it } from 'vitest';
import { extractHeuristicProjectProfile } from '../src/modules/project-profile/heuristic-extractor';
import { filesForProjectInstall } from '../src/modules/package-exporter/install-files';
import { loadPinnedCatalog, runSelection, summarizeSelection } from './support/catalog-fixture';

const catalog = loadPinnedCatalog();

function profileFromSpec(specText: string) {
  return extractHeuristicProjectProfile({
    projectId: '00000000-0000-4000-8000-000000000002',
    projectName: 'Location B2B',
    targetSurface: 'IDE',
    specText,
    designSystemText: '',
  });
}

describe('Pertinence du harnais généré', () => {
  const spec = `# Plateforme de location de véhicules B2B

## Fonctionnalités
Contrats de location signés électroniquement, facturation Factur-X, prélèvements SEPA.

## Stack technique
TypeScript, Next.js, React, PostgreSQL, Prisma, Vitest.

## Exploitation
Endpoint de healthcheck technique (/api/health) pour le monitoring. Contrôle d'accès RBAC, sécurité OWASP.`;

  it('un endpoint /api/health ne fait pas d’un projet un projet de santé', () => {
    for (const preset of ['BALANCED', 'THOROUGH'] as const) {
      const sel = summarizeSelection(runSelection(profileFromSpec(spec), catalog, preset));
      const slugs = sel.selected.map((s) => s.slug);
      expect(slugs.filter((s) => /health|hipaa/.test(s)), preset).toEqual([]);
    }
  });

  it('un vrai projet de santé garde ses composants dédiés', () => {
    const sel = summarizeSelection(
      runSelection(profileFromSpec(`${spec}\n\nGestion du dossier médical des patients, hébergement HDS.`), catalog, 'BALANCED')
    );
    expect(sel.selected.some((s) => s.slug === 'hipaa-compliance' || s.slug.startsWith('healthcare-'))).toBe(true);
  });

  it('plafonne sous-agents et skills hors méthodologies (BALANCED : 8 et 20)', () => {
    const sel = summarizeSelection(runSelection(profileFromSpec(spec), catalog, 'BALANCED'));
    const subagents = sel.selected.filter((s) => s.kind === 'SUBAGENT');
    const skills = sel.selected.filter((s) => s.kind === 'SKILL' && !['obra-superpowers', 'dietrichgebert-ponytail'].includes(s.sourceId ?? ''));
    expect(subagents.length).toBeLessThanOrEqual(8);
    expect(skills.length).toBeLessThanOrEqual(20);
  });
});

describe('Fichiers installés par les prompts', () => {
  const ecc = `# Sources\n\n## 1. Traçabilité des Composants du Harnais (§4.5)\n\n| a |\n\n## 2. Principaux Candidats Écartés (Pertinence avant quantité)\n\n${'| écarté |\n'.repeat(500)}\n## 3. Licences et attributions\n\nMIT — Copyright (c) Affaan Mustafa`;
  const manifest = JSON.stringify({
    generationId: 'g1',
    components: [{ id: 'c1', kind: 'SKILL', destinationPath: '.agents/skills/x/SKILL.md', originStatus: 'source_adapted', selectionRationale: 'x'.repeat(5000) }],
    filesInventory: [
      { relativePath: 'docs/SOURCES.md', sha256: 'a'.repeat(64) },
      { relativePath: 'AGENTS.md', sha256: 'b'.repeat(64) },
    ],
  });
  const out = filesForProjectInstall([
    { relativePath: 'docs/SOURCES.md', content: ecc },
    { relativePath: 'docs/HARNESS_MANIFEST.json', content: manifest },
    { relativePath: 'AGENTS.md', content: 'agents' },
  ]);
  const installedEcc = out.find((f) => f.relativePath === 'docs/SOURCES.md')!.content;
  const installedManifest = JSON.parse(out.find((f) => f.relativePath === 'docs/HARNESS_MANIFEST.json')!.content);

  it('allège la traçabilité mais garde les licences (attribution MIT)', () => {
    expect(installedEcc.length).toBeLessThan(ecc.length / 5);
    expect(installedEcc).toContain('## 3. Licences et attributions');
    expect(installedEcc).toContain('Copyright (c) Affaan Mustafa');
    expect(installedEcc).toContain('## 1. Traçabilité');
  });

  it('garde l’inventaire du manifeste, avec l’empreinte du fichier réellement installé', () => {
    expect(installedManifest.components[0].selectionRationale).toBeUndefined();
    expect(installedManifest.components[0].destinationPath).toBe('.agents/skills/x/SKILL.md');
    const eccEntry = installedManifest.filesInventory.find((e: any) => e.relativePath === 'docs/SOURCES.md');
    const expected = require('node:crypto').createHash('sha256').update(installedEcc).digest('hex');
    expect(eccEntry.sha256).toBe(expected);
    expect(installedManifest.filesInventory.find((e: any) => e.relativePath === 'AGENTS.md').sha256).toBe('b'.repeat(64));
  });
});
