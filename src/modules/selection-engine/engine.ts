import { ProjectProfile } from '../project-profile/schema';
import { EccComponentParsedMeta } from '../../db/schema';
import {
  ALL_EXCELLENCE_PACKS,
  ComponentKind,
  CustomComponentSpec,
  ExcellencePack,
  PresetMode,
  RejectedComponent,
  ScoreBreakdown,
  SelectedComponent,
  SelectionResult,
} from './schema';
import { synthesizeProjectCustomComponents } from './custom-rules-synthesizer';
import {
  ComponentClassification,
  Methodology,
  SlotTier,
  buildProjectContext,
  classifyComponent,
  unmetRequirement,
} from './component-classifier';
import type { ValidationIssue } from '../antigravity-adapter/schema';

/** Paliers de slots inclus par preset. */
const PRESET_TIERS: Record<PresetMode, SlotTier[]> = {
  MINIMAL: ['core'],
  BALANCED: ['core', 'standard'],
  THOROUGH: ['core', 'standard', 'extended'],
};

export interface CatalogCandidateInput {
  slug: string;
  name: string;
  kind: ComponentKind;
  description: string;
  sourceRelativePath?: string;
  sourceUrl?: string;
  license?: string;
  adaptedContent: string;
  parsedMeta: EccComponentParsedMeta;
  compatibilityStatus: string;
  compatibilityIssues?: ValidationIssue[];
  searchText?: string;
}

export interface SelectionEngineOptions {
  presetMode?: PresetMode;
  userIncludes?: string[];
  userExcludes?: string[];
  customComponents?: CustomComponentSpec[];
  excellencePacks?: ExcellencePack[];
  /** Méthodologies retenues comme ensembles (défaut : superpowers ; + ponytail hors preset MINIMAL). */
  methodologies?: Methodology[];
}

const KNOWN_EXCLUSIVE_TECH = [
  'perl',
  'python',
  'ruby',
  'php',
  'csharp',
  'cpp',
  'c++',
  'rust',
  'go',
  'golang',
  'java',
  'kotlin',
  'swift',
  'dart',
  'flutter',
  'elixir',
  'clojure',
  'scala',
  'haskell',
  'arkts',
  'react-native',
  'vue',
  'angular',
  'django',
  'fastapi',
  'rails',
  'laravel',
  'spring',
  'springboot',
  'quarkus',
  'android',
  'expo',
  'ios',
  'harmonyos',
  'fsharp',
  'pytorch',
  'gan',
  'mybatis',
  'mysql',
  'mariadb',
  'mongodb',
  'cassandra',
  'solana',
  'x402',
  'flox',
  'mle',
];

const CANONICAL_LANG_MAP: Record<string, string[]> = {
  typescript: ['typescript', 'ts'],
  javascript: ['javascript', 'js'],
  python: ['python', 'py'],
  java: ['java', 'jvm'],
  csharp: ['csharp', 'c#', 'cs', 'dotnet', '.net'],
  cpp: ['cpp', 'c++'],
  c: ['c'],
  rust: ['rust', 'rs'],
  go: ['go', 'golang'],
  ruby: ['ruby', 'rb'],
  php: ['php'],
  kotlin: ['kotlin', 'kt'],
  swift: ['swift'],
  dart: ['dart'],
  elixir: ['elixir'],
  sql: ['sql'],
  html: ['html', 'css', 'html/css'],
};

export function normalizeLangToken(lang: string): string {
  const clean = lang.toLowerCase().trim().replace(/[.\-_]/g, '');
  for (const [canonical, aliases] of Object.entries(CANONICAL_LANG_MAP)) {
    if (canonical === clean || aliases.includes(clean)) {
      return canonical;
    }
  }
  return clean;
}

export function matchLanguagesStrict(langA: string, langB: string): boolean {
  const normA = normalizeLangToken(langA);
  const normB = normalizeLangToken(langB);
  if (normA === normB) return true;
  // TypeScript est compatible avec JavaScript
  if (normA === 'typescript' && normB === 'javascript') return true;
  if (normA === 'javascript' && normB === 'typescript') return true;
  return false;
}

const TDD_SLUG_REGEX = /(^|-)test(ing)?(-|$)/;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Recherche d'un tag en mot entier (« api » ne correspond plus à « rapide »). */
const containsWord = (text: string, word: string) =>
  new RegExp(`(?:^|[^a-z0-9à-ÿ])${escapeRegExp(word.toLowerCase())}(?:$|[^a-z0-9à-ÿ])`).test(text);


/** Plafonds par preset pour le catalogue classé (sous-agents et skills). */
const CLASSIFIED_CAPS: Record<PresetMode, Partial<Record<ComponentKind, number>>> = {
  MINIMAL: { SUBAGENT: 4, SKILL: 10 },
  BALANCED: { SUBAGENT: 8, SKILL: 20 },
  THOROUGH: { SUBAGENT: 12, SKILL: 30 },
};

export class SelectionEngine {
  /**
   * Sélection explicable par slots fonctionnels :
   * 1. Filtres bloquants (exclusion utilisateur, incompatibilité, outillage propre à Claude Code, stack).
   * 2. Classification : chaque composant reçoit un slot (une fonction), un palier et des conditions d'application.
   * 3. Un seul composant par slot : source prioritaire, puis composant le plus spécifique, puis score.
   *    Les méthodologies (superpowers, ponytail) sont retenues comme des ensembles cohérents.
   * Les catalogues ad hoc (sources non enregistrées) conservent le comportement historique (seuil + quotas).
   */
  selectComponents(
    profile: ProjectProfile,
    catalog: CatalogCandidateInput[],
    options: SelectionEngineOptions = {}
  ): SelectionResult {
    const preset = options.presetMode ?? 'BALANCED';
    const excellencePacks = options.excellencePacks ?? [...ALL_EXCELLENCE_PACKS];
    const methodologies = new Set<Methodology>(
      options.methodologies ?? (preset === 'MINIMAL' ? ['superpowers'] : ['superpowers', 'ponytail'])
    );
    const userIncludes = new Set(options.userIncludes ?? []);
    const userExcludes = new Set(options.userExcludes ?? []);
    const allowedTiers = new Set<SlotTier>(PRESET_TIERS[preset]);
    const ctx = buildProjectContext(profile);

    // Seuils historiques, appliqués uniquement aux catalogues ad hoc
    const thresholds = {
      MINIMAL: { minScore: 40, maxRules: 6, maxSubagents: 2, maxSkills: 4 },
      BALANCED: { minScore: 25, maxRules: 12, maxSubagents: 4, maxSkills: 8 },
      THOROUGH: { minScore: 15, maxRules: 24, maxSubagents: 6, maxSkills: 16 },
    }[preset];

    const projectLangs = (profile.techStack?.languages ?? []).map((l) => l.toLowerCase());
    const projectFrameworks = (profile.techStack?.frameworks ?? []).map((f) => f.toLowerCase());
    const projectDatabases = (profile.techStack?.databases ?? []).map((d) => d.toLowerCase());
    const projectTools = (profile.techStack?.testingTools ?? []).map((t) => t.toLowerCase());
    const projectInfra = (profile.techStack?.infrastructureAndDeployment ?? []).map((i) => i.toLowerCase());

    const projectDomainText = [
      profile.projectName,
      profile.projectDescription,
      profile.domainAndObjective?.value ?? '',
      ...projectDatabases,
      ...projectTools,
      ...projectInfra,
      ...(profile.features ?? []).map((f) => `${f.title} ${f.description}`),
      ...(profile.architectureConstraints ?? []).map((a) => a.value),
      ...(profile.securityAndCompliance ?? []).map((s) => s.value),
      ...(profile.qualityAndTestingStrategy ?? []).map((q) => q.value),
    ]
      .join(' ')
      .toLowerCase();

    const selectedList: SelectedComponent[] = [];
    const rejectedList: RejectedComponent[] = [];
    const reject = (item: CatalogCandidateInput, reason: RejectedComponent['rejectionReason'], rationale: string, rawScore = 0, supersededBySlug?: string) =>
      rejectedList.push({ slug: item.slug, name: item.name, kind: item.kind, rejectedRationale: rationale, rejectionReason: reason, rawScore, supersededBySlug });

    type Candidate = { item: CatalogCandidateInput; score: ScoreBreakdown; cls: ComponentClassification; legacy: boolean; forced: boolean };
    const candidates: Candidate[] = [];

    // --- PASSE 1 : filtres bloquants et classification ---
    for (const item of catalog) {
      const forced = userIncludes.has(item.slug);
      if (userExcludes.has(item.slug)) {
        reject(item, 'USER_EXCLUDED', `Écarté explicitement par l'utilisateur via les préférences de sélection.`);
        continue;
      }
      if (item.compatibilityStatus === 'INCOMPATIBLE') {
        const detail = (item.compatibilityIssues ?? []).find((i) => i.severity === 'error')?.message;
        reject(item, 'SECURITY_OR_SAFETY_REJECTION', detail ?? `Incompatible avec Google Antigravity (dépassement de limites ou éléments non supportés).`);
        continue;
      }

      const cls = classifyComponent(item);
      const legacy = cls.slot?.startsWith('legacy:') ?? false;

      if (cls.exclusion && !forced) {
        reject(item, cls.exclusion.code === 'NOT_SOFTWARE_DOMAIN' ? 'NOT_APPLICABLE_TO_PROJECT' : 'PLATFORM_SPECIFIC_OR_META', cls.exclusion.reason);
        continue;
      }

      // Composants classés d'une source enregistrée : les conditions du classifieur remplacent l'inférence de stack
      // depuis le texte (peu fiable : un skill de méthodologie cite souvent des exemples TypeScript).
      if (!legacy && cls.slot) {
        const unmet = forced ? null : unmetRequirement(cls.requires, ctx, excellencePacks);
        if (unmet) {
          const isStack = cls.requires.some((r) => ['stack', 'ui', 'database', 'backend', 'e2e', 'infra', 'mobile'].includes(r.kind)) && !/domaine|pack/.test(unmet);
          reject(item, isStack ? 'STACK_INCOMPATIBLE' : 'NOT_APPLICABLE_TO_PROJECT', `Non applicable : ${unmet}.`);
          continue;
        }
      } else {
        const legacyRejection = forced ? null : this.legacyStackRejection(item, profile, projectLangs, projectFrameworks, projectDatabases, projectInfra, projectDomainText);
        if (legacyRejection) {
          reject(item, 'STACK_INCOMPATIBLE', legacyRejection);
          continue;
        }
        if (!forced) {
          const unmet = unmetRequirement(cls.requires, ctx, excellencePacks);
          if (unmet) {
            reject(item, 'NOT_APPLICABLE_TO_PROJECT', `Non applicable : ${unmet}.`);
            continue;
          }
        }
      }

      const score = this.calculateCandidateScore(item, projectLangs, projectFrameworks, projectDomainText, forced, excellencePacks, profile, cls.slot);
      candidates.push({ item, score, cls, legacy, forced });
    }

    // --- PASSE 2 : paliers, méthodologies et slots ---
    const eligible: Candidate[] = [];
    for (const c of candidates) {
      if (c.forced) {
        eligible.push(c);
        continue;
      }
      if (!c.cls.slot) {
        reject(c.item, 'NO_FUNCTIONAL_SLOT', `Aucune fonction identifiée pour ce composant dans un projet de développement ; sélectionnable manuellement.`, c.score.totalScore);
        continue;
      }
      if (c.cls.methodology && !methodologies.has(c.cls.methodology)) {
        reject(c.item, 'METHODOLOGY_DISABLED', `Méthodologie « ${c.cls.methodology} » non activée pour ce harnais.`, c.score.totalScore);
        continue;
      }
      if (!c.legacy && !allowedTiers.has(c.cls.tier)) {
        reject(c.item, 'TIER_NOT_IN_PRESET', `Composant de palier « ${c.cls.tier} », non inclus dans le preset ${preset}.`, c.score.totalScore);
        continue;
      }
      if (c.legacy && c.score.totalScore < thresholds.minScore) {
        reject(c.item, 'SCORE_BELOW_PRESET_THRESHOLD', `Score de pertinence (${c.score.totalScore}/100) inférieur au seuil requis (${thresholds.minScore}/100) pour le preset ${preset}.`, c.score.totalScore);
        continue;
      }
      eligible.push(c);
    }

    const bySlot = new Map<string, Candidate[]>();
    const winners: Array<{ c: Candidate; supersedes: Candidate[] }> = [];
    for (const c of eligible) {
      if (c.forced || !c.cls.slot) {
        winners.push({ c, supersedes: [] });
        continue;
      }
      const list = bySlot.get(c.cls.slot) ?? [];
      list.push(c);
      bySlot.set(c.cls.slot, list);
    }
    const forcedSlots = new Set(eligible.filter((c) => c.forced && c.cls.slot).map((c) => c.cls.slot!));
    for (const [slot, list] of bySlot) {
      list.sort(
        (a, b) =>
          b.cls.sourcePriority - a.cls.sourcePriority ||
          b.cls.specificity - a.cls.specificity ||
          b.score.totalScore - a.score.totalScore ||
          a.item.slug.localeCompare(b.item.slug)
      );
      if (forcedSlots.has(slot)) {
        const forcedWinner = eligible.find((c) => c.forced && c.cls.slot === slot)!;
        for (const loser of list) {
          reject(loser.item, 'DEDUPLICATED_FAMILY_OVERRIDDEN', `Fonction « ${slot} » déjà couverte par « ${forcedWinner.item.slug} », choisi par l'utilisateur.`, loser.score.totalScore, forcedWinner.item.slug);
        }
        continue;
      }
      const [winner, ...losers] = list;
      for (const loser of losers) {
        reject(loser.item, 'DEDUPLICATED_FAMILY_OVERRIDDEN', `Doublon fonctionnel évité : la fonction « ${slot} » est couverte par « ${winner!.item.slug} » (source ${winner!.cls.sourceId}, priorité ${winner!.cls.sourcePriority}).`, loser.score.totalScore, winner!.item.slug);
      }
      winners.push({ c: winner!, supersedes: losers });
    }

    // Ordre de sortie stable : score décroissant puis slug
    winners.sort((a, b) => b.c.score.totalScore - a.c.score.totalScore || a.c.item.slug.localeCompare(b.c.item.slug));

    // Quotas historiques pour les catalogues ad hoc uniquement
    const legacyCounts = { RULE: 0, SUBAGENT: 0, SKILL: 0, COMMAND_CONVERTED: 0 } as Record<ComponentKind, number>;
    const legacyMax: Partial<Record<ComponentKind, number>> = { RULE: thresholds.maxRules, SUBAGENT: thresholds.maxSubagents, SKILL: thresholds.maxSkills };
    // Plafonds du catalogue classé (pertinence avant quantité). Classement : palier (core, puis standard,
    // puis extended), puis score ; les presets restent emboîtés. Ni les règles (budget de contexte), ni les
    // méthodologies (retenues d'un bloc), ni les choix de l'utilisateur ne sont plafonnés.
    const classifiedMax: Partial<Record<ComponentKind, number>> = CLASSIFIED_CAPS[preset];
    const TIER_RANK: Record<SlotTier, number> = { core: 0, standard: 1, extended: 2 };
    const cappedOut = new Set<string>();
    const classifiedCounts = { RULE: 0, SUBAGENT: 0, SKILL: 0, COMMAND_CONVERTED: 0 } as Record<ComponentKind, number>;
    for (const { c } of winners
      .filter(({ c }) => !c.legacy && !c.forced && !c.cls.methodology && classifiedMax[c.item.kind] !== undefined)
      .sort(
        (a, b) =>
          TIER_RANK[a.c.cls.tier] - TIER_RANK[b.c.cls.tier] ||
          b.c.score.totalScore - a.c.score.totalScore ||
          a.c.item.slug.localeCompare(b.c.item.slug)
      )) {
      if (classifiedCounts[c.item.kind] >= classifiedMax[c.item.kind]!) cappedOut.add(`${c.item.kind}:${c.item.slug}`);
      else classifiedCounts[c.item.kind]++;
    }

    for (const { c, supersedes } of winners) {
      const { item, score, cls, forced } = c;
      if (c.legacy && !forced) {
        const max = legacyMax[item.kind];
        if (max !== undefined && legacyCounts[item.kind] >= max) {
          const label = item.kind === 'RULE' ? 'règles' : item.kind === 'SUBAGENT' ? 'sous-agents' : 'compétences / skills';
          reject(item, 'SCORE_BELOW_PRESET_THRESHOLD', `Quota maximum de ${label} (${max}) atteint pour le preset ${preset}.`, score.totalScore);
          continue;
        }
        legacyCounts[item.kind]++;
      } else if (cappedOut.has(`${item.kind}:${item.slug}`)) {
        const label = item.kind === 'SUBAGENT' ? 'sous-agents' : 'skills';
        reject(item, 'SCORE_BELOW_PRESET_THRESHOLD', `Plafond de ${classifiedMax[item.kind]} ${label} atteint pour le preset ${preset} : les composants mieux notés ont été retenus.`, score.totalScore);
        continue;
      }

      selectedList.push({
        slug: item.slug,
        name: item.name,
        kind: item.kind,
        description: item.description || '',
        origin: 'ECC_ADAPTED',
        sourceRelativePath: item.sourceRelativePath,
        sourceUrl: item.sourceUrl,
        license: item.license ?? 'MIT',
        acceptedRationale: this.buildRationale(score, forced, projectLangs, projectFrameworks, cls, supersedes.map((s) => s.item.slug)),
        score,
        family: item.parsedMeta.family,
        slot: cls.slot,
        sourceId: cls.sourceId,
        sourceAuthor: item.parsedMeta.sourceAuthor,
        methodology: cls.methodology,
        dependencies: item.parsedMeta.dependencies ?? [],
        adaptedContent: item.adaptedContent,
        resources:
          item.kind === 'SKILL' && (item.parsedMeta.resourcesList ?? []).length > 0
            ? item.parsedMeta.resourcesList.map((r) => ({ relativeSubPath: r.relativeSubPath, content: r.content }))
            : undefined,
        recommendedModelTier:
          item.parsedMeta.adaptedModel === 'flash' || item.parsedMeta.adaptedModel === 'pro' ? item.parsedMeta.adaptedModel : undefined,
        recommendedEffort: item.parsedMeta.recommendedEffort,
        userModified: forced,
      });
    }

    // --- IDENTIFICATION DES BESOINS NON COUVERTS PAR ECC & GOUVERNANCE AUTOMATIQUE (§7 FR-05) ---
    const customComponents = synthesizeProjectCustomComponents({
      profile,
      selectedList,
      projectFrameworks,
      projectDomainText,
      initialCustomComponents: options.customComponents,
      userExcludes: options.userExcludes,
    });

    // --- VÉRIFICATION DES DÉPENDANCES ET CONFLITS ---
    const dependencyWarnings: string[] = [];
    const conflictWarnings: string[] = [];
    const selectedSlugs = new Set([
      ...selectedList.map((s) => s.slug),
      ...customComponents.map((c) => c.slug),
    ]);

    for (const comp of selectedList) {
      for (const dep of comp.dependencies) {
        if (!selectedSlugs.has(dep)) {
          dependencyWarnings.push(
            `Le composant "${comp.name}" (${comp.slug}) recommande la dépendance "${dep}", qui n'est pas incluse dans la sélection actuelle.`
          );
        }
      }
    }

    // Estimation du budget de tokens pour les règles (incluant les règles custom always_on comme model-effort-governance)
    let estimatedTokens = 0;
    for (const comp of selectedList) {
      if (comp.kind === 'RULE') {
        estimatedTokens += Math.ceil(comp.adaptedContent.length / 4);
      }
    }
    for (const custom of customComponents) {
      if (custom.kind === 'RULE' && /trigger:\s*always_on/.test(custom.content)) {
        estimatedTokens += Math.ceil(custom.content.length / 4);
      }
    }
    const maxBudget = 20000;
    const rulesPercent = Math.min(100, Math.round((estimatedTokens / maxBudget) * 100));

    return {
      presetMode: preset,
      targetSurface: profile.targetSurface,
      excellencePacks,
      selectedComponents: selectedList,
      rejectedComponents: rejectedList,
      customComponents,
      dependencyWarnings,
      conflictWarnings,
      totalTokensEstimated: estimatedTokens,
      budgetCompliance: {
        rulesBudgetTokens: estimatedTokens,
        rulesBudgetPercent: rulesPercent,
        isWithinLimit: estimatedTokens <= maxBudget,
      },
    };
  }

  /** Filtres de stack historiques, utilisés pour les composants non classés par une source enregistrée. */
  private legacyStackRejection(
    item: CatalogCandidateInput,
    profile: ProjectProfile,
    projectLangs: string[],
    projectFrameworks: string[],
    projectDatabases: string[],
    projectInfra: string[],
    projectDomainText: string
  ): string | null {
    const itemLangs = (item.parsedMeta.languages ?? []).map((l) => l.toLowerCase());
    const isGeneralMethodologySkill =
      item.kind === 'SKILL' &&
      (item.parsedMeta.family === 'quality' ||
        item.parsedMeta.family === 'security' ||
        item.parsedMeta.family === 'testing' ||
        (item.parsedMeta.tags ?? []).some((t) =>
          ['security', 'audit', 'yagni', 'anti-overengineering', 'sdlc', 'tdd', 'methodology', 'quality'].includes(t.toLowerCase())
        ));

    if (itemLangs.length > 0 && !isGeneralMethodologySkill) {
      const hasMatchingLang = itemLangs.some((lang) => projectLangs.some((pLang) => matchLanguagesStrict(lang, pLang)));
      if (!hasMatchingLang) {
        return `Incompatible avec la stack du projet : composant ciblant [${itemLangs.join(', ')}] alors que le projet utilise [${projectLangs.join(', ')}].`;
      }
    }

    const slugLower = item.slug.toLowerCase();
    const familyLower = (item.parsedMeta.family ?? '').toLowerCase();
    const isPostgresProject = projectDatabases.some((d) => d.includes('postgres'));
    const isMysqlProject = projectDatabases.some((d) => d.includes('mysql') || d.includes('mariadb'));
    if (isPostgresProject && !isMysqlProject && (slugLower.includes('mysql') || slugLower.includes('mariadb') || familyLower === 'mysql')) {
      return `Incompatible avec la base de données du projet : composant ciblant MySQL/MariaDB alors que le projet utilise PostgreSQL.`;
    }

    if (item.slug === 'agent-payment-x402' && !/\bx402\b|\bsolana\b|crypto wallet|\bweb3\b/.test(projectDomainText)) {
      return `Le composant 'agent-payment-x402' est spécifique aux micro-paiements crypto/web3 autonomes pour agents et ne convient pas aux applications web de paiement standard ou SEPA.`;
    }
    if (item.slug === 'flox-environments' && !/\bflox\b/.test(`${projectInfra.join(' ')} ${projectDomainText}`)) {
      return `Le composant 'flox-environments' requiert l'outillage Flox non présent dans l'infrastructure du projet.`;
    }

    for (const tech of KNOWN_EXCLUSIVE_TECH) {
      const isTechInProject =
        projectLangs.some((l) => matchLanguagesStrict(l, tech)) ||
        projectFrameworks.some((f) => f.trim() === tech || f.includes(`/${tech}/`)) ||
        projectDatabases.some((d) => d.trim() === tech) ||
        projectInfra.some((i) => i.trim() === tech) ||
        (profile.techStack?.ormAndDataLayer ?? []).some((o) => o.toLowerCase().trim() === tech);
      if (
        !isTechInProject &&
        (familyLower === tech ||
          slugLower === tech ||
          slugLower.startsWith(`${tech}-`) ||
          slugLower.endsWith(`-${tech}`) ||
          slugLower.includes(`/${tech}/`) ||
          slugLower.includes(`-${tech}-`))
      ) {
        return `Technologie spécifique [${tech}] non utilisée dans la stack de ce projet.`;
      }
    }

    const itemFrameworks = (item.parsedMeta.frameworks ?? []).map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));
    const normProjectFrameworks = projectFrameworks.map((f) => f.replace(/[.\-_]/g, ''));
    if (itemFrameworks.length > 0 && !isGeneralMethodologySkill && normProjectFrameworks.length > 0) {
      const hasMatchingFramework = itemFrameworks.some((fw) => normProjectFrameworks.some((pFw) => pFw.includes(fw) || fw.includes(pFw)));
      if (!hasMatchingFramework) {
        return `Framework non ciblé : composant prévu pour [${(item.parsedMeta.frameworks ?? []).join(', ')}] non présent dans la stack [${projectFrameworks.join(', ')}].`;
      }
    }
    return null;
  }

  private buildRationale(
    score: ScoreBreakdown,
    forced: boolean,
    projectLangs: string[],
    projectFrameworks: string[],
    cls: ComponentClassification,
    supersededSlugs: string[]
  ): string {
    if (forced) return `Sélectionné expressément par l'utilisateur.`;
    const parts: string[] = [];
    if (cls.slot && !cls.slot.startsWith('legacy:')) {
      parts.push(`Fonction « ${cls.slot} » (source ${cls.sourceId}${cls.methodology ? `, méthodologie ${cls.methodology}` : ''}).`);
      if (supersededSlugs.length > 0) parts.push(`Préféré à : ${supersededSlugs.slice(0, 4).join(', ')}.`);
    }
    if (score.languageMatch > 0) parts.push(`Correspondance directe avec les langages [${projectLangs.join(', ')}].`);
    if (score.frameworkMatch > 0) parts.push(`Adapté aux frameworks utilisés [${projectFrameworks.join(', ')}].`);
    if (score.matchingKeywords.length > 0) parts.push(`Mots-clés pertinents détectés : ${score.matchingKeywords.slice(0, 4).join(', ')}.`);
    if (score.architectureSecurityMatch > 0) parts.push(`Répond aux contraintes d'architecture ou de sécurité spécifiées.`);
    if (score.coreBaseBonus > 0) parts.push(`Règle transverse fondamentale de qualité logicielle.`);
    if (score.excellenceBonus > 0) {
      if (score.matchingKeywords.includes('pack:security-hardened'))
        parts.push(`Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust).`);
      if (score.matchingKeywords.includes('pack:design-craft-polish'))
        parts.push(`Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité).`);
      if (score.matchingKeywords.includes('pack:extreme-tdd-anti-bug'))
        parts.push(`Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli).`);
    }
    if (score.synergyBonus > 0) parts.push(`Synergie d'écosystème renforcée avec la stack et les outils du projet.`);
    return parts.join(' ') || `Score élevé (${score.totalScore}/100) pour le profil du projet.`;
  }

  private calculateCandidateScore(
    item: CatalogCandidateInput,
    projectLangs: string[],
    projectFrameworks: string[],
    domainText: string,
    isForced: boolean,
    excellencePacks: ExcellencePack[] = [],
    profile?: ProjectProfile,
    domainSlot?: string
  ): ScoreBreakdown {
    if (isForced) {
      return {
        totalScore: 100,
        languageMatch: 35,
        frameworkMatch: 30,
        domainTagMatch: 20,
        architectureSecurityMatch: 15,
        coreBaseBonus: 0,
        excellenceBonus: 0,
        synergyBonus: 0,
        matchingKeywords: ['user_forced_inclusion'],
      };
    }

    let languageMatch = 0;
    let frameworkMatch = 0;
    let domainTagMatch = 0;
    let architectureSecurityMatch = 0;
    let coreBaseBonus = 0;
    let excellenceBonus = 0;
    let synergyBonus = 0;
    const matchingKeywords: string[] = [];

    // Normalisation des langages et frameworks
    const normProjectLangs = projectLangs.map((l) => l.toLowerCase().replace(/[.\-_]/g, ''));
    if (normProjectLangs.includes('typescript') && !normProjectLangs.includes('javascript')) {
      normProjectLangs.push('javascript', 'js');
    }
    const normProjectFrameworks = projectFrameworks.map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));

    // Langages (+35 pts max)
    const itemLangs = item.parsedMeta.languages ?? [];
    for (const lang of itemLangs) {
      if (projectLangs.some((pLang) => matchLanguagesStrict(lang, pLang))) {
        languageMatch = Math.max(languageMatch, 35);
        matchingKeywords.push(`lang:${normalizeLangToken(lang)}`);
      }
    }

    // Frameworks (+30 pts max)
    const itemFrameworks = (item.parsedMeta.frameworks ?? []).map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));
    for (const fw of itemFrameworks) {
      if (normProjectFrameworks.some((pFw) => pFw.includes(fw) || fw.includes(pFw))) {
        frameworkMatch = Math.max(frameworkMatch, 30);
        matchingKeywords.push(`framework:${fw}`);
      }
    }

    // Tags & Mots-clés dans la description ou search text (+20 pts max)
    const tags = item.parsedMeta.tags ?? [];
    for (const tag of tags) {
      if (tag.length > 2 && containsWord(domainText, tag)) {
        domainTagMatch = Math.min(20, domainTagMatch + 7);
        matchingKeywords.push(tag);
      }
    }

    // Sécurité / Qualité / Tests / Base de données
    if (
      (item.parsedMeta.family === 'security' || item.name.toLowerCase().includes('security') || item.slug.includes('security')) &&
      (domainText.includes('security') || domainText.includes('sécurité') || domainText.includes('owasp') || domainText.includes('injection') || domainText.includes('hds'))
    ) {
      architectureSecurityMatch += 25;
      matchingKeywords.push('security_focus');
    }

    if (
      (item.parsedMeta.family === 'database' || item.slug.includes('database') || item.slug.includes('migration')) &&
      (domainText.includes('database') || domainText.includes('postgres') || domainText.includes('sql') || domainText.includes('sqlite'))
    ) {
      architectureSecurityMatch += 25;
      matchingKeywords.push('database_focus');
    }

    if (
      (item.parsedMeta.family === 'testing' || item.slug.includes('qa') || item.slug.includes('test')) &&
      (domainText.includes('vitest') || domainText.includes('playwright') || domainText.includes('test'))
    ) {
      architectureSecurityMatch += 20;
      matchingKeywords.push('testing_focus');
    }

    // Rôles clés pour sous-agents (Architecte, Base de données, QA/Tests, Reviewer)
    if (item.kind === 'SUBAGENT') {
      const s = item.slug.toLowerCase();
      if (s === 'architect' || s === 'code-architect') {
        architectureSecurityMatch += 35;
        matchingKeywords.push('role:system_architect');
      } else if (s.includes('database') || s.includes('sql') || s.includes('postgres')) {
        architectureSecurityMatch += 35;
        matchingKeywords.push('role:database_specialist');
      } else if (s.includes('e2e') || s.includes('test') || s.includes('tdd')) {
        architectureSecurityMatch += 30;
        matchingKeywords.push('role:qa_testing');
      } else if (s.includes('security')) {
        architectureSecurityMatch += 25;
        matchingKeywords.push('role:security_auditor');
      } else if (s.includes('reviewer') || s.includes('review')) {
        coreBaseBonus += 25;
        matchingKeywords.push('role:code_reviewer');
      }
    }

    // Bonus pour compétences d'excellence UI / Design Engineering si le projet a un volet interface
    if (
      (item.parsedMeta.tags?.includes('design-engineering') || item.parsedMeta.tags?.includes('ui-polish') || item.slug.includes('emil') || item.slug.includes('animate')) &&
      (normProjectFrameworks.includes('react') || normProjectFrameworks.includes('nextjs') || normProjectFrameworks.includes('vue') || domainText.includes('design') || domainText.includes('ui'))
    ) {
      architectureSecurityMatch += 15;
      coreBaseBonus += 10;
      matchingKeywords.push('design_engineering_excellence');
    }

    // Règles transverses ou de style propre / git (+15 pts bonus)
    if (item.parsedMeta.family === 'common' || item.slug.includes('coding-style') || item.slug.includes('git')) {
      coreBaseBonus = 15;
    }

    // --- PACKS D'EXCELLENCE : Bonus et incitations prioritaires ---
    const itemFamily = item.parsedMeta.family?.toLowerCase() ?? '';
    const itemSlug = item.slug.toLowerCase();
    const itemTags = (item.parsedMeta.tags ?? []).map((t) => t.toLowerCase());

    // Un composant propre à un secteur (santé, crypto…) ne gagne aucun bonus de pack : seul le domaine du projet le justifie.
    const isDomainSpecific = /(?:^|:)domain:/.test(domainSlot ?? '');

    // 1. Pack Sécurité Renforcée (OWASP, Zero-Trust, Injections, Auth)
    if (excellencePacks.includes('SECURITY_HARDENED') && !isDomainSpecific) {
      const isSecurityComp =
        itemFamily === 'security' ||
        itemSlug.includes('security') ||
        itemSlug.includes('audit') ||
        itemSlug.includes('vulnerability') ||
        itemSlug.includes('owasp') ||
        itemSlug.includes('auth') ||
        itemTags.includes('security') ||
        itemTags.includes('audit') ||
        itemTags.includes('vulnerability') ||
        itemTags.includes('owasp') ||
        itemTags.includes('cloudflare') ||
        itemTags.includes('zero-trust');

      if (isSecurityComp) {
        excellenceBonus = Math.max(excellenceBonus, 45);
        matchingKeywords.push('pack:security-hardened');
      }
    }

    // 2. Pack Design & Craft UI/UX (5 états UI, Emil Kowalski, A11y, Design System)
    if (excellencePacks.includes('DESIGN_CRAFT_POLISH') && !isDomainSpecific) {
      const isDesignComp =
        itemFamily === 'design-engineering' ||
        itemSlug.includes('ui-craft') ||
        itemSlug.includes('5-states') ||
        itemSlug.includes('animate') ||
        itemSlug.includes('emil') ||
        itemTags.includes('design-engineering') ||
        itemTags.includes('ui-polish') ||
        itemTags.includes('5-states') ||
        itemTags.includes('accessibility') ||
        itemTags.includes('craft');

      if (isDesignComp) {
        excellenceBonus = Math.max(excellenceBonus, 45);
        matchingKeywords.push('pack:design-craft-polish');
      }
    }

    // 3. Pack Rigueur TDD & Anti-Oublis (Plan d'abord, Test-first, Vérification)
    if (excellencePacks.includes('EXTREME_TDD_ANTI_BUG')) {
      const isTddComp =
        itemFamily === 'testing' ||
        itemSlug.includes('tdd') ||
        itemSlug.includes('anti-omissions') ||
        TDD_SLUG_REGEX.test(itemSlug) ||
        itemSlug.includes('superpowers') ||
        itemSlug.includes('ponytail') ||
        itemTags.includes('tdd') ||
        itemTags.includes('anti-omissions') ||
        itemTags.includes('testing') ||
        itemTags.includes('verification') ||
        itemTags.includes('superpowers') ||
        itemTags.includes('sdlc') ||
        itemTags.includes('methodology') ||
        itemTags.includes('ponytail') ||
        itemTags.includes('yagni') ||
        itemTags.includes('anti-overengineering') ||
        itemTags.includes('minimalism');

      if (isTddComp) {
        excellenceBonus = Math.max(excellenceBonus, 45);
        matchingKeywords.push('pack:extreme-tdd-anti-bug');
      }
    }

    // --- BUNDLE SYNERGIES : Synergies d'écosystème entre outils et composants ---
    if (profile) {
      // 1. Synergie Bundle Testing
      const hasTestingDemand =
        (profile.techStack?.testingTools ?? []).length > 0 ||
        excellencePacks.includes('EXTREME_TDD_ANTI_BUG');
      const isTestingComp =
        itemFamily === 'testing' ||
        itemSlug.includes('test') ||
        itemSlug.includes('tdd') ||
        itemSlug.includes('qa');
      if (hasTestingDemand && isTestingComp) {
        synergyBonus += 15;
        matchingKeywords.push('bundle:testing_synergy');
      }

      // 2. Synergie Bundle Sécurité
      const hasSecurityDemand =
        (profile.securityAndCompliance ?? []).length > 0 ||
        (profile.techStack?.complianceStandards ?? []).length > 0 ||
        excellencePacks.includes('SECURITY_HARDENED');
      const isSecurityComp =
        itemFamily === 'security' ||
        itemSlug.includes('security') ||
        itemSlug.includes('audit');
      if (hasSecurityDemand && isSecurityComp) {
        synergyBonus += 15;
        matchingKeywords.push('bundle:security_synergy');
      }

      // 3. Synergie Bundle UI Craft & Design System
      const hasUiDemand =
        normProjectFrameworks.includes('react') ||
        normProjectFrameworks.includes('nextjs') ||
        normProjectFrameworks.includes('vue') ||
        Boolean(profile.designSystem?.brandIdentity);
      const isUiComp =
        itemFamily === 'design-engineering' ||
        itemSlug.includes('craft') ||
        itemSlug.includes('5-states') ||
        itemSlug.includes('emil');
      if (hasUiDemand && isUiComp) {
        synergyBonus += 15;
        matchingKeywords.push('bundle:ui_craft_synergy');
      }
    }

    const totalScore = Math.min(
      100,
      languageMatch +
        frameworkMatch +
        domainTagMatch +
        architectureSecurityMatch +
        coreBaseBonus +
        excellenceBonus +
        synergyBonus
    );

    return {
      totalScore,
      languageMatch,
      frameworkMatch,
      domainTagMatch,
      architectureSecurityMatch,
      coreBaseBonus,
      excellenceBonus,
      synergyBonus,
      matchingKeywords,
    };
  }
}
