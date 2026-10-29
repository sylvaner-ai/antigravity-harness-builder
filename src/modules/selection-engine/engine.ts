import { ProjectProfile } from '../project-profile/schema';
import { EccComponentParsedMeta } from '../../db/schema';
import {
  ComponentKind,
  CustomComponentSpec,
  PresetMode,
  RejectedComponent,
  ScoreBreakdown,
  SelectedComponent,
  SelectionResult,
} from './schema';

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
  'ios',
  'harmonyos',
  'fsharp',
  'pytorch',
  'gan',
];

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
      if (itemLangs.length > 0) {
        const hasMatchingLang = itemLangs.some((lang) =>
          projectLangs.some((pLang) => pLang.includes(lang) || lang.includes(pLang))
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

      // Filtre bloquant sur technologies étrangères exclusives (ex: perl, arkts, react-native, flutter, ruby, php, etc.)
      const slugLower = item.slug.toLowerCase();
      const familyLower = (item.parsedMeta.family ?? '').toLowerCase();
      let foreignTechDetected: string | null = null;

      for (const tech of KNOWN_EXCLUSIVE_TECH) {
        const isTechInProject =
          projectLangs.some((l) => l.includes(tech)) ||
          projectFrameworks.some((f) => f.includes(tech));

        if (!isTechInProject) {
          if (
            familyLower === tech ||
            slugLower === tech ||
            slugLower.startsWith(`${tech}-`) ||
            slugLower.endsWith(`-${tech}`) ||
            slugLower.includes(`/${tech}/`)
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
      if (itemFrameworks.length > 0) {
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
        userIncludes.has(item.slug)
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
      }

      selectedList.push({
        slug: item.slug,
        name: item.name,
        kind: item.kind,
        origin: 'ECC_ADAPTED',
        sourceRelativePath: item.sourceRelativePath,
        sourceUrl: item.sourceUrl,
        license: item.license ?? 'MIT',
        acceptedRationale: rationaleParts.join(' ') || `Score élevé (${score.totalScore}/100) pour le profil du projet.`,
        score,
        family: item.parsedMeta.family,
        dependencies: item.parsedMeta.dependencies ?? [],
        adaptedContent: item.adaptedContent,
        userModified: isForced,
      });

      if (item.kind === 'RULE') rulesCount++;
      if (item.kind === 'SUBAGENT') subagentsCount++;
      if (item.kind === 'SKILL') skillsCount++;
    }

    // --- IDENTIFICATION DES BESOINS NON COUVERTS PAR ECC (Composants sur mesure §7 FR-05) ---
    const customComponents: CustomComponentSpec[] = [...(options.customComponents ?? [])].filter(
      (c) => !options.userExcludes?.includes(c.slug)
    );

    // 1. Règle / Compétence de Design System spécifique au projet
    const ds = profile.designSystem;
    const hasDesignTokens = Boolean(
      ds &&
      (ds.brandIdentity ||
        Object.keys(ds.colorTokens ?? {}).length > 0 ||
        Object.keys(ds.typography?.fontFamilies ?? {}).length > 0 ||
        (ds.uxAndAccessibilityRules ?? []).length > 0)
    );
    const existingDesignRule = selectedList.find(
      (c) => c.slug.includes('design') || c.slug.includes('tokens')
    );

    if (hasDesignTokens && !existingDesignRule && !options.userExcludes?.includes('project-design-system-tokens')) {
      const colors = ds?.colorTokens ?? {};
      const fontFamilies = ds?.typography?.fontFamilies ?? {};
      const primaryColor = colors['primary'] ?? colors['brand-primary'] ?? 'Non spécifiée';
      const secondaryColor = colors['secondary'] ?? colors['brand-secondary'] ?? 'Non spécifiée';
      const fontSans = fontFamilies['sans'] ?? fontFamilies['body'] ?? 'Inter, system-ui, sans-serif';

      customComponents.push({
        slug: 'project-design-system-tokens',
        name: 'Règles et Tokens du Design System Projet',
        kind: 'RULE',
        description: 'Directives strictes pour l application des tokens, polices et couleurs spécifiques au projet.',
        gapReason: 'Le catalogue ECC ne fournit que des règles CSS génériques sans les tokens ni la charte graphique de ce projet.',
        content: `---
trigger: glob
globs: "**/*.{tsx,jsx,css,scss,html,vue}"
description: Respect strict des tokens et de l'identité visuelle du projet
---
# Directives du Design System Projet

- Identité : ${ds?.brandIdentity ?? profile.projectName}
- Palette primaire : ${primaryColor}
- Palette secondaire : ${secondaryColor}
- Typographie Sans : ${fontSans}
- Règles UX & Accessibilité :
${(ds?.uxAndAccessibilityRules ?? []).map((p: string) => `  * ${p}`).join('\n') || '  * Interface claire, cohérente et accessible (WCAG 2.1 AA)'}
`,
      });
    }

    // 2. Règle sur mesure pour les contraintes de sécurité ou conformité spécifiques
    const securityConstraints = profile.securityAndCompliance ?? [];
    if (securityConstraints.length > 0) {
      const hasSecurityRule = selectedList.find((c) => c.family === 'security' || c.slug.includes('security'));
      if (!hasSecurityRule && !options.userExcludes?.includes('project-security-compliance-guard')) {
        customComponents.push({
          slug: 'project-security-compliance-guard',
          name: 'Garde-fous de Sécurité et Conformité Projet',
          kind: 'RULE',
          description: 'Règles strictes appliquant les exigences de conformité et de sécurité du projet.',
          gapReason: 'Exigences de sécurité spécifiques au domaine métier non couvertes par les règles standard ECC.',
          content: `---
trigger: always_on
description: Garde-fous impératifs de sécurité et conformité du projet
---
# Exigences de Sécurité & Conformité Métier

${securityConstraints.map((sc, i) => `## ${i + 1}. ${sc.value}\n- Source : ${sc.epistemicStatus}\n- Justification : ${sc.rationale ?? 'Exigence documentaire'}`).join('\n\n')}
`,
        });
      }
    }

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

    // Estimation du budget de tokens pour les règles always_on
    let estimatedTokens = 0;
    for (const comp of selectedList) {
      if (comp.kind === 'RULE') {
        estimatedTokens += Math.ceil(comp.adaptedContent.length / 4);
      }
    }
    const maxBudget = 20000;
    const rulesPercent = Math.min(100, Math.round((estimatedTokens / maxBudget) * 100));

    return {
      presetMode: preset,
      targetSurface: profile.targetSurface,
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
    isForced: boolean
  ): ScoreBreakdown {
    if (isForced) {
      return {
        totalScore: 100,
        languageMatch: 35,
        frameworkMatch: 30,
        domainTagMatch: 20,
        architectureSecurityMatch: 15,
        coreBaseBonus: 0,
        matchingKeywords: ['user_forced_inclusion'],
      };
    }

    let languageMatch = 0;
    let frameworkMatch = 0;
    let domainTagMatch = 0;
    let architectureSecurityMatch = 0;
    let coreBaseBonus = 0;
    const matchingKeywords: string[] = [];

    // Normalisation des langages et frameworks
    const normProjectLangs = projectLangs.map((l) => l.toLowerCase().replace(/[.\-_]/g, ''));
    if (normProjectLangs.includes('typescript') && !normProjectLangs.includes('javascript')) {
      normProjectLangs.push('javascript', 'js');
    }
    const normProjectFrameworks = projectFrameworks.map((f) => f.toLowerCase().replace(/[.\-_]/g, ''));

    // Langages (+35 pts max)
    const itemLangs = (item.parsedMeta.languages ?? []).map((l) => l.toLowerCase().replace(/[.\-_]/g, ''));
    for (const lang of itemLangs) {
      if (normProjectLangs.some((pLang) => pLang.includes(lang) || lang.includes(pLang))) {
        languageMatch = Math.max(languageMatch, 35);
        matchingKeywords.push(`lang:${lang}`);
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

    // Règles transverses ou de style propre / git (+15 pts bonus)
    if (item.parsedMeta.family === 'common' || item.slug.includes('coding-style') || item.slug.includes('git')) {
      coreBaseBonus = 15;
    }

    const totalScore = Math.min(
      100,
      languageMatch + frameworkMatch + domainTagMatch + architectureSecurityMatch + coreBaseBonus
    );

    return {
      totalScore,
      languageMatch,
      frameworkMatch,
      domainTagMatch,
      architectureSecurityMatch,
      coreBaseBonus,
      matchingKeywords,
    };
  }
}
