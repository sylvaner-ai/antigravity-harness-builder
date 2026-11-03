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
  searchText?: string;
}

export interface SelectionEngineOptions {
  presetMode?: PresetMode;
  userIncludes?: string[];
  userExcludes?: string[];
  customComponents?: CustomComponentSpec[];
  excellencePacks?: ExcellencePack[];
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

export class SelectionEngine {
  private getSubagentRoleArchetype(slug: string): string {
    const s = slug.toLowerCase();
    if (s.includes('architect')) return 'architect';
    if (s.includes('database') || s.includes('sql') || s.includes('postgres')) return 'database';
    if (s.includes('e2e') || s.includes('test') || s.includes('tdd')) return 'test-qa';
    if (s.includes('security')) return 'security-auditor';
    if (s.includes('performance') || s.includes('optimizer')) return 'performance';
    if (s.includes('reviewer') || s.includes('review')) return 'code-reviewer';
    return slug;
  }

  /**
   * Exécute la sélection explicable en 3 passes (§7 FR-05 & §15.1 Jalon 4) :
   * 1. Filtres bloquants (compatibilité stack, surface, sécurité).
   * 2. Scoring multicritère explicite et déduplication par famille.
   * 3. Justifications lisibles (retenus ET candidats proches écartés) + détection des manques pour composants custom.
   */
  selectComponents(
    profile: ProjectProfile,
    catalog: CatalogCandidateInput[],
    options: SelectionEngineOptions = {}
  ): SelectionResult {
    const preset = options.presetMode ?? 'BALANCED';
    const excellencePacks = options.excellencePacks ?? [...ALL_EXCELLENCE_PACKS];
    const userIncludes = new Set(options.userIncludes ?? []);
    const userExcludes = new Set(options.userExcludes ?? []);

    // Seuils selon le preset
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
    const scoredCandidates: Array<{
      item: CatalogCandidateInput;
      score: ScoreBreakdown;
    }> = [];

    // --- PASSE 1 : Filtres bloquants ---
    for (const item of catalog) {
      if (userExcludes.has(item.slug)) {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Écarté explicitement par l'utilisateur via les préférences de sélection.`,
          rejectionReason: 'USER_EXCLUDED',
          rawScore: 0,
        });
        continue;
      }

      if (item.compatibilityStatus === 'INCOMPATIBLE') {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Incompatible avec Google Antigravity (dépassement de limites ou éléments non supportés).`,
          rejectionReason: 'SECURITY_OR_SAFETY_REJECTION',
          rawScore: 0,
        });
        continue;
      }

      // Compatibilité stack : si le composant exige des langages spécifiques et qu'aucun ne correspond
      const itemLangs = (item.parsedMeta.languages ?? []).map((l) => l.toLowerCase());
      const isGeneralMethodologySkill =
        item.kind === 'SKILL' &&
        (item.parsedMeta.family === 'quality' ||
          item.parsedMeta.family === 'security' ||
          item.parsedMeta.family === 'testing' ||
          (item.parsedMeta.tags ?? []).some((t) =>
            ['security', 'audit', 'yagni', 'anti-overengineering', 'sdlc', 'tdd', 'methodology', 'quality'].includes(
              t.toLowerCase()
            )
          ));

      if (itemLangs.length > 0 && !isGeneralMethodologySkill) {
        const hasMatchingLang = itemLangs.some((lang) =>
          projectLangs.some((pLang) => matchLanguagesStrict(lang, pLang))
        );
        if (!hasMatchingLang) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Incompatible avec la stack du projet : composant ciblant [${itemLangs.join(', ')}] alors que le projet utilise [${projectLangs.join(', ')}].`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      // Filtre bloquant d'exclusion mutuelle des bases de données
      const slugLower = item.slug.toLowerCase();
      const familyLower = (item.parsedMeta.family ?? '').toLowerCase();
      const isPostgresProject = projectDatabases.some((d) => d.includes('postgres'));
      const isMysqlProject = projectDatabases.some((d) => d.includes('mysql') || d.includes('mariadb'));

      if (isPostgresProject && !isMysqlProject) {
        if (slugLower.includes('mysql') || slugLower.includes('mariadb') || familyLower === 'mysql') {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Incompatible avec la base de données du projet : composant ciblant MySQL/MariaDB alors que le projet utilise PostgreSQL.`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      // Filtres bloquants sur composants hors sujet ou inadaptés aux applications web
      if (item.slug === 'agent-security-hardening') {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Le composant 'agent-security-hardening' exclut formellement les applications web standards (réservé aux environnements d'agents purs).`,
          rejectionReason: 'STACK_INCOMPATIBLE',
          rawScore: 0,
        });
        continue;
      }

      if (item.slug === 'agent-payment-x402') {
        const isCryptoProject =
          projectDomainText.includes('x402') ||
          projectDomainText.includes('solana') ||
          projectDomainText.includes('crypto wallet') ||
          projectDomainText.includes('web3');
        if (!isCryptoProject) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Le composant 'agent-payment-x402' est spécifique aux micro-paiements crypto/web3 autonomes pour agents et ne convient pas aux applications web de paiement standard ou SEPA.`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      if (item.slug === 'continuous-learning-v2') {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Le composant 'continuous-learning-v2' est une compétence méta d'apprentissage pour agents, non requise pour une application applicative de gestion.`,
          rejectionReason: 'STACK_INCOMPATIBLE',
          rawScore: 0,
        });
        continue;
      }

      if (item.slug === 'mle-workflow') {
        const isMlProject =
          projectDomainText.includes('machine learning') ||
          projectDomainText.includes('mle') ||
          projectDomainText.includes('pytorch') ||
          projectDomainText.includes('tensorflow') ||
          projectDomainText.includes('entraînement');
        if (!isMlProject) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Le composant 'mle-workflow' est réservé aux projets de machine learning et à l'entraînement de modèles d'IA.`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      if (item.slug === 'flox-environments') {
        const hasFlox = projectInfra.some((i) => i.includes('flox')) || projectDomainText.includes('flox');
        if (!hasFlox) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Le composant 'flox-environments' requiert l'outillage Flox non présent dans l'infrastructure du projet.`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      // Filtre bloquant sur technologies étrangères exclusives (ex: perl, arkts, react-native, flutter, ruby, php, etc.)
      let foreignTechDetected: string | null = null;

      for (const tech of KNOWN_EXCLUSIVE_TECH) {
        const isTechInProject =
          projectLangs.some((l) => matchLanguagesStrict(l, tech)) ||
          projectFrameworks.some((f) => f.toLowerCase().trim() === tech || f.toLowerCase().includes(`/${tech}/`)) ||
          projectDatabases.some((d) => d.toLowerCase().trim() === tech) ||
          projectInfra.some((i) => i.toLowerCase().trim() === tech) ||
          (profile.techStack?.ormAndDataLayer ?? []).some((o) => o.toLowerCase().trim() === tech);

        if (!isTechInProject) {
          if (
            familyLower === tech ||
            slugLower === tech ||
            slugLower.startsWith(`${tech}-`) ||
            slugLower.endsWith(`-${tech}`) ||
            slugLower.includes(`/${tech}/`) ||
            slugLower.includes(`-${tech}-`)
          ) {
            foreignTechDetected = tech;
            break;
          }
        }
      }

      if (foreignTechDetected) {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Technologie spécifique [${foreignTechDetected}] non utilisée dans la stack de ce projet.`,
          rejectionReason: 'STACK_INCOMPATIBLE',
          rawScore: 0,
        });
        continue;
      }

      // Compatibilité frameworks : si le composant est spécifique à un framework et qu'aucun ne correspond
      const itemFrameworks = (item.parsedMeta.frameworks ?? []).map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));
      const normProjectFrameworks = projectFrameworks.map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));
      if (itemFrameworks.length > 0 && !isGeneralMethodologySkill) {
        const hasMatchingFramework = itemFrameworks.some((fw) =>
          normProjectFrameworks.some((pFw) => pFw.includes(fw) || fw.includes(pFw))
        );
        // Si le composant est strictement typé framework (ex: react vs django) et non généraliste
        if (!hasMatchingFramework && normProjectFrameworks.length > 0) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Framework non ciblé : composant prévu pour [${(item.parsedMeta.frameworks ?? []).join(', ')}] non présent dans la stack [${projectFrameworks.join(', ')}].`,
            rejectionReason: 'STACK_INCOMPATIBLE',
            rawScore: 0,
          });
          continue;
        }
      }

      // --- PASSE 2 : Calcul du score multicritère ---
      const score = this.calculateCandidateScore(
        item,
        projectLangs,
        projectFrameworks,
        projectDomainText,
        userIncludes.has(item.slug),
        excellencePacks,
        profile
      );

      scoredCandidates.push({ item, score });
    }

    // Tri par score décroissant
    scoredCandidates.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // Déduplication par famille fonctionnelle et respect des quotas du preset
    const familyWinners = new Map<string, string>(); // family -> winnerSlug
    let rulesCount = 0;
    let subagentsCount = 0;
    let skillsCount = 0;

    for (const { item, score } of scoredCandidates) {
      const isForced = userIncludes.has(item.slug);

      if (!isForced && score.totalScore < thresholds.minScore) {
        rejectedList.push({
          slug: item.slug,
          name: item.name,
          kind: item.kind,
          rejectedRationale: `Score de pertinence (${score.totalScore}/100) inférieur au seuil requis (${thresholds.minScore}/100) pour le preset ${preset}.`,
          rejectionReason: 'SCORE_BELOW_PRESET_THRESHOLD',
          rawScore: score.totalScore,
        });
        continue;
      }

      // Quotas par type
      if (!isForced) {
        if (item.kind === 'RULE' && rulesCount >= thresholds.maxRules) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Quota maximum de règles (${thresholds.maxRules}) atteint pour le preset ${preset}.`,
            rejectionReason: 'SCORE_BELOW_PRESET_THRESHOLD',
            rawScore: score.totalScore,
          });
          continue;
        }
        if (item.kind === 'SUBAGENT' && subagentsCount >= thresholds.maxSubagents) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Quota maximum de sous-agents (${thresholds.maxSubagents}) atteint pour le preset ${preset}.`,
            rejectionReason: 'SCORE_BELOW_PRESET_THRESHOLD',
            rawScore: score.totalScore,
          });
          continue;
        }
        if (item.kind === 'SKILL' && skillsCount >= thresholds.maxSkills) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Quota maximum de compétences / skills (${thresholds.maxSkills}) atteint pour le preset ${preset}.`,
            rejectionReason: 'SCORE_BELOW_PRESET_THRESHOLD',
            rawScore: score.totalScore,
          });
          continue;
        }
      }

      // Déduplication fonctionnelle :
      // - Pour les sous-agents : par archétype de rôle (architecte, base de données, testeur, reviewer)
      // - Pour les autres composants : par famille (hors familles génériques comme 'common', 'general', 'agent', 'skill')
      let dedupeKey: string | null = null;
      if (item.kind === 'SUBAGENT') {
        const archetype = this.getSubagentRoleArchetype(item.slug);
        dedupeKey = `SUBAGENT:${archetype}`;
      } else {
        const family = item.parsedMeta.family;
        if (family && family !== 'common' && family !== 'general' && family !== 'agent' && family !== 'skill') {
          dedupeKey = `${item.kind}:${family}`;
        }
      }

      if (dedupeKey) {
        const existingWinner = familyWinners.get(dedupeKey);
        if (existingWinner && !isForced) {
          rejectedList.push({
            slug: item.slug,
            name: item.name,
            kind: item.kind,
            rejectedRationale: `Doublon fonctionnel évité : le rôle/famille "${dedupeKey}" est déjà couvert par le composant prioritaire "${existingWinner}".`,
            rejectionReason: 'DEDUPLICATED_FAMILY_OVERRIDDEN',
            rawScore: score.totalScore,
            supersededBySlug: existingWinner,
          });
          continue;
        }
        familyWinners.set(dedupeKey, item.slug);
      }

      // --- PASSE 3 : Construction de la justification explicable ---
      const rationaleParts: string[] = [];
      if (isForced) {
        rationaleParts.push(`Sélectionné expressément par l'utilisateur.`);
      } else {
        if (score.languageMatch > 0) {
          rationaleParts.push(`Correspondance directe avec les langages [${projectLangs.join(', ')}].`);
        }
        if (score.frameworkMatch > 0) {
          rationaleParts.push(`Adapté aux frameworks utilisés [${projectFrameworks.join(', ')}].`);
        }
        if (score.matchingKeywords.length > 0) {
          rationaleParts.push(`Mots-clés pertinents détectés : ${score.matchingKeywords.slice(0, 4).join(', ')}.`);
        }
        if (score.architectureSecurityMatch > 0) {
          rationaleParts.push(`Répond aux contraintes d'architecture ou de sécurité spécifiées.`);
        }
        if (score.coreBaseBonus > 0) {
          rationaleParts.push(`Règle transverse fondamentale de qualité logicielle.`);
        }
        if (score.excellenceBonus > 0) {
          if (score.matchingKeywords.includes('pack:security-hardened')) {
            rationaleParts.push(`Sélectionné au titre du Pack d'Excellence Sécurité Renforcée (protection OWASP et Zero-Trust).`);
          }
          if (score.matchingKeywords.includes('pack:design-craft-polish')) {
            rationaleParts.push(`Sélectionné au titre du Pack d'Excellence Design & Craft UI (règle des 5 états et accessibilité).`);
          }
          if (score.matchingKeywords.includes('pack:extreme-tdd-anti-bug')) {
            rationaleParts.push(`Sélectionné au titre du Pack d'Excellence Rigueur TDD (prévention des régressions et zéro oubli).`);
          }
        }
        if (score.synergyBonus > 0) {
          rationaleParts.push(`Synergie d'écosystème renforcée avec la stack et les outils du projet.`);
        }
      }

      const adaptedModelTier =
        item.parsedMeta.adaptedModel === 'flash' || item.parsedMeta.adaptedModel === 'pro'
          ? item.parsedMeta.adaptedModel
          : undefined;

      selectedList.push({
        slug: item.slug,
        name: item.name,
        kind: item.kind,
        description: item.description || '',
        origin: 'ECC_ADAPTED',
        sourceRelativePath: item.sourceRelativePath,
        sourceUrl: item.sourceUrl,
        license: item.license ?? 'MIT',
        acceptedRationale: rationaleParts.join(' ') || `Score élevé (${score.totalScore}/100) pour le profil du projet.`,
        score,
        family: item.parsedMeta.family,
        dependencies: item.parsedMeta.dependencies ?? [],
        adaptedContent: item.adaptedContent,
        recommendedModelTier: adaptedModelTier,
        recommendedEffort: item.parsedMeta.recommendedEffort,
        userModified: isForced,
      });

      if (item.kind === 'RULE') rulesCount++;
      if (item.kind === 'SUBAGENT') subagentsCount++;
      if (item.kind === 'SKILL') skillsCount++;
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

  private calculateCandidateScore(
    item: CatalogCandidateInput,
    projectLangs: string[],
    projectFrameworks: string[],
    domainText: string,
    isForced: boolean,
    excellencePacks: ExcellencePack[] = [],
    profile?: ProjectProfile
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
      if (tag.length > 2 && domainText.includes(tag.toLowerCase())) {
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

    // 1. Pack Sécurité Renforcée (OWASP, Zero-Trust, Injections, Auth)
    if (excellencePacks.includes('SECURITY_HARDENED')) {
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
    if (excellencePacks.includes('DESIGN_CRAFT_POLISH')) {
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
