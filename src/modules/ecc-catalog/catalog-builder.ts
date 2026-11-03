import { ValidationIssue } from '../antigravity-adapter/schema';
import { CatalogSourceConfig, REDISTRIBUTABLE_LICENSES, detectLicense } from './catalog-sources';
import { countClaudeSpecificReferences, scanContentSafety } from './content-safety';
import { getBuiltinCuratedExcellenceComponents } from './curated-excellence';
import { IndexedEccComponentCandidate, parseAndQualifyEccRepositoryEntries } from './indexer';
import { TarFileEntry } from './tar-extractor';

/**
 * Construction pure (sans réseau ni base de données) du catalogue multi-sources à partir des archives des
 * dépôts figés. Utilisée par la synchronisation et par les tests de sélection sur catalogue réel.
 */

export interface SourceSnapshot {
  source: CatalogSourceConfig;
  commitSha: string;
  entries: readonly TarFileEntry[];
}

export interface SourceBuildReport {
  sourceId: string;
  commitSha: string;
  license: string;
  licenseMatchesRegistry: boolean;
  indexed: number;
  blockedUnsafe: string[];
  slugCollisions: string[];
}

export interface MultiSourceCatalog {
  components: IndexedEccComponentCandidate[];
  reports: SourceBuildReport[];
  versionTag: string;
}

const issue = (code: string, message: string, severity: ValidationIssue['severity'] = 'error'): ValidationIssue => ({
  severity,
  code,
  message,
  validationKind: 'DOCUMENTARY',
  validationTier: 'AUTO_VALIDATED',
});

/** Index « chemin source → module » depuis manifests/install-modules.json (ECC). */
function buildModuleIndex(entries: readonly TarFileEntry[]): Array<{ prefix: string; module: string }> {
  const manifest = entries.find((e) => e.relativePath === 'manifests/install-modules.json');
  if (!manifest) return [];
  try {
    const parsed = JSON.parse(manifest.content) as { modules?: Array<{ id: string; paths?: string[] }> };
    const index: Array<{ prefix: string; module: string }> = [];
    for (const m of parsed.modules ?? []) {
      for (const p of m.paths ?? []) index.push({ prefix: p.replace(/\/+$/, ''), module: m.id });
    }
    // Le préfixe le plus long l'emporte (skills/x avant skills)
    return index.sort((a, b) => b.prefix.length - a.prefix.length);
  } catch {
    return [];
  }
}

function findModule(index: Array<{ prefix: string; module: string }>, relPath: string): string | undefined {
  return index.find((i) => relPath === i.prefix || relPath.startsWith(`${i.prefix}/`))?.module;
}

/** Adaptations propres à une source, appliquées au contenu déjà converti pour Antigravity. */
function adaptSourceContent(sourceId: string, content: string): string {
  if (sourceId === 'obra-superpowers') {
    // « superpowers:writing-plans » est un nom de plugin Claude Code ; dans Antigravity le skill s'appelle « writing-plans ».
    return content.replace(/\bsuperpowers:([a-z0-9-]+)/g, '$1');
  }
  return content;
}

export function buildMultiSourceCatalog(
  snapshots: readonly SourceSnapshot[],
  options: { includeCurated?: boolean } = {}
): MultiSourceCatalog {
  const components: IndexedEccComponentCandidate[] = [];
  const owners = new Map<string, string>(); // `${kind}:${slug}` -> sourceId (une règle et un skill peuvent porter le même nom)
  const reports: SourceBuildReport[] = [];
  const tags: string[] = [];

  if (options.includeCurated !== false) {
    for (const c of getBuiltinCuratedExcellenceComponents()) {
      components.push(c);
      owners.set(`${c.kind}:${c.slug}`, 'curated');
    }
  }

  // Ordre de priorité décroissante : en cas de slug identique, la source prioritaire garde le nom.
  const ordered = [...snapshots].sort((a, b) => b.source.priority - a.source.priority);

  for (const snap of ordered) {
    const { source, commitSha, entries } = snap;
    const repoUrl = `https://github.com/${source.owner}/${source.repo}`;
    const parsed = parseAndQualifyEccRepositoryEntries(entries, commitSha, repoUrl);
    const license = detectLicense(entries.find((e) => /^LICEN[CS]E(\.md|\.txt)?$/i.test(e.relativePath))?.content);
    const redistributable = REDISTRIBUTABLE_LICENSES.has(license);
    const moduleIndex = buildModuleIndex(entries);
    const report: SourceBuildReport = {
      sourceId: source.id,
      commitSha,
      license,
      licenseMatchesRegistry: license === source.license,
      indexed: 0,
      blockedUnsafe: [],
      slugCollisions: [],
    };

    for (const comp of parsed.components) {
      const key = `${comp.kind}:${comp.slug}`;
      if (owners.has(key)) {
        report.slugCollisions.push(`${comp.slug} (déjà fourni par ${owners.get(key)})`);
        continue;
      }

      comp.license = license;
      comp.parsedMeta.sourceId = source.id;
      comp.parsedMeta.sourcePriority = source.priority;
      comp.parsedMeta.claudeReferences = countClaudeSpecificReferences(comp.rawContent);
      const module = findModule(moduleIndex, comp.sourceRelativePath);
      if (module) comp.parsedMeta.eccModule = module;

      comp.adaptedContent = adaptSourceContent(source.id, comp.adaptedContent);
      comp.parsedMeta.resourcesList = comp.parsedMeta.resourcesList.map((r) => ({
        ...r,
        content: adaptSourceContent(source.id, r.content),
      }));

      const safety = scanContentSafety([
        { path: comp.sourceRelativePath, content: comp.rawContent },
        ...comp.parsedMeta.resourcesList.map((r) => ({ path: r.relativeSubPath, content: r.content })),
      ]);
      if (safety.warnings.length > 0) comp.parsedMeta.safetyWarnings = safety.warnings;
      if (safety.blocked) {
        comp.compatibilityStatus = 'INCOMPATIBLE';
        comp.compatibilityIssues = [...comp.compatibilityIssues, ...safety.reasons.map((r) => issue('UNSAFE_CONTENT', r))];
        report.blockedUnsafe.push(comp.slug);
      }
      if (!redistributable) {
        comp.compatibilityStatus = 'INCOMPATIBLE';
        comp.compatibilityIssues = [
          ...comp.compatibilityIssues,
          issue('LICENSE_NOT_REDISTRIBUTABLE', `Licence « ${license} » non reconnue comme permissive : copie dans le harnais refusée.`),
        ];
      }

      components.push(comp);
      owners.set(key, source.id);
      report.indexed++;
    }

    reports.push(report);
    tags.push(`${source.owner}/${source.repo}@${commitSha.slice(0, 7)}`);
  }

  return { components, reports, versionTag: tags.join(' + ') };
}
