/**
 * Régénère les fixtures des tests de sélection hors réseau :
 *   - tests/fixtures/catalog/pinned-catalog.json.gz (catalogue multi-sources figé)
 *   - tests/fixtures/golden/<projet>-<preset>.json (sélections attendues)
 *
 * Entrées (obligatoires) :
 *   CATALOG_TARBALLS=<dossier>  contient affaan-m_ECC.tar.gz, emilkowalski_skills.tar.gz, obra_superpowers.tar.gz,
 *                               cloudflare_security-audit-skill.tar.gz, dietrichgebert_ponytail.tar.gz
 *   (archives GitHub des commits figés de src/modules/catalog/catalog-sources.ts)
 *   CATALOG_SRCS=<dossier>      (facultatif) clones git des mêmes dépôts, pour vérifier que chaque archive correspond au commit figé
 *
 * Usage : CATALOG_TARBALLS=... npx tsx scripts/build-selection-fixtures.mts
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { extractTarGzTextFilesInMemory } from '../src/modules/catalog/tar-extractor';
import { buildMultiSourceCatalog } from '../src/modules/catalog/catalog-builder';
import { DEFAULT_CATALOG_SOURCES } from '../src/modules/catalog/catalog-sources';
import {
  CATALOG_FIXTURE_PATH,
  PRESETS,
  PROJECT_CASES,
  goldenPath,
  hydrateCatalog,
  profileFor,
  runSelection,
  summarizeSelection,
  type CatalogFixtureFile,
} from '../tests/support/catalog-fixture';

const tarballs = process.env.CATALOG_TARBALLS;
if (!tarballs) throw new Error('Variable CATALOG_TARBALLS manquante (voir l’en-tête du script).');
const srcs = process.env.CATALOG_SRCS;

const snapshots = DEFAULT_CATALOG_SOURCES.filter((s) => s.id !== 'curated' && s.enabled).map((source) => {
  const file = `${tarballs}/${source.owner}_${source.repo}.tar.gz`;
  if (srcs) {
    const sha = execSync(`git -C ${srcs}/${source.owner}_${source.repo} rev-parse HEAD`).toString().trim();
    if (sha !== source.pinnedCommit) throw new Error(`${source.id} : clone sur ${sha}, commit figé ${source.pinnedCommit}`);
  }
  return {
    source,
    commitSha: source.pinnedCommit,
    entries: extractTarGzTextFilesInMemory(new Uint8Array(readFileSync(file))),
  };
});

const catalog = buildMultiSourceCatalog(snapshots);
console.log(`Catalogue : ${catalog.components.length} composants`);

// 1. Première passe sur le catalogue complet : détermine les composants réellement sélectionnés
const full = catalog.components as any[];
const keep = new Set<string>();
const golden: Array<{ path: string; value: unknown }> = [];
for (const c of PROJECT_CASES) {
  const profile = profileFor(c);
  for (const preset of PRESETS) {
    const sel = runSelection(profile, full, preset);
    for (const s of sel.selectedComponents) keep.add(`${s.kind}:${s.slug}`);
    golden.push({ path: goldenPath(c.id, preset), value: summarizeSelection(sel) });
  }
}

// 2. Instantané : contenu intégral uniquement pour les composants sélectionnés
const components = full.map(({ searchText: _searchText, ...c }) => {
  if (keep.has(`${c.kind}:${c.slug}`)) return c;
  const { adaptedContent, parsedMeta, ...rest } = c;
  return {
    ...rest,
    adaptedContentLength: adaptedContent.length,
    parsedMeta: {
      ...parsedMeta,
      resourcesList: (parsedMeta.resourcesList ?? []).map((r: any) => ({ relativeSubPath: r.relativeSubPath })),
    },
  };
});
const file: CatalogFixtureFile = {
  schema: 1,
  versionTag: catalog.versionTag,
  sources: snapshots.map((s) => ({ id: s.source.id, pinnedCommit: s.source.pinnedCommit })),
  components,
};
mkdirSync(dirname(CATALOG_FIXTURE_PATH), { recursive: true });
writeFileSync(CATALOG_FIXTURE_PATH, gzipSync(JSON.stringify(file), { level: 9 }));

// 3. Vérification : l'instantané relu doit donner exactement les mêmes sélections que le catalogue complet
const reloaded = hydrateCatalog(file);
for (const c of PROJECT_CASES) {
  const profile = profileFor(c);
  for (const preset of PRESETS) {
    const a = JSON.stringify(summarizeSelection(runSelection(profile, reloaded, preset)));
    const b = JSON.stringify(golden.find((g) => g.path === goldenPath(c.id, preset))!.value);
    if (a !== b) throw new Error(`Instantané non fidèle pour ${c.id}/${preset}`);
  }
}

mkdirSync(dirname(golden[0]!.path), { recursive: true });
for (const g of golden) writeFileSync(g.path, JSON.stringify(g.value, null, 1) + '\n');
console.log(`Écrit : ${CATALOG_FIXTURE_PATH} et ${golden.length} sélections attendues, ${keep.size} composants avec contenu intégral.`);
