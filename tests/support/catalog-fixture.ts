import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { extractHeuristicProjectProfile } from '../../src/modules/project-profile/heuristic-extractor';
import type { ProjectProfile } from '../../src/modules/project-profile/schema';
import { SelectionEngine, type CatalogCandidateInput } from '../../src/modules/selection-engine';
import type { PresetMode, SelectionResult } from '../../src/modules/selection-engine/schema';

/**
 * Instantané du catalogue multi-sources figé et projets types, utilisés par les tests de sélection hors réseau.
 * Régénération : `npx tsx scripts/build-selection-fixtures.mts` (voir docs/TESTS_SELECTION.md).
 */
export const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
export const CATALOG_FIXTURE_PATH = join(FIXTURES_DIR, 'catalog', 'pinned-catalog.json.gz');
export const GOLDEN_DIR = join(FIXTURES_DIR, 'golden');
export const STRIPPED_MARKER = '<!--FIXTURE-STRIPPED-->';

export const PRESETS: readonly PresetMode[] = ['MINIMAL', 'BALANCED', 'THOROUGH'];

export interface ProjectCase {
  id: string;
  name: string;
  specFile: string;
  designFile?: string;
}

export const PROJECT_CASES: readonly ProjectCase[] = [
  { id: 'sepa', name: 'Signature SEPA FEC', specFile: 'sepa-spec.md', designFile: 'design.md' },
  { id: 'python', name: 'Agent Support N1', specFile: 'python-spec.md' },
  { id: 'java', name: 'Portail de gestion des sinistres', specFile: 'java-spec.md' },
  { id: 'go', name: 'Collecteur de métriques', specFile: 'go-spec.md' },
];

export interface CatalogFixtureFile {
  schema: 1;
  versionTag: string;
  sources: Array<{ id: string; pinnedCommit: string }>;
  components: Array<Record<string, any>>;
}

export function fixtureExists(): boolean {
  return existsSync(CATALOG_FIXTURE_PATH);
}

export function readCatalogFixtureFile(): CatalogFixtureFile {
  return JSON.parse(gunzipSync(readFileSync(CATALOG_FIXTURE_PATH)).toString('utf8')) as CatalogFixtureFile;
}

/** Recrée des candidats complets : le contenu absent est remplacé par un marqueur de même longueur. */
export function hydrateCatalog(file: CatalogFixtureFile): CatalogCandidateInput[] {
  return file.components.map((c) => {
    const { adaptedContentLength, ...rest } = c;
    const adaptedContent: string =
      typeof c.adaptedContent === 'string'
        ? c.adaptedContent
        : STRIPPED_MARKER.padEnd(Number(adaptedContentLength ?? STRIPPED_MARKER.length), ' ');
    const resourcesList = (c.parsedMeta?.resourcesList ?? []).map((r: any) => ({
      relativeSubPath: r.relativeSubPath,
      content: typeof r.content === 'string' ? r.content : '',
    }));
    return {
      ...rest,
      adaptedContent,
      parsedMeta: { ...c.parsedMeta, resourcesList },
    } as CatalogCandidateInput;
  });
}

let cached: CatalogCandidateInput[] | undefined;
export function loadPinnedCatalog(): CatalogCandidateInput[] {
  if (!cached) cached = hydrateCatalog(readCatalogFixtureFile());
  return cached;
}

export function readProjectFile(name: string): string {
  return readFileSync(join(FIXTURES_DIR, 'projects', name), 'utf8');
}

export function profileFor(c: ProjectCase): ProjectProfile {
  return extractHeuristicProjectProfile({
    projectId: '00000000-0000-4000-8000-000000000001',
    projectName: c.name,
    targetSurface: 'IDE',
    specText: readProjectFile(c.specFile),
    designSystemText: c.designFile ? readProjectFile(c.designFile) : '',
  });
}

export function runSelection(
  profile: ProjectProfile,
  catalog: readonly CatalogCandidateInput[],
  presetMode: PresetMode
): SelectionResult {
  return new SelectionEngine().selectComponents(profile, [...catalog], { presetMode });
}

export interface GoldenSelection {
  total: number;
  bySource: Record<string, number>;
  selected: Array<{ kind: string; slug: string; slot?: string; sourceId?: string; methodology?: string }>;
  custom: string[];
}

/** Résumé stable et comparable d'une sélection (tri par type puis nom). */
export function summarizeSelection(sel: SelectionResult): GoldenSelection {
  const selected = sel.selectedComponents
    .map((c: any) => ({
      kind: c.kind as string,
      slug: c.slug as string,
      ...(c.slot ? { slot: c.slot as string } : {}),
      ...(c.sourceId ? { sourceId: c.sourceId as string } : {}),
      ...(c.methodology ? { methodology: c.methodology as string } : {}),
    }))
    .sort((a, b) => (a.kind + a.slug).localeCompare(b.kind + b.slug));
  const bySource: Record<string, number> = {};
  for (const c of selected) bySource[c.sourceId ?? 'inconnue'] = (bySource[c.sourceId ?? 'inconnue'] ?? 0) + 1;
  return {
    total: selected.length,
    bySource: Object.fromEntries(Object.entries(bySource).sort(([a], [b]) => a.localeCompare(b))),
    selected,
    custom: sel.customComponents.map((c: any) => c.slug as string).sort(),
  };
}

export function goldenPath(caseId: string, preset: PresetMode): string {
  return join(GOLDEN_DIR, `${caseId}-${preset}.json`);
}
