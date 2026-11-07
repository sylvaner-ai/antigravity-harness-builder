import { DeterministicPackageInput } from '../src/modules/package-exporter/schema';
import { adaptAgentMarkdown } from '../src/modules/antigravity-adapter/adapter';

const RAW_ECC_ARCHITECT_AGENT = `---
name: architect
description: Software architecture specialist for system design, scalability, and technical decision-making. Use PROACTIVELY when planning new features, refactoring large systems, or making architectural decisions.
tools: Read, Grep, Glob, Task
model: opus
color: purple
---

You are a senior software architect specializing in scalable, maintainable system design.

## Architecture Review Process
- Review existing architecture in \${CLAUDE_PROJECT_DIR}
- Ensure consistency across codebase
`;

const RAW_ECC_REVIEWER_AGENT = `---
name: code-reviewer
description: Independent code reviewer for auditing code quality, security rules, and test coverage before completion.
tools: Read, Grep, Glob, Write, Edit, Bash
model: sonnet
---

You are a strict and independent code reviewer. Verify all acceptance criteria and run non-destructive checks.
`;

export function createSampleDeterministicInput(): DeterministicPackageInput {
  const adaptedArchitect = adaptAgentMarkdown(RAW_ECC_ARCHITECT_AGENT, 'architect', {
    isIndependentReviewer: false,
  });

  const adaptedReviewer = adaptAgentMarkdown(RAW_ECC_REVIEWER_AGENT, 'code-reviewer', {
    isIndependentReviewer: true,
  });

  return {
    generationId: 'gen-20261029-0001',
    generatedAtIso: '2026-10-29T10:20:00.000Z',
    packageRootName: 'acme-billing-harness',
    catalog: {
      versionTag: 'affaan-m/ECC@25278e7',
      sources: [
        {
          id: 'ecc-official',
          name: 'Everything Claude Code (ECC)',
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: '25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b',
          license: 'MIT',
          author: 'Affaan Mustafa',
          selectedComponents: 3,
        },
      ],
    },
    excellencePacks: [],
    inputDocuments: [
      {
        documentId: 'doc-spec-01',
        role: 'SPECIFICATION',
        fileName: 'cahier_des_charges_acme_billing.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 148200,
        sha256: 'a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123',
      },
      {
        documentId: 'doc-ds-01',
        role: 'DESIGN_SYSTEM',
        fileName: 'acme_design_tokens.json',
        mimeType: 'application/json',
        sizeBytes: 19400,
        sha256: 'f6e5d4c3b2a10123456789abcdef0123456789abcdef0123456789abcdef9876',
      },
    ],
    profile: {
      projectId: 'proj-acme-01',
      projectName: 'Acme Billing Portal',
      projectDescription: 'Portail SaaS B2B de facturation et suivi des abonnements clients.',
      targetSurface: 'IDE',
      profileVersion: 1,
      domainAndObjective: {
        id: 'dom-1',
        value:
          'Permettre aux PME de gérer leurs abonnements récurrents, d’émettre des factures conformes et de suivre les règlements.',
        epistemicStatus: 'explicit',
        sourceRefs: [
          {
            documentId: 'doc-spec-01',
            documentName: 'cahier_des_charges_acme_billing.pdf',
            location: 'Section 1.1',
          },
        ],
        userEdited: false,
      },
      personasAndRoles: [
        {
          id: 'role-admin',
          value: 'Responsable Financier (Admin) : configure les plans tarifaires et exporte le grand livre.',
          epistemicStatus: 'explicit',
          sourceRefs: [
            {
              documentId: 'doc-spec-01',
              documentName: 'cahier_des_charges_acme_billing.pdf',
              location: 'Section 2.1',
            },
          ],
          userEdited: false,
        },
        {
          id: 'role-auditor',
          value: 'Auditeur Externe : accès en lecture seule aux factures verrouillées.',
          epistemicStatus: 'deduced',
          confidence: 'high',
          rationale: 'Déduit des exigences de conformité comptable mentionnées en section 4.',
          sourceRefs: [
            {
              documentId: 'doc-spec-01',
              documentName: 'cahier_des_charges_acme_billing.pdf',
              location: 'Section 4.2',
            },
          ],
          userEdited: false,
        },
      ],
      features: [
        {
          id: 'FEAT-01',
          title: 'Émission et numérotation séquentielle des factures',
          description:
            'Chaque facture validée reçoit un numéro séquentiel immuable sans trou de numérotation.',
          priority: 'P0',
          businessRules: [
            'Une facture validée ne peut jamais être supprimée ; seul un avoir peut l’annuler.',
            'Le calcul de TVA dépend du pays du client B2B.',
          ],
          acceptanceCriteria: [
            'La validation d’un brouillon attribue un numéro séquentiel unique en transaction atomique.',
            'Toute tentative de modification d’une facture émise est rejetée avec un code HTTP 409.',
          ],
          epistemicStatus: 'explicit',
          sourceRefs: [
            {
              documentId: 'doc-spec-01',
              documentName: 'cahier_des_charges_acme_billing.pdf',
              location: 'Section 3.1',
            },
          ],
        },
      ],
      techStack: {
        languages: ['TypeScript'],
        frameworks: ['Next.js', 'Tailwind CSS'],
        databases: ['PostgreSQL'],
        infrastructureAndDeployment: ['Docker'],
        testingTools: ['Vitest', 'Playwright'],
        epistemicStatus: 'explicit',
        sourceRefs: [
          {
            documentId: 'doc-spec-01',
            documentName: 'cahier_des_charges_acme_billing.pdf',
            location: 'Section 5',
          },
        ],
      },
      architectureConstraints: [
        {
          id: 'arch-1',
          value: 'Isolation stricte des données par tenant (organizationId obligatoire sur toutes les requêtes).',
          epistemicStatus: 'explicit',
          sourceRefs: [
            {
              documentId: 'doc-spec-01',
              documentName: 'cahier_des_charges_acme_billing.pdf',
              location: 'Section 5.2',
            },
          ],
          userEdited: false,
        },
      ],
      securityAndCompliance: [
        {
          id: 'sec-1',
          value: 'Journalisation d’audit immuable sur toutes les opérations de facturation.',
          epistemicStatus: 'explicit',
          sourceRefs: [],
          userEdited: false,
        },
      ],
      qualityAndTestingStrategy: [
        {
          id: 'qa-1',
          value: 'Couverture à 100 % par tests unitaires du moteur de calcul de TVA et des centimes.',
          epistemicStatus: 'explicit',
          sourceRefs: [],
          userEdited: false,
        },
      ],
      designSystem: {
        brandIdentity: 'Interface financière institutionnelle sobre, contrastée et haute densité.',
        colorTokens: {
          '--color-primary': '#0F172A',
          '--color-accent': '#2563EB',
          '--color-surface': '#FFFFFF',
          '--color-danger': '#DC2626',
        },
        typography: {
          fontFamilies: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
          },
          scaleNotes: 'Nombres tabulaires obligatoires (font-variant-numeric: tabular-nums) pour tous les montants.',
        },
        spacingAndLayout: 'Grille 8px, largeur max 1440px, tableaux avec entêtes figées.',
        componentGuidelines: [
          'Badge de statut de facture avec icône + libellé explicite (ne jamais reposer sur la couleur seule).',
        ],
        uxAndAccessibilityRules: [
          'Conformité WCAG 2.1 AA minimum (contraste >= 4.5:1).',
          'Navigation complète au clavier dans les tableaux de facturation.',
        ],
        epistemicStatus: 'explicit',
        sourceRefs: [
          {
            documentId: 'doc-ds-01',
            documentName: 'acme_design_tokens.json',
          },
        ],
      },
      uncertainties: [
        {
          id: 'UNC-01',
          category: 'missing_information',
          topic: 'Passerelle de paiement internationale',
          statement:
            'Le cahier des charges mentionne le prélèvement SEPA mais ne précise pas le prestataire (Stripe vs GoCardless).',
          impact: 'high',
          proposedFallback: 'Isoler le prestataire derrière une interface PaymentGatewayPort en attendant confirmation.',
          requiresHumanDecision: true,
          sourceRefs: [
            {
              documentId: 'doc-spec-01',
              documentName: 'cahier_des_charges_acme_billing.pdf',
              location: 'Section 3.4',
            },
          ],
        },
      ],
      supplementaryNotes: {
        deploymentConstraints: 'Déploiement conteneurisé sur VPS Linux privé.',
        regulatoryRequirements: 'Conservation légale des factures pendant 10 ans.',
        qualityLevel: 'Critique (zéro erreur d’arrondi tolérée)',
        costPreferences: 'Maîtrisé',
      },
    },
    selectedRules: [
      {
        slug: 'common-coding-style',
        title: 'Principes fondamentaux de qualité et immuabilité',
        frontmatter: {
          trigger: 'always_on',
        },
        markdownBody: `# Coding Style & Immutability\n\n- Privilégier des fonctions pures et des structures de données immuables.\n- Valider toutes les entrées externes avec Zod côté serveur.`,
        selectionRationale: 'Socle transversal indispensable pour garantir la fiabilité du code.',
        originStatus: 'source_adapted',
        provenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: '25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b',
          sourceRelativePath: 'rules/common/coding-style.md',
          sourceUrl:
            'https://github.com/affaan-m/ECC/blob/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b/rules/common/coding-style.md',
          license: 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: ["Ajout du frontmatter Antigravity 'trigger: always_on'."],
        },
      },
      {
        slug: 'typescript-strict-billing',
        title: 'Règles TypeScript strictes et calculs monétaires',
        frontmatter: {
          trigger: 'glob',
          globs: '**/*.ts, **/*.tsx',
          description: 'Règles de typage strict TypeScript et manipulation des montants en centimes entiers.',
        },
        markdownBody: `# TypeScript & Monetary Precision\n\n- Interdiction absolue d'utiliser \`any\` ou des nombres flottants IEEE 754 pour des calculs monétaires : toujours manipuler des centimes entiers (\`bigint\` ou \`integer\`).`,
        selectionRationale: 'Critique pour un portail de facturation en TypeScript.',
        originStatus: 'project_custom',
      },
    ],
    selectedSkills: [
      {
        slug: 'backend-patterns',
        frontmatter: {
          name: 'backend-patterns',
          description:
            'Use this skill when designing or implementing Next.js API routes, repository patterns, or transactional PostgreSQL queries.',
          license: 'MIT',
          metadata: {
            origin: 'ECC',
          },
        },
        markdownBody: `# Backend Development Patterns\n\n## Steps\n1. Vérifier les schémas dans [api-checklist.md](./references/api-checklist.md).\n2. Encapsuler la numérotation des factures dans une transaction SQL sérialisable.`,
        resources: [
          {
            relativeSubPath: 'references/api-checklist.md',
            content: `# API Checklist\n\n- Toujours filtrer par \`organizationId\`.\n- Valider le corps JSON avec Zod.`,
          },
        ],
        selectionRationale: 'Fournit les patterns d’architecture backend pour Next.js et PostgreSQL.',
        originStatus: 'source_adapted',
        provenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: '25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b',
          sourceRelativePath: 'skills/backend-patterns/SKILL.md',
          sourceUrl:
            'https://github.com/affaan-m/ECC/blob/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b/skills/backend-patterns/SKILL.md',
          license: 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: ['Vérification du frontmatter et ajout de la checklist de référence locale.'],
        },
      },
    ],
    selectedSubagents: [
      {
        slug: 'architect',
        roleTitle: 'Architecte Logiciel & Planificateur',
        frontmatter: adaptedArchitect.frontmatter,
        markdownBody: adaptedArchitect.content.replace(/^---[\s\S]*?---\n\n/, ''),
        isIndependentReviewer: false,
        recommendedModelTier: adaptedArchitect.recommendedModelTier,
        recommendedEffort: 'high',
        qualityCostRecommendation:
          'Modèle Pro avec effort élevé recommandé pour la conception des transactions de facturation.',
        selectionRationale: 'Nécessaire pour structurer le domaine de facturation et les frontières multi-tenant.',
        originStatus: 'source_adapted',
        provenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: '25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b',
          sourceRelativePath: 'agents/architect.md',
          sourceUrl:
            'https://github.com/affaan-m/ECC/blob/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b/agents/architect.md',
          license: 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: adaptedArchitect.adaptationNotes,
        },
      },
      {
        slug: 'code-reviewer',
        roleTitle: 'Relecteur Indépendant Qualité & Sécurité',
        frontmatter: adaptedReviewer.frontmatter,
        markdownBody: adaptedReviewer.content.replace(/^---[\s\S]*?---\n\n/, ''),
        isIndependentReviewer: true,
        recommendedModelTier: adaptedReviewer.recommendedModelTier,
        recommendedEffort: 'medium',
        qualityCostRecommendation:
          'Modèle Pro en lecture seule pour auditer les calculs de TVA et l’isolation tenant avant validation.',
        selectionRationale: 'Garantit une passe de revue indépendante sans droit de modification directe (§6.2).',
        originStatus: 'source_adapted',
        provenance: {
          repositoryUrl: 'https://github.com/affaan-m/ECC',
          commitSha: '25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b',
          sourceRelativePath: 'agents/code-reviewer.md',
          sourceUrl:
            'https://github.com/affaan-m/ECC/blob/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b/agents/code-reviewer.md',
          license: 'MIT',
          author: 'Affaan Mustafa',
          adaptationNotes: adaptedReviewer.adaptationNotes,
        },
      },
    ],
    discardedCandidatesSummary: [
      {
        componentId: 'agent:django-reviewer',
        reason: 'Incompatible avec la stack TypeScript / Next.js du projet cible.',
      },
      {
        componentId: 'skill:blender-motion-state-inspection',
        reason: 'Hors domaine fonctionnel (facturation SaaS B2B).',
      },
    ],
  };
}
