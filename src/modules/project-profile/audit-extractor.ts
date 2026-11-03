import { z } from 'zod';
import { ProjectProfile } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';

/**
 * Schéma Zod du rapport d'audit normalisé généré par l'agent Antigravity
 * dans le workspace d'un projet cible à moderniser.
 */
export const AntigravityAuditReportSchema = z.object({
  auditVersion: z.string().optional().default('1.0.0'),
  scannedAt: z.string().optional(),
  projectName: z.string().optional(),
  projectDescription: z.string().optional(),
  targetSurfaceRecommendation: z.enum(['APP', 'IDE', 'CLI']).optional(),
  techStack: z
    .object({
      languages: z.array(z.string()).default([]),
      frameworks: z.array(z.string()).default([]),
      databases: z.array(z.string()).default([]),
      testingTools: z.array(z.string()).default([]),
      packageManager: z.string().optional(),
      infrastructureAndDeployment: z.array(z.string()).optional().default([]),
    })
    .default({ languages: [], frameworks: [], databases: [], testingTools: [] }),
  operationalCommands: z
    .object({
      build: z.string().optional(),
      test: z.string().optional(),
      lint: z.string().optional(),
      typecheck: z.string().optional(),
      dev: z.string().optional(),
    })
    .catchall(z.string())
    .optional()
    .default({}),
  projectStructure: z
    .object({
      organization: z.string().optional(),
      sourceRoot: z.string().optional(),
      keyDirectories: z.array(z.string()).optional().default([]),
    })
    .optional(),
  existingAiHarness: z
    .object({
      hasRootInstructions: z.boolean().optional(),
      rootInstructionFiles: z.array(z.string()).optional().default([]),
      rules: z
        .array(
          z.union([
            z.string(),
            z.object({
              slug: z.string(),
              path: z.string().optional(),
              customUserContent: z.boolean().optional(),
            }),
          ])
        )
        .optional()
        .default([]),
      skills: z.array(z.string()).optional().default([]),
      subagents: z.array(z.string()).optional().default([]),
      hasDeprecatedWorkflows: z.boolean().optional(),
      hasMcpConfig: z.boolean().optional(),
    })
    .optional(),
  existingDirectivesToPreserve: z.array(z.string()).optional().default([]),
});

export type AntigravityAuditReport = z.infer<typeof AntigravityAuditReportSchema>;

/**
 * Prompt d'audit autonome à copier-coller dans l'agent Antigravity du projet existant.
 */
export const AUDIT_EXTRACTION_PROMPT = `Agis en tant qu'auditeur technique spécialisé Google Antigravity. Ton objectif est d'analyser l'architecture, la stack technique, les scripts de qualité et la configuration IA existante de ce projet afin de préparer sa modernisation dans Antigravity Harness Builder.

Tu ne dois modifier aucun fichier. Effectue uniquement des analyses en lecture seule.

### Directives d'exécution :
1. Examine les manifestes de dépendances (package.json, pyproject.toml, Cargo.toml, go.mod, docker-compose.yml, etc.).
2. Identifie les scripts exacts du projet : build, test, lint, typecheck, dev.
3. Cartographie l'arborescence du projet (profondeur 2 à 3 niveaux max, en ignorant strictement node_modules, .git, .next, dist, build, coverage, .venv).
4. Inspecte la configuration IA existante :
   - Fichiers d'instructions : AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules.
   - Dossier .agents/ : liste les règles dans .agents/rules/, les compétences dans .agents/skills/, les agents dans .agents/agents/.
   - Signale si le dossier déprécié .agents/workflows/ est présent.
   - Vérifie la présence de fichiers MCP (mcp.json).
5. Lis le README.md (ou les sections introductives) pour résumer l'objectif métier et l'architecture du projet.
6. Ne lis et ne divulgue JAMAIS le contenu des fichiers de secrets (.env, .env.local, clés privées, jetons API).

### Format de restitution obligatoire :
Génère et sauvegarde un fichier antigravity-audit.json à la racine de l'espace de travail (ou affiche-le dans un unique bloc de code JSON) respectant scrupuleusement la structure suivante :

\`\`\`json
{
  "auditVersion": "1.0.0",
  "scannedAt": "<ISO_TIMESTAMP>",
  "projectName": "<Nom extrait du package.json ou du dossier>",
  "projectDescription": "<Résumé succinct en 2 phrases>",
  "targetSurfaceRecommendation": "IDE",
  "techStack": {
    "languages": ["TypeScript"],
    "frameworks": ["Next.js", "React", "Tailwind CSS"],
    "databases": ["PostgreSQL"],
    "testingTools": ["Vitest"],
    "packageManager": "npm"
  },
  "operationalCommands": {
    "build": "npm run build",
    "test": "npm test",
    "lint": "npm run lint",
    "typecheck": "npx tsc --noEmit"
  },
  "projectStructure": {
    "organization": "standalone",
    "sourceRoot": "src",
    "keyDirectories": ["src/app", "src/components", "src/db"]
  },
  "existingAiHarness": {
    "hasRootInstructions": true,
    "rootInstructionFiles": ["AGENTS.md"],
    "rules": [
      { "slug": "code-style", "path": ".agents/rules/code-style.md", "customUserContent": true }
    ],
    "skills": [],
    "subagents": [],
    "hasDeprecatedWorkflows": false,
    "hasMcpConfig": false
  },
  "existingDirectivesToPreserve": []
}
\`\`\`
Indique ensuite à l'utilisateur : « L'audit est terminé et prêt à être téléversé ou copié dans Antigravity Harness Builder. »`;

/**
 * Extrait le JSON d'audit même si l'utilisateur le colle avec du Markdown
 * (ex: clôturé par ```json ... ``` ou texte introductif).
 */
export function parseAuditReportText(rawText: string): AntigravityAuditReport {
  let cleaned = rawText.trim();

  // Extraction si enveloppé dans un bloc markdown ```json ... ```
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    cleaned = jsonBlockMatch[1].trim();
  } else {
    // Si pas de fence explicite, chercher le premier accolade ouvrante et la dernière fermante
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    throw new Error(
      `Impossible de lire le rapport d'audit JSON : syntaxe JSON non valide (${err instanceof Error ? err.message : 'erreur de parsing'}).`
    );
  }

  const result = AntigravityAuditReportSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Format de rapport d'audit invalide (${errorDetails}).`);
  }

  return result.data;
}

export interface AuditExtractionOptions {
  projectId: string;
  projectName: string;
  targetSurface?: AntigravitySurface;
  auditReport: AntigravityAuditReport;
  documentId?: string;
}

/**
 * Transforme le rapport d'audit scanné en un ProjectProfile normalisé haute fidélité.
 * Tous les éléments issus de l'audit réel du code sont marqués 'explicit' avec un niveau de confiance maximal.
 */
export function extractProfileFromAuditReport(options: AuditExtractionOptions): ProjectProfile {
  const { projectId, auditReport, documentId = 'audit-doc' } = options;
  const projectName = auditReport.projectName?.trim() || options.projectName;
  const targetSurface =
    options.targetSurface || (auditReport.targetSurfaceRecommendation as AntigravitySurface) || 'IDE';

  const docRef = {
    documentId,
    documentName: 'antigravity-audit.json',
    location: 'Rapport d\'audit workspace',
  };

  const languages =
    auditReport.techStack.languages.length > 0 ? auditReport.techStack.languages : ['TypeScript'];
  const frameworks = auditReport.techStack.frameworks;
  const databases = auditReport.techStack.databases;
  const testingTools = auditReport.techStack.testingTools;
  const infra = auditReport.techStack.infrastructureAndDeployment || [];

  // Description & Domaine
  const domainText =
    auditReport.projectDescription?.trim() ||
    `Projet existant ${projectName} à moderniser avec les standards Google Antigravity.`;

  // Directives d'architecture & Contraintes
  const architectureConstraints: ProjectProfile['architectureConstraints'] = [];

  if (auditReport.projectStructure) {
    const struct = auditReport.projectStructure;
    const desc = [
      struct.organization ? `Organisation : ${struct.organization}` : null,
      struct.sourceRoot ? `Racine des sources : \`${struct.sourceRoot}\`` : null,
      struct.keyDirectories && struct.keyDirectories.length > 0
        ? `Répertoires clés : ${struct.keyDirectories.map((d) => `\`${d}\``).join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join(' — ');

    if (desc) {
      architectureConstraints.push({
        id: 'arch-structure',
        value: desc,
        epistemicStatus: 'explicit',
        confidence: 'high',
        sourceRefs: [docRef],
        userEdited: false,
      });
    }
  }

  // Directives préservées spécifiées par l'équipe
  for (let i = 0; i < auditReport.existingDirectivesToPreserve.length; i++) {
    const dir = auditReport.existingDirectivesToPreserve[i];
    architectureConstraints.push({
      id: `arch-preserved-${i + 1}`,
      value: `Directive existante préservée : ${dir}`,
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    });
  }

  // Qualité et Stratégie de test basées sur les commandes opérationnelles détectées
  const qualityStrategy: ProjectProfile['qualityAndTestingStrategy'] = [];
  const cmds = auditReport.operationalCommands;
  const cmdEntries = Object.entries(cmds).filter(([_, cmd]) => Boolean(cmd));

  if (cmdEntries.length > 0) {
    qualityStrategy.push({
      id: 'quality-commands',
      value: `Commandes opérationnelles validées : ${cmdEntries
        .map(([key, cmd]) => `**${key}** (\`${cmd}\`)`)
        .join(', ')}.`,
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    });
  }

  if (testingTools.length > 0) {
    qualityStrategy.push({
      id: 'quality-test-tools',
      value: `Outils de test détectés : ${testingTools.join(', ')}. Exécuter les suites de tests avant chaque validation.`,
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    });
  }

  // Sécurité et conformité
  const securityAndCompliance: ProjectProfile['securityAndCompliance'] = [
    {
      id: 'sec-env-guard',
      value: 'Interdiction stricte de lire, commiter ou exposer les variables sensibles (.env, clés d\'API, secrets).',
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    },
    {
      id: 'sec-non-destructive',
      value: 'Mise à niveau non destructive : interdiction d\'écraser silencieusement des fichiers applicatifs ou des règles manuelles sans sauvegarde.',
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    },
  ];

  // Incertitudes et éléments d'attention (notamment dossiers dépréciés)
  const uncertainties: ProjectProfile['uncertainties'] = [];

  if (auditReport.existingAiHarness?.hasDeprecatedWorkflows) {
    uncertainties.push({
      id: 'unc-deprecated-workflows',
      category: 'missing_information',
      topic: 'Migration des anciens workflows (.agents/workflows/)',
      statement:
        'Le répertoire `.agents/workflows/` a été détecté dans le projet existant. Cette structure est dépréciée depuis octobre 2026 dans Antigravity 2.0 au profit des Skills et Sous-agents natifs.',
      impact: 'medium',
      proposedFallback: 'Archiver proprement le dossier vers `.agents/deprecated/workflows` sans suppression brute.',
      requiresHumanDecision: true,
      sourceRefs: [docRef],
      isResolved: false,
    });
  }

  return {
    projectId,
    projectName,
    projectDescription: domainText,
    targetSurface,
    profileVersion: 1,

    domainAndObjective: {
      id: 'domain-audit',
      value: domainText,
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
      userEdited: false,
    },

    personasAndRoles: [
      {
        id: 'role-dev',
        value: 'Développeur / Mainteneur : Pilote l\'implémentation et valide les fusions de harnais proposées.',
        epistemicStatus: 'explicit',
        confidence: 'high',
        sourceRefs: [docRef],
        userEdited: false,
      },
    ],

    features: [
      {
        id: 'feat-modernization',
        title: 'Modernisation du harnais Antigravity',
        description: 'Mettre à niveau le harnais pour intégrer les règles, skills et sous-agents natifs Antigravity.',
        priority: 'P0',
        businessRules: [
          'Préserver l\'intégralité des directives métier existantes de l\'équipe.',
          'Conserver les commandes de test et build réelles du projet.',
        ],
        acceptanceCriteria: [
          'Le script de mise à niveau s\'exécute sans régression de build.',
          'Les fichiers remplacés ou retirés sont sauvegardés dans .agents/.harness-backup/ et aucun fichier modifié par l\'équipe n\'est écrasé.',
        ],
        epistemicStatus: 'explicit',
        confidence: 'high',
        sourceRefs: [docRef],
      },
    ],

    techStack: {
      languages,
      frameworks,
      databases,
      ormAndDataLayer: frameworks.filter((f) => /drizzle|prisma|typeorm|kysely/i.test(f)),
      stateManagement: frameworks.filter((f) => /query|zustand|redux|pinia/i.test(f)),
      apiStyle: frameworks.some((f) => /trpc/i.test(f))
        ? 'tRPC'
        : frameworks.some((f) => /graphql/i.test(f))
          ? 'GraphQL'
          : 'REST',
      infrastructureAndDeployment: infra,
      testingTools,
      complianceStandards: [],
      epistemicStatus: 'explicit',
      confidence: 'high',
      sourceRefs: [docRef],
    },

    architectureConstraints,
    securityAndCompliance,
    qualityAndTestingStrategy: qualityStrategy,

    designSystem: {
      brandIdentity: 'Design System existant du projet',
      colorTokens: {},
      typography: {
        fontFamilies: {},
        scaleNotes: 'Respecter les classes et conventions UI existantes du dépôt.',
      },
      spacingAndLayout: 'Conforme aux conventions CSS/Tailwind détectées.',
      componentGuidelines: ['Réutiliser les composants existants du projet.'],
      uxAndAccessibilityRules: ['Respecter les standards WCAG et la cohérence de l\'interface existante.'],
      epistemicStatus: 'explicit',
      sourceRefs: [docRef],
    },

    uncertainties,

    supplementaryNotes: {
      deploymentConstraints: infra.length > 0 ? infra.join(', ') : undefined,
      qualityLevel: 'Projet existant en production — priorité absolue à la non-régression et aux tests automatisés.',
      costPreferences: 'Optimisé : modèles compacts et rapides pour les tâches d\'audit et de mise à jour.',
    },
  };
}
