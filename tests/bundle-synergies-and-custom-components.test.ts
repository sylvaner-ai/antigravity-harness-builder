import { describe, it, expect } from 'vitest';
import { SelectionEngine, CatalogCandidateInput } from '../src/modules/selection-engine';
import { ProjectProfile, ProjectProfileSchema } from '../src/modules/project-profile/schema';
import { extractHeuristicProjectProfile } from '../src/modules/project-profile/heuristic-extractor';
import { generateOrchestrationPlan } from '../src/modules/harness-builder/orchestration-generator';
import { HarnessBuilderService } from '../src/modules/harness-builder';

describe('Améliorations Moteur de Profil, Sélection & Orchestration', () => {
  const baseProfile: ProjectProfile = {
    projectId: 'test-drizzle-zustand',
    projectName: 'FinPulse Modern App',
    projectDescription: 'Application fintech avec Drizzle ORM et Zustand.',
    targetSurface: 'IDE',
    profileVersion: 1,
    domainAndObjective: {
      id: 'd-1',
      value: 'Gestion d investissements et tableaux de bord financiers.',
      epistemicStatus: 'explicit',
      sourceRefs: [],
      userEdited: false,
    },
    personasAndRoles: [
      {
        id: 'p-1',
        value: 'Gestionnaire de portefeuille',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    features: [
      {
        id: 'FEAT-01',
        title: 'Tableau de bord financier',
        description: 'Affichage des actifs et passage d ordres.',
        priority: 'P0',
        businessRules: ['Transactions isolées.'],
        acceptanceCriteria: ['Ordres validés.'],
        epistemicStatus: 'explicit',
        sourceRefs: [],
      },
    ],
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Next.js', 'React', 'Tailwind CSS'],
      databases: ['PostgreSQL'],
      ormAndDataLayer: ['Drizzle ORM'],
      stateManagement: ['Zustand', 'TanStack Query'],
      apiStyle: 'REST',
      infrastructureAndDeployment: ['Docker'],
      testingTools: ['Vitest'],
      complianceStandards: ['PCI-DSS', 'RGPD'],
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [],
    },
    architectureConstraints: [],
    securityAndCompliance: [
      {
        id: 'sec-1',
        value: 'Chiffrement des clés de comptes.',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    qualityAndTestingStrategy: [],
    designSystem: {
      brandIdentity: 'FinPulse Obsidian Dark',
      colorTokens: { primary: '#10b981' },
      typography: { fontFamilies: { sans: 'Inter, sans-serif' }, scaleNotes: '' },
      spacingAndLayout: '',
      componentGuidelines: [],
      uxAndAccessibilityRules: ['WCAG AA'],
      epistemicStatus: 'explicit',
      sourceRefs: [],
    },
    uncertainties: [],
    supplementaryNotes: {},
  };

  const sampleCatalog: CatalogCandidateInput[] = [
    {
      slug: 'common-testing',
      name: 'Règles Communes de Test',
      kind: 'RULE',
      description: 'Pratiques de test unitaire et TDD.',
      adaptedContent: '---\ntrigger: always_on\ndescription: Test rule\n---\n# Tests',
      parsedMeta: {
        languages: ['typescript'],
        frameworks: [],
        dependencies: [],
        family: 'testing',
        tags: ['testing', 'tdd'],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'COMPATIBLE',
    },
    {
      slug: 'react-testing',
      name: 'Tests de Composants React',
      kind: 'SKILL',
      description: 'React Testing Library et Vitest.',
      adaptedContent: '---\nname: react-testing\ndescription: React Testing RTL\n---\n# React RTL',
      parsedMeta: {
        languages: ['typescript'],
        frameworks: ['react'],
        dependencies: [],
        family: 'testing',
        tags: ['testing', 'react'],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'COMPATIBLE',
    },
    {
      slug: 'security-reviewer',
      name: 'Auditeur de Sécurité',
      kind: 'SUBAGENT',
      description: 'Audit en lecture seule des vulnérabilités.',
      adaptedContent: '---\nname: security-reviewer\ndescription: Sec Reviewer\ntools: [view_file, grep_search]\n---\n# Sec Reviewer',
      parsedMeta: {
        languages: [],
        frameworks: [],
        dependencies: [],
        family: 'security',
        tags: ['security', 'audit'],
        hasResources: false,
        resourcesList: [],
        skippedUnsafeFiles: [],
        adaptationNotes: [],
      },
      compatibilityStatus: 'COMPATIBLE',
    },
  ];

  it('1. Schéma de Profil : Valide le schéma enrichi avec ormAndDataLayer et stateManagement', () => {
    const validated = ProjectProfileSchema.parse(baseProfile);
    expect(validated.techStack.ormAndDataLayer).toContain('Drizzle ORM');
    expect(validated.techStack.stateManagement).toContain('Zustand');
    expect(validated.techStack.complianceStandards).toContain('PCI-DSS');
  });

  it('2. Extracteur Heuristique : Détecte Drizzle ORM et Zustand depuis un cahier des charges textuel', () => {
    const specText = `
# Projet Modern Invest
Application avec backend PostgreSQL et Drizzle ORM pour l'accès aux données.
L'interface Next.js React utilise Zustand et TanStack Query pour la gestion du cache et de l'état.
Tests avec Vitest et conformité RGPD.
    `;
    const profile = extractHeuristicProjectProfile({
      projectId: 'heuristic-test',
      projectName: 'Modern Invest',
      specText,
    });

    expect(profile.techStack.ormAndDataLayer).toContain('Drizzle ORM');
    expect(profile.techStack.stateManagement).toContain('Zustand');
    expect(profile.techStack.stateManagement).toContain('TanStack Query');
    expect(profile.techStack.testingTools).toContain('Vitest');
    expect(profile.techStack.complianceStandards).toContain('RGPD');
  });

  it('3. Moteur de Sélection : Calcule les bonus de synergie (bundle synergies)', () => {
    const engine = new SelectionEngine();
    const result = engine.selectComponents(baseProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const testRule = result.selectedComponents.find((c) => c.slug === 'common-testing');
    expect(testRule).toBeDefined();
    expect(testRule?.score.synergyBonus).toBeGreaterThan(0);
    expect(testRule?.score.matchingKeywords).toContain('bundle:testing_synergy');

    const secAgent = result.selectedComponents.find((c) => c.slug === 'security-reviewer');
    expect(secAgent).toBeDefined();
    expect(secAgent?.score.synergyBonus).toBeGreaterThan(0);
    expect(secAgent?.score.matchingKeywords).toContain('bundle:security_synergy');
  });

  it('4. Composants Sur Mesure : Synthétise automatiquement des règles pour Drizzle ORM et State Management', () => {
    const engine = new SelectionEngine();
    const result = engine.selectComponents(baseProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const customSlugs = result.customComponents.map((c) => c.slug);
    expect(customSlugs).toContain('project-drizzle-orm-guidelines');
    expect(customSlugs).toContain('project-state-management-patterns');

    const drizzleRule = result.customComponents.find((c) => c.slug === 'project-drizzle-orm-guidelines');
    expect(drizzleRule?.content).toContain('drizzle-kit');
    expect(drizzleRule?.content).toContain('db.transaction');

    const stateRule = result.customComponents.find((c) => c.slug === 'project-state-management-patterns');
    expect(stateRule?.content).toContain('TanStack Query');
    expect(stateRule?.content).toContain('Zustand');
  });

  it('5. Orchestration Dynamique : Intègre les phases conditionnelles, la matrice de skills et les commandes slash', () => {
    const engine = new SelectionEngine();
    const selection = engine.selectComponents(baseProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const orchPlan = generateOrchestrationPlan(baseProfile, selection);

    // Vérifie le diagramme Mermaid adapté avec DB et UI
    expect(orchPlan).toContain('Validation du Schéma DB & Migrations');
    expect(orchPlan).toContain('Frontend : Composants, Design Tokens');
    expect(orchPlan).toContain('Audit Sécurité & Injections');

    // Vérifie la Matrice d'Activation des Compétences
    expect(orchPlan).toContain("Matrice d'Activation des Compétences");
    expect(orchPlan).toContain('Cadrage & Exploration');

    // Vérifie le protocole de délégation et modes de workspace
    expect(orchPlan).toContain('Protocole de Délégation et Handoff Inter-Agents');
    expect(orchPlan).toContain('inherit');
    expect(orchPlan).toContain('branch');

    // Vérifie les commandes slash intégrées
    expect(orchPlan).toContain('/plan');
    expect(orchPlan).toContain('/goal');
    expect(orchPlan).toContain('/teamwork');
  });

  it('6. Package Exporter : docs/ORCHESTRATION.md dans l archive ZIP contient le workflow dynamique complet', async () => {
    const engine = new SelectionEngine();
    const selection = engine.selectComponents(baseProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const builder = new HarnessBuilderService();
    const pkg = await builder.buildHarness(baseProfile, selection);

    const orchFile = pkg.files.find((f) => f.relativePath === 'docs/ORCHESTRATION.md');
    expect(orchFile).toBeDefined();
    expect(orchFile?.content).toContain('Diagramme de Flux de Développement');
    expect(orchFile?.content).toContain('Validation du Schéma DB & Migrations');
    expect(orchFile?.content).toContain("Matrice d'Activation par Phase du Projet");
    expect(orchFile?.content).toContain('Modes d\'Isolation de l\'Espace de Travail');
    expect(orchFile?.content).toContain('/teamwork');
  });
});
