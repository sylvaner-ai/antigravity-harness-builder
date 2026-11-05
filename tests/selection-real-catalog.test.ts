import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG_SOURCES } from '../src/modules/ecc-catalog/catalog-sources';
import { assessPlatformFit } from '../src/modules/ecc-catalog/content-safety';
import { HarnessBuilderService } from '../src/modules/harness-builder';
import { ALWAYS_ON_BUDGET_BYTES } from '../src/modules/harness-builder/context-budget';
import {
  CATALOG_FIXTURE_PATH,
  GOLDEN_DIR,
  PRESETS,
  PROJECT_CASES,
  STRIPPED_MARKER,
  goldenPath,
  loadPinnedCatalog,
  profileFor,
  readCatalogFixtureFile,
  runSelection,
  summarizeSelection,
  type GoldenSelection,
} from './support/catalog-fixture';

/**
 * Tests de sélection sur le catalogue réel figé (cinq dépôts à commit fixe), sans réseau.
 * Si un test de ce fichier échoue après une évolution volontaire du moteur ou des sources, régénérez les fixtures :
 *   CATALOG_TARBALLS=<dossier> npx tsx scripts/build-selection-fixtures.mts   (voir docs/TESTS_SELECTION.md)
 * puis relisez le diff des fichiers de tests/fixtures/golden avant de le valider.
 */

const catalog = loadPinnedCatalog();

/** Préfixe de nom de composant → langages du projet qui le justifient. */
const LANGUAGE_PREFIXES: Record<string, string[]> = {
  typescript: ['typescript'], python: ['python'], java: ['java'], golang: ['go'], go: ['go'], kotlin: ['kotlin'],
  swift: ['swift'], rust: ['rust'], php: ['php'], ruby: ['ruby'], perl: ['perl'], csharp: ['c#', 'csharp'],
  cpp: ['c++', 'cpp'], dart: ['dart'], flutter: ['dart'],
};
const slugsOf = (g: GoldenSelection, kind?: string) => new Set(g.selected.filter((s) => !kind || s.kind === kind).map((s) => s.slug));

function selectionFor(caseId: string, preset: (typeof PRESETS)[number]) {
  const c = PROJECT_CASES.find((x) => x.id === caseId)!;
  return summarizeSelection(runSelection(profileFor(c), catalog, preset));
}

describe('Fixture du catalogue figé', () => {
  it('correspond exactement aux commits figés du registre des sources', () => {
    const file = readCatalogFixtureFile();
    const expected = DEFAULT_CATALOG_SOURCES.filter((s) => s.enabled).map((s) => ({ id: s.id, pinnedCommit: s.pinnedCommit }));
    expect(file.sources).toEqual(expected);
  });

  it('contient les cinq bibliothèques et les composants curated, avec un volume réaliste', () => {
    const bySource = new Map<string, number>();
    for (const c of catalog) bySource.set(c.parsedMeta.sourceId ?? 'inconnue', (bySource.get(c.parsedMeta.sourceId ?? 'inconnue') ?? 0) + 1);
    for (const id of ['ecc-official', 'emil-kowalski-skills', 'obra-superpowers', 'cloudflare-security-audit', 'dietrichgebert-ponytail', 'curated']) {
      expect(bySource.get(id) ?? 0, `source ${id}`).toBeGreaterThan(0);
    }
    expect(bySource.has('inconnue')).toBe(false);
    expect(catalog.length).toBeGreaterThan(500);
  });

  it('reste de taille raisonnable pour le dépôt', () => {
    expect(readFileSync(CATALOG_FIXTURE_PATH).length).toBeLessThan(3_000_000);
  });
});

describe('Sélections attendues (golden) sur le catalogue réel', () => {
  for (const c of PROJECT_CASES) {
    for (const preset of PRESETS) {
      it(`${c.id} / ${preset} : sélection identique à la référence`, () => {
        const golden = JSON.parse(readFileSync(goldenPath(c.id, preset), 'utf8')) as GoldenSelection;
        expect(selectionFor(c.id, preset)).toEqual(golden);
      });
    }
  }

  it('couvre tous les projets types et tous les presets', () => {
    expect(PROJECT_CASES.length * PRESETS.length).toBe(12);
    expect(readFileSync(goldenPath('go', 'MINIMAL'), 'utf8').length).toBeGreaterThan(100);
    expect(GOLDEN_DIR).toContain('golden');
  });
});

describe('Propriétés de la sélection (indépendantes des références)', () => {
  for (const c of PROJECT_CASES) {
    const profile = profileFor(c);
    const langs = new Set(profile.techStack.languages.map((l) => l.toLowerCase()));
    if (langs.has('typescript')) langs.add('javascript');

    it(`${c.id} : un seul composant par fonction, aucun composant propre à Claude Code, langages compatibles`, () => {
      for (const preset of PRESETS) {
        const sel = runSelection(profile, catalog, preset);
        const slots = sel.selectedComponents.map((s) => s.slot).filter(Boolean);
        expect(new Set(slots).size, `${c.id}/${preset} : slot en double`).toBe(slots.length);

        for (const s of sel.selectedComponents) {
          const cand = catalog.find((x) => x.kind === s.kind && x.slug === s.slug)!;
          expect(assessPlatformFit(s.slug, cand.parsedMeta.claudeReferences ?? 0).excluded, `${s.slug} propre à Claude Code`).toBe(false);
          // Un composant ECC dont le nom commence par un langage ne doit être retenu que pour un projet utilisant ce langage
          const prefix = s.slug.split('-')[0]!;
          const lang = LANGUAGE_PREFIXES[prefix];
          if (cand.parsedMeta.sourceId === 'ecc-official' && lang) {
            expect(lang.some((l) => langs.has(l)), `${s.slug} incompatible avec ${[...langs]}`).toBe(true);
          }
        }
      }
    });

    it(`${c.id} : les presets sont emboîtés (MINIMAL ⊂ BALANCED ⊂ THOROUGH)`, () => {
      const [min, bal, tho] = PRESETS.map((p) => slugsOf(selectionFor(c.id, p)));
      for (const s of min!) expect(bal!.has(s), `${s} absent de BALANCED`).toBe(true);
      for (const s of bal!) expect(tho!.has(s), `${s} absent de THOROUGH`).toBe(true);
      expect(min!.size).toBeLessThan(bal!.size);
      expect(bal!.size).toBeLessThan(tho!.size);
    });

    it(`${c.id} : méthodologies et sécurité attendues selon le preset`, () => {
      const min = selectionFor(c.id, 'MINIMAL');
      const bal = selectionFor(c.id, 'BALANCED');
      expect(min.bySource['dietrichgebert-ponytail'] ?? 0).toBe(0);
      expect(bal.bySource['dietrichgebert-ponytail']).toBe(4);
      expect(bal.bySource['obra-superpowers']).toBe(13);
      expect(slugsOf(bal, 'SKILL').has('security-audit')).toBe(true);
      expect(slugsOf(bal, 'SKILL').has('test-driven-development')).toBe(true);
    });
  }

  it('est indépendante de l’ordre du catalogue', () => {
    const c = PROJECT_CASES[0]!;
    const profile = profileFor(c);
    const reversed = [...catalog].reverse();
    expect(summarizeSelection(runSelection(profile, reversed, 'BALANCED'))).toEqual(selectionFor(c.id, 'BALANCED'));
  });
});

describe('Pertinence par projet type', () => {
  it('SEPA / TypeScript + React + PostgreSQL : règles TypeScript et React, interface soignée, agent PostgreSQL', () => {
    const g = selectionFor('sepa', 'BALANCED');
    for (const s of ['typescript-security', 'react-security', 'react-testing', 'ui-craft-and-5-states']) expect(slugsOf(g, 'RULE').has(s), s).toBe(true);
    for (const s of ['animate', 'emil-design-eng']) expect(slugsOf(g, 'SKILL').has(s), s).toBe(true);
    expect(slugsOf(g, 'SUBAGENT').has('database-reviewer')).toBe(true);
    expect(slugsOf(g, 'SKILL').has('postgres-patterns')).toBe(true);
    for (const s of g.selected) expect(s.slug).not.toMatch(/^(?:python|java|golang|kotlin|swift|rust|django|laravel|springboot)-/);
  });

  it('Python / FastAPI + PostgreSQL : règles et skills Python, aucune règle TypeScript, Java ou Go', () => {
    const g = selectionFor('python', 'BALANCED');
    for (const s of ['python-coding-style', 'python-security', 'python-testing']) expect(slugsOf(g, 'RULE').has(s), s).toBe(true);
    expect(slugsOf(g, 'SKILL').has('fastapi-patterns')).toBe(true);
    expect(slugsOf(g, 'SUBAGENT').has('fastapi-reviewer')).toBe(true);
    for (const s of g.selected) expect(s.slug).not.toMatch(/^(?:typescript|react|java|golang|springboot|django|laravel|nextjs)-/);
  });

  it('Java / Spring Boot + MySQL + MyBatis : persistance MyBatis et MySQL, ni JPA ni agent PostgreSQL, aucune interface', () => {
    const g = selectionFor('java', 'BALANCED');
    for (const s of ['springboot-patterns', 'mybatis-patterns', 'mysql-patterns']) expect(slugsOf(g, 'SKILL').has(s), s).toBe(true);
    expect(slugsOf(g, 'SKILL').has('jpa-patterns')).toBe(false);
    expect(slugsOf(g, 'SKILL').has('postgres-patterns')).toBe(false);
    expect(slugsOf(g, 'SUBAGENT').has('database-reviewer')).toBe(false);
    expect(slugsOf(g, 'SUBAGENT').has('java-reviewer')).toBe(true);
    expect(g.bySource['emil-kowalski-skills'] ?? 0).toBe(0);
    expect(slugsOf(g, 'RULE').has('ui-craft-and-5-states')).toBe(false);
  });

  it('Go sans interface ni PostgreSQL : règles Go, ni interface, ni agent PostgreSQL, ni autre langage', () => {
    const g = selectionFor('go', 'BALANCED');
    for (const s of ['golang-coding-style', 'golang-security', 'golang-testing']) expect(slugsOf(g, 'RULE').has(s), s).toBe(true);
    expect(slugsOf(g, 'SUBAGENT').has('go-reviewer')).toBe(true);
    expect(slugsOf(g, 'SUBAGENT').has('database-reviewer')).toBe(false);
    expect(g.bySource['emil-kowalski-skills'] ?? 0).toBe(0);
    for (const s of g.selected) expect(s.slug).not.toMatch(/^(?:typescript|react|java|python|springboot|django|nextjs)-/);
  });
});

describe('Harnais complet généré depuis le catalogue réel', () => {
  for (const c of PROJECT_CASES) {
    for (const preset of ['BALANCED', 'THOROUGH'] as const) {
      it(`${c.id} / ${preset} : paquet valide, contexte permanent maîtrisé, aucun résidu de fixture`, async () => {
        const profile = profileFor(c);
        const sel = runSelection(profile, catalog, preset);
        const pkg = await new HarnessBuilderService().buildHarness(profile, sel);

        expect(pkg.manifest.validationSummary.valid).toBe(true);
        expect(pkg.manifest.validationSummary.errorsCount).toBe(0);

        const agentsMd = pkg.files.find((f) => f.relativePath === 'AGENTS.md')!;
        expect(Buffer.byteLength(agentsMd.content, 'utf8')).toBeLessThan(24_000);
        expect(agentsMd.content).not.toMatch(/\/compact|PROACTIVELY|MUST BE USED/);

        // Les règles liées à des fichiers (glob) sont converties en model_decision (déclenchement par fichier non fiable)
        for (const f of pkg.files.filter((x) => x.relativePath.startsWith('.agents/rules/'))) {
          expect(f.content.slice(0, 400), f.relativePath).not.toMatch(/^trigger:\s*glob/m);
        }

        // Option C : AGENTS.md (toujours lu) annonce chaque règle chargée à la demande, avec son chemin
        const onDemandRules = pkg.files.filter(
          (f) => f.relativePath.startsWith('.agents/rules/') && !/^trigger:\s*always_on/m.test(f.content.slice(0, 300))
        );
        for (const f of onDemandRules) {
          const slug = f.relativePath.replace('.agents/rules/', '').replace(/\.md$/, '');
          expect(agentsMd.content, `${f.relativePath} absent d'AGENTS.md`).toContain(slug);
        }
        if (onDemandRules.length > 0) expect(agentsMd.content).toMatch(/Règles à lire avant certaines tâches/);

        const alwaysOn = pkg.files.filter(
          (f) => f.relativePath.startsWith('.agents/rules/') && /^trigger:\s*always_on/m.test(f.content.slice(0, 300))
        );
        const alwaysOnBytes = alwaysOn.reduce((n, f) => n + Buffer.byteLength(f.content, 'utf8'), 0);
        expect(alwaysOnBytes).toBeLessThan(ALWAYS_ON_BUDGET_BYTES[preset] + 3_000);

        // Un fichier généré ne doit jamais contenir le marqueur d'un contenu absent de la fixture
        for (const f of pkg.files) expect(f.content, f.relativePath).not.toContain(STRIPPED_MARKER);

        // Chaque skill sélectionné est livré avec son SKILL.md ; aucune écriture pour les agents de revue
        for (const s of sel.selectedComponents.filter((x) => x.kind === 'SKILL')) {
          expect(pkg.files.some((f) => f.relativePath === `.agents/skills/${s.slug}/SKILL.md`), s.slug).toBe(true);
        }
        for (const f of pkg.files.filter((x) => /^\.agents\/agents\/.*(?:review|audit)/.test(x.relativePath))) {
          expect(f.content, f.relativePath).not.toMatch(/write_to_file|replace_file_content/);
        }

        // Attribution : chaque dépôt contributeur est cité avec sa licence
        const sources = pkg.files.find((f) => f.relativePath === 'docs/ECC_SOURCES.md')!.content;
        for (const id of new Set(sel.selectedComponents.map((s: any) => s.sourceId).filter((x: string) => x && x !== 'curated'))) {
          const src = DEFAULT_CATALOG_SOURCES.find((s) => s.id === id)!;
          expect(sources, `attribution ${id}`).toContain(`${src.owner}/${src.repo}`);
        }
      });
    }
  }
});
