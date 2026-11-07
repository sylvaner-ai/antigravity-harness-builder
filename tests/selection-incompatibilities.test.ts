import { describe, expect, it } from 'vitest';
import { CatalogCandidateInput, SelectionEngine } from '../src/modules/selection-engine';
import { ProjectProfile } from '../src/modules/project-profile/schema';
import { HarnessBuilderService } from '../src/modules/harness-builder';
import { verifyGeneratedZipIntegrity } from '../src/modules/package-exporter';
import { CatalogComponentMeta } from '../src/db/schema';

function makeMeta(partial: Partial<CatalogComponentMeta>): CatalogComponentMeta {
  return {
    family: 'general',
    tags: [],
    languages: [],
    frameworks: [],
    dependencies: [],
    hasResources: false,
    resourcesList: [],
    skippedUnsafeFiles: [],
    adaptationNotes: [],
    ...partial,
  };
}

describe('Vérification des Incompatibilités et Cadrage Métier Déterministe', () => {
  const selectionEngine = new SelectionEngine();
  const harnessBuilder = new HarnessBuilderService();

  const sampleTypeScriptPostgresProfile: ProjectProfile = {
    projectId: 'felicicar-test-01',
    projectName: 'Portail de gestion Felicicar',
    projectDescription: 'Location moyenne durée de véhicules pour professionnels, facturation Factur-X et prélèvements SEPA.',
    targetSurface: 'APP',
    profileVersion: 1,
    domainAndObjective: {
      id: 'dom-01',
      value: 'Gestion opérationnelle de flotte automobile, facturation Factur-X et prélèvements SEPA.',
      epistemicStatus: 'explicit',
      sourceRefs: [],
      userEdited: false,
    },
    personasAndRoles: [
      {
        id: 'role-admin',
        value: 'Administrateur : supervision globale et validation financière.',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    features: [
      {
        id: 'FEAT-01',
        title: 'Parc Automobile & Flotte',
        description: 'Gestion des véhicules et des états des lieux.',
        priority: 'P0',
        businessRules: ['Chaque véhicule doit avoir une immatriculation unique.'],
        acceptanceCriteria: ['Le véhicule est persisté avec son état opérationnel.'],
        epistemicStatus: 'explicit',
        sourceRefs: [],
      },
      {
        id: 'FEAT-02',
        title: 'Facturation Factur-X & Prélèvements SEPA',
        description: 'Émission de factures conformes et lots de prélèvement bancaire.',
        priority: 'P0',
        businessRules: ['Numérotation continue et génération de lots pain.008.'],
        acceptanceCriteria: ['Factur-X valide généré et archivé 10 ans.'],
        epistemicStatus: 'explicit',
        sourceRefs: [],
      },
    ],
    techStack: {
      languages: ['TypeScript', 'SQL', 'HTML/CSS'],
      frameworks: ['Next.js', 'React', 'Tailwind CSS'],
      databases: ['PostgreSQL'],
      ormAndDataLayer: ['Drizzle ORM'],
      stateManagement: ['TanStack Query', 'Zustand'],
      apiStyle: 'REST',
      infrastructureAndDeployment: ['Docker Multi-Stage', 'Cloudflare R2', 'Documenso'],
      testingTools: ['Vitest', 'Playwright'],
      complianceStandards: ['WCAG 2.1 AA', 'RGPD'],
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [],
    },
    architectureConstraints: [
      {
        id: 'arch-1',
        value: 'Monolithe Next.js App Router avec Route Handlers sécurisés Zod.',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    securityAndCompliance: [
      {
        id: 'sec-1',
        value: 'Validation stricte Zod et requêtes préparées Drizzle ORM sans injection.',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    qualityAndTestingStrategy: [
      {
        id: 'qa-1',
        value: 'Rigueur TDD (Red-Green-Refactor) avec couverture minimale de 80%.',
        epistemicStatus: 'explicit',
        sourceRefs: [],
        userEdited: false,
      },
    ],
    designSystem: {
      brandIdentity: 'Felicicar Design System',
      colorTokens: {
        primary: '#0f172a',
        secondary: '#2563eb',
      },
      typography: {
        fontFamilies: {
          display: 'Inter, system-ui, sans-serif',
          body: 'Inter, system-ui, sans-serif',
          mono: 'JetBrains Mono, monospace',
        },
        scaleNotes: 'Modern modular scale',
      },
      componentGuidelines: ['Surfaces épurées et structurées'],
      uxAndAccessibilityRules: ['Contraste WCAG 2.1 AA'],
      spacingAndLayout: 'Base 8px grid system',
      epistemicStatus: 'explicit',
      sourceRefs: [],
    },
    uncertainties: [
      {
        id: 'unc-1',
        category: 'missing_information',
        topic: 'Réconciliation bancaire SEPA pain.002',
        statement: 'Traitement des retours de prélèvements requis.',
        impact: 'high',
        proposedFallback: 'Format ISO 20022 pain.008.001.08.',
        requiresHumanDecision: true,
        sourceRefs: [],
      },
    ],
    supplementaryNotes: {},
  };

  const sampleCatalog: CatalogCandidateInput[] = [
    {
      slug: 'mybatis-patterns',
      name: 'MyBatis and MyBatis-Spring patterns',
      kind: 'SKILL',
      description: 'Java MyBatis mapper design and SQL mapping.',
      adaptedContent: '---\nname: mybatis-patterns\ndescription: Java MyBatis mapper patterns\n---\nJava content',
      parsedMeta: makeMeta({
        family: 'database',
        tags: ['java', 'mybatis', 'sql', 'database'],
        languages: ['java'],
        frameworks: ['spring', 'mybatis'],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'java mybatis spring sql',
    },
    {
      slug: 'mysql-patterns',
      name: 'MySQL and MariaDB patterns',
      kind: 'SKILL',
      description: 'MySQL schema and indexing patterns.',
      adaptedContent: '---\nname: mysql-patterns\ndescription: MySQL database optimization\n---\nMySQL content',
      parsedMeta: makeMeta({
        family: 'database',
        tags: ['mysql', 'mariadb', 'database', 'sql'],
        languages: ['sql'],
        frameworks: [],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'mysql mariadb database sql',
    },
    {
      slug: 'agent-security-hardening',
      name: 'Agent Security Hardening',
      kind: 'SKILL',
      description: 'Host sandboxing for CLI agents. Excludes web applications.',
      adaptedContent: '---\nname: agent-security-hardening\ndescription: Hardening for CLI agents, excludes web applications.\n---\nCLI content',
      parsedMeta: makeMeta({
        family: 'security',
        tags: ['security', 'sandbox', 'agent'],
        languages: [],
        frameworks: [],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'security hardening sandbox agent',
    },
    {
      slug: 'agent-payment-x402',
      name: 'Agent Payment x402',
      kind: 'SKILL',
      description: 'Add x402 payment execution to AI agents with non-custodial crypto wallets.',
      adaptedContent: '---\nname: agent-payment-x402\ndescription: Crypto wallet x402 payment for AI agents\n---\nCrypto content',
      parsedMeta: makeMeta({
        family: 'payment',
        tags: ['payment', 'crypto', 'x402', 'solana', 'wallet'],
        languages: ['typescript'],
        frameworks: [],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'payment crypto wallet x402 solana',
    },
    {
      slug: 'continuous-learning-v2',
      name: 'Continuous Learning v2',
      kind: 'SKILL',
      description: 'Continuous memory learning loop for autonomous agents.',
      adaptedContent: '---\nname: continuous-learning-v2\ndescription: Autonomous agent memory learning\n---\nLearning content',
      parsedMeta: makeMeta({
        family: 'agent',
        tags: ['learning', 'memory', 'agent'],
        languages: [],
        frameworks: [],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'agent learning memory',
    },
    {
      slug: 'mle-workflow',
      name: 'MLE Workflow',
      kind: 'SKILL',
      description: 'Machine Learning workflow and training loops.',
      adaptedContent: '---\nname: mle-workflow\ndescription: ML model training and evaluation\n---\nML content',
      parsedMeta: makeMeta({
        family: 'machine-learning',
        tags: ['mle', 'machine-learning', 'pytorch'],
        languages: ['python'],
        frameworks: ['pytorch'],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'machine learning mle pytorch training',
    },
    {
      slug: 'flox-environments',
      name: 'Flox Environments',
      kind: 'SKILL',
      description: 'Flox declarative environment management.',
      adaptedContent: '---\nname: flox-environments\ndescription: Flox nix environments\n---\nFlox content',
      parsedMeta: makeMeta({
        family: 'devops',
        tags: ['flox', 'nix', 'environments'],
        languages: [],
        frameworks: [],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'flox nix environments devops',
    },
    {
      slug: 'backend-patterns',
      name: 'Backend Architecture Patterns',
      kind: 'SKILL',
      description: 'Node.js and Next.js backend architecture and REST API design.',
      adaptedContent: '---\nname: backend-patterns\ndescription: Node.js and Next.js backend architecture\n---\nBackend content',
      parsedMeta: makeMeta({
        family: 'backend',
        tags: ['backend', 'nextjs', 'nodejs', 'api'],
        languages: ['typescript', 'javascript'],
        frameworks: ['next.js', 'react'],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'backend nextjs nodejs api',
    },
    {
      slug: 'frontend-patterns',
      name: 'Frontend Development Patterns',
      kind: 'SKILL',
      description: 'React and Next.js frontend state and UI patterns.',
      adaptedContent: '---\nname: frontend-patterns\ndescription: React and Next.js frontend patterns\n---\nFrontend content',
      parsedMeta: makeMeta({
        family: 'frontend',
        tags: ['frontend', 'react', 'nextjs', 'ui'],
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'next.js'],
      }),
      compatibilityStatus: 'AUTO_VALIDATED',
      searchText: 'frontend react nextjs ui',
    },
  ];

  it('exclut formellement les 7 skills hors sujet sur une stack TypeScript/PostgreSQL', () => {
    const result = selectionEngine.selectComponents(sampleTypeScriptPostgresProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const selectedSlugs = result.selectedComponents.map((s) => s.slug);
    expect(selectedSlugs).not.toContain('mybatis-patterns');
    expect(selectedSlugs).not.toContain('mysql-patterns');
    expect(selectedSlugs).not.toContain('agent-security-hardening');
    expect(selectedSlugs).not.toContain('agent-payment-x402');
    expect(selectedSlugs).not.toContain('continuous-learning-v2');
    expect(selectedSlugs).not.toContain('mle-workflow');
    expect(selectedSlugs).not.toContain('flox-environments');

    // Les skills utiles sont bien retenus
    expect(selectedSlugs).toContain('backend-patterns');
    expect(selectedSlugs).toContain('frontend-patterns');

    // Vérifie les motifs d'exclusion
    const rejectedMyBatis = result.rejectedComponents.find((r) => r.slug === 'mybatis-patterns');
    expect(rejectedMyBatis).toBeDefined();
    expect(rejectedMyBatis?.rejectionReason).toBe('STACK_INCOMPATIBLE');

    const rejectedMysql = result.rejectedComponents.find((r) => r.slug === 'mysql-patterns');
    expect(rejectedMysql).toBeDefined();
    expect(rejectedMysql?.rejectedRationale).toContain('PostgreSQL');

    const rejectedX402 = result.rejectedComponents.find((r) => r.slug === 'agent-payment-x402');
    expect(rejectedX402).toBeDefined();
    expect(rejectedX402?.rejectedRationale).toContain('crypto/web3');
  });

  it('génère les règles métier sur mesure pour Factur-X, SEPA ISO 20022, Documenso et Cloudflare R2', () => {
    const result = selectionEngine.selectComponents(sampleTypeScriptPostgresProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const customSlugs = result.customComponents.map((c) => c.slug);
    expect(customSlugs).toContain('project-facturx-einvoicing-guard');
    expect(customSlugs).toContain('project-sepa-iso20022-guard');
    expect(customSlugs).toContain('project-documenso-signing-guard');
    expect(customSlugs).toContain('project-storage-r2-guard');

    const sepaRule = result.customComponents.find((c) => c.slug === 'project-sepa-iso20022-guard');
    expect(sepaRule?.content).toContain('pain.008.001.08');
    expect(sepaRule?.content).toContain('pain.002');
    expect(sepaRule?.content).toContain('Modulo 97');

    const facturxRule = result.customComponents.find((c) => c.slug === 'project-facturx-einvoicing-guard');
    expect(facturxRule?.content).toContain('Factur-X');
    expect(facturxRule?.content).toContain('PDP');
    expect(facturxRule?.content).toContain('10 ans');
  });

  it('génère un paquet ZIP déterministe avec correspondance exacte à 100% des SHA-256 dans HARNESS_MANIFEST.json', async () => {
    const selection = selectionEngine.selectComponents(sampleTypeScriptPostgresProfile, sampleCatalog, {
      presetMode: 'BALANCED',
    });

    const pkg = await harnessBuilder.buildHarness(sampleTypeScriptPostgresProfile, selection, {
      generationId: 'test-gen-integrity-01',
      generatedAtIso: new Date().toISOString(),
    });

    const verification = verifyGeneratedZipIntegrity(pkg.zipBuffer, pkg.packageRootName);
    expect(verification.valid).toBe(true);
    expect(verification.manifest.filesInventory.length).toBeGreaterThan(10);

    // Vérifie que HARNESS_MANIFEST.json ne contient pas la date placeholder 2026-01-01
    expect(verification.manifest.generatedAt).not.toBe('2026-01-01T00:00:00.000Z');

    // Vérifie que README.md et START_HERE.md sont bien présents dans l'archive
    expect(verification.extractedPaths).toContain(`${pkg.packageRootName}/README.md`);
    expect(verification.extractedPaths).toContain(`${pkg.packageRootName}/START_HERE.md`);
  });
});
