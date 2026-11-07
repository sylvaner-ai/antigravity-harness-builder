import { CatalogComponentMeta } from '../../db/schema';
import {
  ANTIGRAVITY_LIMITS,
  ValidationIssue,
  ValidationTier,
} from '../antigravity-adapter/schema';
import {
  adaptAgentMarkdown,
  sanitizeClaudeSpecificReferences,
  serializeAntigravityRule,
  serializeAntigravitySkill,
  splitMarkdownFrontmatter,
} from '../antigravity-adapter/adapter';
import {
  validateRulesAndContextBudget,
  validateSkills,
  validateSubagents,
} from '../antigravity-adapter/validators';
import { computeSha256 } from '../package-exporter/exporter';
import { TarFileEntry } from './tar-extractor';

export interface IndexedCatalogComponent {
  externalId: string;
  slug: string;
  kind: 'RULE' | 'SKILL' | 'SUBAGENT' | 'COMMAND_CONVERTED';
  name: string;
  description: string;
  sourceRelativePath: string;
  sourceUrl: string;
  license: string;
  contentSha256: string;
  rawContent: string;
  adaptedContent: string;
  parsedMeta: CatalogComponentMeta;
  compatibilityStatus: ValidationTier | 'INCOMPATIBLE';
  compatibilityIssues: ValidationIssue[];
  searchText: string;
}

/**
 * Mapping des dossiers de règles (`rules/<dir>/*.md`) vers des patterns `globs` natifs Antigravity
 * afin de préserver le budget de 20 000 tokens des règles `always_on`.
 */
const RULE_DIR_TO_GLOBS_MAP: Readonly<Record<string, { globs: string; languages: string[]; frameworks: string[] }>> =
  Object.freeze({
    typescript: { globs: '**/*.ts, **/*.tsx', languages: ['typescript', 'javascript'], frameworks: [] },
    react: { globs: '**/*.tsx, **/*.jsx', languages: ['typescript', 'javascript'], frameworks: ['react', 'nextjs'] },
    nextjs: { globs: '**/*.ts, **/*.tsx, next.config.*', languages: ['typescript'], frameworks: ['nextjs', 'react'] },
    vue: { globs: '**/*.vue, **/*.ts', languages: ['typescript', 'javascript'], frameworks: ['vue', 'nuxt'] },
    nuxt: { globs: '**/*.vue, **/*.ts, nuxt.config.*', languages: ['typescript'], frameworks: ['nuxt', 'vue'] },
    angular: { globs: '**/*.ts, **/*.html', languages: ['typescript'], frameworks: ['angular'] },
    python: { globs: '**/*.py, pyproject.toml', languages: ['python'], frameworks: ['django', 'fastapi', 'flask'] },
    golang: { globs: '**/*.go, go.mod', languages: ['go', 'golang'], frameworks: [] },
    rust: { globs: '**/*.rs, Cargo.toml', languages: ['rust'], frameworks: [] },
    java: { globs: '**/*.java, pom.xml, build.gradle*', languages: ['java'], frameworks: ['spring'] },
    kotlin: { globs: '**/*.kt, **/*.kts', languages: ['kotlin'], frameworks: [] },
    csharp: { globs: '**/*.cs, **/*.csproj', languages: ['csharp', 'c#'], frameworks: ['dotnet'] },
    fsharp: { globs: '**/*.fs, **/*.fsproj', languages: ['fsharp'], frameworks: ['dotnet'] },
    cpp: { globs: '**/*.cpp, **/*.cc, **/*.h, **/*.hpp', languages: ['cpp', 'c++'], frameworks: [] },
    php: { globs: '**/*.php, composer.json', languages: ['php'], frameworks: ['laravel', 'symfony'] },
    ruby: { globs: '**/*.rb, Gemfile', languages: ['ruby'], frameworks: ['rails'] },
    swift: { globs: '**/*.swift, Package.swift', languages: ['swift'], frameworks: [] },
    dart: { globs: '**/*.dart, pubspec.yaml', languages: ['dart'], frameworks: ['flutter'] },
    web: { globs: '**/*.css, **/*.scss, **/*.html', languages: ['css', 'html'], frameworks: ['tailwind'] },
  });

function toKebabSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75);
  return cleaned.length >= 2 ? cleaned : `item-${cleaned || 'default'}`;
}

function extractFirstHeadingOrSentence(markdown: string, fallback: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      const heading = trimmed.replace(/^#+\s*/, '').trim();
      if (heading.length >= 5) return heading;
    } else if (!trimmed.startsWith('---') && trimmed.length >= 15) {
      return trimmed.slice(0, 180);
    }
  }
  return fallback;
}

const LANG_PATTERNS: ReadonlyArray<{ regex: RegExp; canonical: string }> = Object.freeze([
  { regex: /\btypescript\b/i, canonical: 'typescript' },
  { regex: /\bjavascript\b/i, canonical: 'javascript' },
  { regex: /\bpython\b/i, canonical: 'python' },
  { regex: /\bgolang\b/i, canonical: 'go' },
  { regex: /\brust\b/i, canonical: 'rust' },
  { regex: /\bjava\b/i, canonical: 'java' },
  { regex: /\bkotlin\b/i, canonical: 'kotlin' },
  { regex: /\bswift\b/i, canonical: 'swift' },
  { regex: /\bcsharp\b/i, canonical: 'csharp' },
  { regex: /\bphp\b/i, canonical: 'php' },
  { regex: /\bruby\b/i, canonical: 'ruby' },
  { regex: /\bsql\b/i, canonical: 'sql' },
  { regex: /\bpostgres(?:ql)?\b/i, canonical: 'postgresql' },
]);

const FW_PATTERNS: ReadonlyArray<{ regex: RegExp; canonical: string }> = Object.freeze([
  { regex: /\bnext(?:\.js|js)\b/i, canonical: 'nextjs' },
  { regex: /\breact\b/i, canonical: 'react' },
  { regex: /\btailwind(?:css)?\b/i, canonical: 'tailwindcss' },
  { regex: /\bvue\b/i, canonical: 'vue' },
  { regex: /\bnuxt\b/i, canonical: 'nuxt' },
  { regex: /\bangular\b/i, canonical: 'angular' },
  { regex: /\bdjango\b/i, canonical: 'django' },
  { regex: /\bfastapi\b/i, canonical: 'fastapi' },
  { regex: /\bspring\b/i, canonical: 'spring' },
  { regex: /\bflutter\b/i, canonical: 'flutter' },
  { regex: /\bplaywright\b/i, canonical: 'playwright' },
  { regex: /\bvitest\b/i, canonical: 'vitest' },
  { regex: /\bdocker\b/i, canonical: 'docker' },
]);

const DOMAIN_TAGS: ReadonlyArray<string> = Object.freeze([
  'security',
  'testing',
  'tdd',
  'architecture',
  'database',
  'api',
  'backend',
  'frontend',
  'accessibility',
  'a11y',
  'design-system',
  'ci-cd',
  'devops',
  'review',
  'performance',
]);

function inferTagsAndStack(text: string, family?: string): {
  tags: string[];
  languages: string[];
  frameworks: string[];
} {
  const lower = `${family ?? ''} ${text}`.toLowerCase();
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const tags = new Set<string>();

  if (family) tags.add(family.toLowerCase());

  for (const { regex, canonical } of LANG_PATTERNS) {
    if (regex.test(lower)) {
      languages.add(canonical);
      tags.add(canonical);
    }
  }
  for (const { regex, canonical } of FW_PATTERNS) {
    if (regex.test(lower)) {
      frameworks.add(canonical);
      tags.add(canonical);
    }
  }
  for (const tag of DOMAIN_TAGS) {
    if (new RegExp(`(?:^|[^a-z0-9])${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`).test(lower)) {
      tags.add(tag);
    }
  }

  return {
    tags: [...tags],
    languages: [...languages],
    frameworks: [...frameworks],
  };
}

/**
 * Transforme et qualifie l'ensemble des entrées extraites de l'archive d'une source
 * en composants indexables dans PostgreSQL, avec vérification de compatibilité Antigravity.
 */
export function parseAndQualifyRepositoryEntries(
  entries: readonly TarFileEntry[],
  commitSha: string,
  repoUrl: string
): { components: IndexedCatalogComponent[] } {
  // Licence réelle posée ensuite par catalog-builder, d'après le fichier LICENSE de la source.
  const license = 'UNKNOWN';

  const components: IndexedCatalogComponent[] = [];
  const seenExternalIds = new Set<string>();

  // 1. Indexation des Règles (`rules/<family>/<file>.md`)
  for (const entry of entries) {
    const ruleMatch = entry.relativePath.match(/^rules\/([^/]+)\/([^/]+)\.md$/i);
    if (!ruleMatch) continue;

    const family = ruleMatch[1]!.toLowerCase();
    const baseName = ruleMatch[2]!.toLowerCase();
    if (baseName === 'readme') continue;

    const slug = toKebabSlug(`${family}-${baseName}`);
    const externalId = `rule:${slug}`;
    if (seenExternalIds.has(externalId)) continue;
    seenExternalIds.add(externalId);

    const split = splitMarkdownFrontmatter(entry.content);
    const sanitized = sanitizeClaudeSpecificReferences(split.body);
    const adaptationNotes: string[] = [];
    for (const rep of sanitized.replacements) {
      adaptationNotes.push(`Référence Claude normalisée : ${rep}.`);
    }

    const dirMapping = RULE_DIR_TO_GLOBS_MAP[family];
    const trigger: 'always_on' | 'glob' = family === 'common' ? 'always_on' : 'glob';
    const globs = dirMapping?.globs ?? `**/*`;
    const description = `Règle (${family}/${baseName}) : ${extractFirstHeadingOrSentence(
      sanitized.content,
      slug
    )}`;

    let adaptedContent: string;
    if (trigger === 'always_on') {
      adaptationNotes.push("Ajout du frontmatter Antigravity 'trigger: always_on' (socle common).");
      adaptedContent = serializeAntigravityRule({ trigger: 'always_on', description }, sanitized.content);
    } else {
      adaptationNotes.push(
        `Ajout du frontmatter Antigravity 'trigger: glob' (${globs}) pour économiser le budget de contexte always_on.`
      );
      adaptedContent = serializeAntigravityRule(
        { trigger: 'glob', globs, description },
        sanitized.content
      );
    }

    const validation = validateRulesAndContextBudget([
      { relativePath: `.agents/rules/${slug}.md`, content: adaptedContent },
    ]);

    const hasBlockingError =
      validation.issues.some((i) => i.severity === 'error') ||
      Buffer.byteLength(adaptedContent, 'utf8') > ANTIGRAVITY_LIMITS.MAX_RULE_FILE_BYTES;

    const inferred = inferTagsAndStack(`${slug} ${description} ${sanitized.content}`, family);

    components.push({
      externalId,
      slug,
      kind: 'RULE',
      name: `${family} / ${baseName}`,
      description,
      sourceRelativePath: entry.relativePath,
      sourceUrl: `${repoUrl}/blob/${commitSha}/${entry.relativePath}`,
      license,
      contentSha256: computeSha256(entry.content),
      rawContent: entry.content,
      adaptedContent,
      parsedMeta: {
        family,
        tags: inferred.tags,
        languages: dirMapping?.languages ?? inferred.languages,
        frameworks: dirMapping?.frameworks ?? inferred.frameworks,
        recommendedRuleTrigger: trigger,
        recommendedRuleGlobs: trigger === 'glob' ? globs : undefined,
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes,
      },
      compatibilityStatus: hasBlockingError ? 'INCOMPATIBLE' : 'AUTO_VALIDATED',
      compatibilityIssues: validation.issues,
      searchText: `${slug} ${family} ${baseName} ${description} ${inferred.tags.join(' ')}`,
    });
  }

  // 2. Indexation des Sous-agents (`agents/<name>.md`)
  for (const entry of entries) {
    const agentMatch = entry.relativePath.match(/^agents\/([^/]+)\.md$/i);
    if (!agentMatch) continue;

    const rawName = agentMatch[1]!;
    if (rawName.toLowerCase() === 'readme') continue;

    const slug = toKebabSlug(rawName);
    const externalId = `subagent:${slug}`;
    if (seenExternalIds.has(externalId)) continue;
    seenExternalIds.add(externalId);

    const isReviewer = /(?:reviewer|auditor|audit|evaluator|analyzer)(?:$|-)/i.test(slug);

    try {
      const adapted = adaptAgentMarkdown(entry.content, slug, {
        isIndependentReviewer: isReviewer,
      });

      const subagentIssues = validateSubagents([
        {
          relativePath: `.agents/agents/${slug}.md`,
          content: adapted.content,
          isReviewerAgent: isReviewer,
        },
      ]);

      const hasError = subagentIssues.some((i) => i.severity === 'error');
      const hasDocNote = subagentIssues.some((i) => i.validationTier === 'DOC_COMPATIBLE');
      const inferred = inferTagsAndStack(
        `${slug} ${adapted.frontmatter.description} ${entry.content}`,
        'agent'
      );

      components.push({
        externalId,
        slug,
        kind: 'SUBAGENT',
        name: slug,
        description: adapted.frontmatter.description,
        sourceRelativePath: entry.relativePath,
        sourceUrl: `${repoUrl}/blob/${commitSha}/${entry.relativePath}`,
        license,
        contentSha256: computeSha256(entry.content),
        rawContent: entry.content,
        adaptedContent: adapted.content,
        parsedMeta: {
          family: 'agent',
          tags: inferred.tags,
          languages: inferred.languages,
          frameworks: inferred.frameworks,
          adaptedTools: adapted.frontmatter.tools,
          adaptedModel: adapted.recommendedModelTier,
          recommendedEffort: adapted.recommendedEffort,
          dependencies: [],
          hasResources: false,
          resourcesList: [],
          skippedUnsafeFiles: [],
          adaptationNotes: adapted.adaptationNotes,
        },
        compatibilityStatus: hasError
          ? 'INCOMPATIBLE'
          : hasDocNote
            ? 'DOC_COMPATIBLE'
            : 'AUTO_VALIDATED',
        compatibilityIssues: subagentIssues,
        searchText: `${slug} ${adapted.frontmatter.description} ${inferred.tags.join(' ')}`,
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      components.push({
        externalId,
        slug,
        kind: 'SUBAGENT',
        name: slug,
        description: `Agent non adaptable (${errMessage})`,
        sourceRelativePath: entry.relativePath,
        sourceUrl: `${repoUrl}/blob/${commitSha}/${entry.relativePath}`,
        license,
        contentSha256: computeSha256(entry.content),
        rawContent: entry.content,
        adaptedContent: entry.content,
        parsedMeta: {
          family: 'agent',
          tags: ['agent'],
          languages: [],
          frameworks: [],
          dependencies: [],
          hasResources: false,
          resourcesList: [],
          skippedUnsafeFiles: [],
          adaptationNotes: [errMessage],
        },
        compatibilityStatus: 'INCOMPATIBLE',
        compatibilityIssues: [
          {
            severity: 'error',
            code: 'AGENT_ADAPTATION_FAILED',
            message: errMessage,
            filePath: `.agents/agents/${slug}.md`,
            validationKind: 'SYNTACTIC',
            validationTier: 'AUTO_VALIDATED',
          },
        ],
        searchText: slug,
      });
    }
  }

  // 3. Indexation des Skills (`skills/<slug>/SKILL.md` + ressources sûres éventuelles)
  const skillMainEntries = entries.filter((e) => /^skills\/[^/]+\/SKILL\.md$/i.test(e.relativePath));
  const existingSkillSlugs = new Set<string>();

  for (const skillEntry of skillMainEntries) {
    const match = skillEntry.relativePath.match(/^skills\/([^/]+)\/SKILL\.md$/i);
    if (!match?.[1]) continue;

    const rawFolder = match[1];
    const slug = toKebabSlug(rawFolder);
    existingSkillSlugs.add(slug);
    const externalId = `skill:${slug}`;
    if (seenExternalIds.has(externalId)) continue;
    seenExternalIds.add(externalId);

    const split = splitMarkdownFrontmatter(skillEntry.content);
    const sanitized = sanitizeClaudeSpecificReferences(split.body);
    const adaptationNotes: string[] = [];

    for (const rep of sanitized.replacements) {
      adaptationNotes.push(`Variable Claude Code normalisée : ${rep}.`);
    }

    const rawDesc =
      split.parsedFrontmatter && typeof split.parsedFrontmatter.description === 'string'
        ? split.parsedFrontmatter.description
        : extractFirstHeadingOrSentence(
            sanitized.content,
            `Use this skill when working on ${slug} tasks.`
          );

    const cleanDescription =
      rawDesc.replace(/\s*\r?\n\s*/g, ' ').trim().length >= 10
        ? rawDesc.replace(/\s*\r?\n\s*/g, ' ').trim()
        : `Use this skill when performing ${slug} development and verification workflows.`;

    // Collecter les fichiers de ressources sûrs du même dossier de skill (`references/`, `resources/`, `examples/`)
    const prefix = `skills/${rawFolder}/`;
    const subEntries = entries.filter(
      (e) => e.relativePath.startsWith(prefix) && e.relativePath !== skillEntry.relativePath
    );

    const safeResources: Array<{ relativeSubPath: string; content: string; sha256: string }> = [];
    const skippedUnsafeFiles: string[] = [];

    for (const sub of subEntries) {
      const subRel = sub.relativePath.slice(prefix.length);
      if (
        /^(?:(?:references|resources|examples)\/)?[a-zA-Z0-9._-]+\.(?:md|json|yaml|yml|txt|css)$/i.test(
          subRel
        )
      ) {
        const sanitizedRes = sanitizeClaudeSpecificReferences(sub.content);
        safeResources.push({
          relativeSubPath: subRel,
          content: sanitizedRes.content,
          sha256: computeSha256(sanitizedRes.content),
        });
      } else {
        skippedUnsafeFiles.push(subRel);
      }
    }

    if (skippedUnsafeFiles.length > 0) {
      adaptationNotes.push(
        `Sous-fichiers exclus par politique de sécurité V1 : ${skippedUnsafeFiles.join(', ')}.`
      );
    }

    // Nettoyage des liens relatifs cassés vers des scripts ou fichiers exclus
    const availableSubPaths = new Set(safeResources.map((r) => `./${r.relativeSubPath}`));
    const cleanedBody = sanitized.content.replace(
      /\[([^\]]+)\]\((\.\/[^)#\s]+)\)/g,
      (fullMatch, label: string, relLink: string) => {
        if (availableSubPaths.has(relLink)) {
          return fullMatch;
        }
        adaptationNotes.push(`Lien relatif vers fichier non embarqué '${relLink}' converti en texte.`);
        return `\`${label} (${relLink})\``;
      }
    );

    const adaptedSkillMd = serializeAntigravitySkill(
      {
        name: slug,
        description: cleanDescription,
        license,
        metadata: { origin: 'ECC' },
      },
      cleanedBody
    );

    const validationFiles = [
      { relativePath: `.agents/skills/${slug}/SKILL.md`, content: adaptedSkillMd },
      ...safeResources.map((r) => ({
        relativePath: `.agents/skills/${slug}/${r.relativeSubPath}`,
        content: r.content,
      })),
    ];

    const skillIssues = validateSkills(validationFiles);
    const hasError = skillIssues.some((i) => i.severity === 'error');
    const inferred = inferTagsAndStack(`${slug} ${cleanDescription} ${cleanedBody}`, 'skill');

    components.push({
      externalId,
      slug,
      kind: 'SKILL',
      name: slug,
      description: cleanDescription,
      sourceRelativePath: skillEntry.relativePath,
      sourceUrl: `${repoUrl}/blob/${commitSha}/${skillEntry.relativePath}`,
      license,
      contentSha256: computeSha256(skillEntry.content),
      rawContent: skillEntry.content,
      adaptedContent: adaptedSkillMd,
      parsedMeta: {
        family: 'skill',
        tags: inferred.tags,
        languages: inferred.languages,
        frameworks: inferred.frameworks,
        dependencies: [],
        hasResources: safeResources.length > 0,
        resourcesList: safeResources,
        skippedUnsafeFiles,
        adaptationNotes,
      },
      compatibilityStatus: hasError ? 'INCOMPATIBLE' : 'AUTO_VALIDATED',
      compatibilityIssues: skillIssues,
      searchText: `${slug} ${cleanDescription} ${inferred.tags.join(' ')}`,
    });
  }

  // 4. Conversion sélective des commandes (`commands/<name>.md`) non couvertes par un Skill existant
  // en Skills natifs (`.agents/skills/<name>/SKILL.md`), conformément à l'arbitrage Q3 et au §4.4 du CDC.
  for (const entry of entries) {
    const cmdMatch = entry.relativePath.match(/^commands\/([^/]+)\.md$/i);
    if (!cmdMatch?.[1]) continue;

    const rawCmdName = cmdMatch[1];
    if (rawCmdName.toLowerCase() === 'readme') continue;

    const slug = toKebabSlug(rawCmdName);
    if (existingSkillSlugs.has(slug)) {
      // Déjà couvert par un Skill natif du même nom : on évite le doublon (§3.5 & FR-05)
      continue;
    }

    const externalId = `command-skill:${slug}`;
    if (seenExternalIds.has(externalId)) continue;
    seenExternalIds.add(externalId);

    const split = splitMarkdownFrontmatter(entry.content);
    const sanitized = sanitizeClaudeSpecificReferences(split.body);
    const adaptationNotes: string[] = [
      "Conversion d'une commande slash ('commands/') en Skill natif Antigravity ('.agents/skills/<name>/SKILL.md') suite à l'arrêt annoncé des workflows le 19 octobre 2026 (§4.4 CDC).",
    ];

    for (const rep of sanitized.replacements) {
      adaptationNotes.push(`Variable Claude Code normalisée : ${rep}.`);
    }

    const rawDesc =
      split.parsedFrontmatter && typeof split.parsedFrontmatter.description === 'string'
        ? split.parsedFrontmatter.description
        : extractFirstHeadingOrSentence(
            sanitized.content,
            `Use this skill when executing the ${slug} procedure.`
          );

    const cleanDescription =
      rawDesc.replace(/\s*\r?\n\s*/g, ' ').trim().length >= 10
        ? rawDesc.replace(/\s*\r?\n\s*/g, ' ').trim()
        : `Use this skill when the user requests the ${slug} workflow or procedure.`;

    const cleanedBody = sanitized.content.replace(
      /\[([^\]]+)\]\((\.\/[^)#\s]+)\)/g,
      (_m, label: string, relLink: string) => `\`${label} (${relLink})\``
    );

    const adaptedSkillMd = serializeAntigravitySkill(
      {
        name: slug,
        description: cleanDescription,
        license,
        metadata: { origin: 'ECC-command-converted' },
      },
      cleanedBody.trim().length > 0 ? cleanedBody : `# ${slug}\n\n${cleanDescription}`
    );

    const skillIssues = validateSkills([
      { relativePath: `.agents/skills/${slug}/SKILL.md`, content: adaptedSkillMd },
    ]);
    const hasError = skillIssues.some((i) => i.severity === 'error');
    const inferred = inferTagsAndStack(`${slug} ${cleanDescription} ${cleanedBody}`, 'workflow');

    components.push({
      externalId,
      slug,
      kind: 'COMMAND_CONVERTED',
      name: slug,
      description: cleanDescription,
      sourceRelativePath: entry.relativePath,
      sourceUrl: `${repoUrl}/blob/${commitSha}/${entry.relativePath}`,
      license,
      contentSha256: computeSha256(entry.content),
      rawContent: entry.content,
      adaptedContent: adaptedSkillMd,
      parsedMeta: {
        family: 'workflow-converted',
        tags: inferred.tags,
        languages: inferred.languages,
        frameworks: inferred.frameworks,
        dependencies: [],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes,
      },
      compatibilityStatus: hasError ? 'INCOMPATIBLE' : 'AUTO_VALIDATED',
      compatibilityIssues: skillIssues,
      searchText: `${slug} ${cleanDescription} ${inferred.tags.join(' ')}`,
    });
  }

  components.sort((a, b) => a.externalId.localeCompare(b.externalId));
  return { components };
}
