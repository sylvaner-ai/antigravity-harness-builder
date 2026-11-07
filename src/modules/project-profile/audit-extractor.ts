import { z } from 'zod';
import { ProjectProfile } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';

/** Empreinte SHA-256 en hexadécimal ; mise en minuscules pour comparer avec le manifeste. */
const Sha256Schema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'Empreinte SHA-256 attendue (64 caractères hexadécimaux).')
  .transform((v) => v.toLowerCase());

/** Fichier du harnais existant relevé par l'audit 2.0 (chemin relatif à la racine du projet). */
export const ExistingHarnessFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith('/') && !p.split('/').includes('..'), 'Chemin relatif attendu, sans « .. ».'),
  kind: z.enum(['rule', 'skill', 'subagent', 'workflow', 'instructions', 'other']).optional(),
  sha256: Sha256Schema.optional(),
  description: z.string().max(500).optional(),
  trigger: z.string().optional(),
});
export type ExistingHarnessFile = z.infer<typeof ExistingHarnessFileSchema>;

/** Taille maximale du contenu d'un document fonctionnel joint à l'audit (caractères). */
export const MAX_EMBEDDED_DOCUMENT_CHARS = 2_000_000;

/**
 * Document fonctionnel du dépôt. Depuis l'audit 2.1, son contenu texte est joint (`content`) pour que
 * l'export unique suffise : l'application l'importe comme cahier des charges ou design system.
 */
export const FunctionalDocumentSchema = z.object({
  path: z.string().min(1),
  title: z.string().optional(),
  role: z.enum(['SPECIFICATION', 'DESIGN_SYSTEM', 'SUPPLEMENTARY']).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  content: z.string().max(MAX_EMBEDDED_DOCUMENT_CHARS).optional(),
});
export type FunctionalDocument = z.infer<typeof FunctionalDocumentSchema>;

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
    .default({ languages: [], frameworks: [], databases: [], testingTools: [], infrastructureAndDeployment: [] }),
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
      /** Audit 2.0 : chaque fichier du harnais existant avec son empreinte (base du plan de mise à niveau). */
      files: z.array(ExistingHarnessFileSchema).optional().default([]),
    })
    .optional(),
  /** Audit 2.0 : inventaire du manifeste laissé par une génération précédente d'Antigravity Harness Builder. */
  previousGeneration: z
    .object({
      manifestPath: z.string().optional(),
      generationId: z.string().optional(),
      generatedAt: z.string().optional(),
      files: z.array(z.object({ path: z.string().min(1), sha256: Sha256Schema })).default([]),
    })
    .optional(),
  /** Audit 2.0 : documents fonctionnels du dépôt (cahier des charges, spécifications), à importer à part. */
  functionalDocuments: z.array(FunctionalDocumentSchema).optional().default([]),
  existingDirectivesToPreserve: z.array(z.string()).optional().default([]),
});

export type AntigravityAuditReport = z.infer<typeof AntigravityAuditReportSchema>;

/**
 * Prompt d'audit autonome à copier-coller dans l'agent Antigravity du projet existant.
 */
export const AUDIT_EXTRACTION_PROMPT = `Agis en tant qu'auditeur technique spécialisé Google Antigravity. Ton objectif est de décrire précisément ce projet et son harnais Antigravity actuel, afin qu'Antigravity Harness Builder prépare une mise à niveau du harnais sans rien perdre.

Tu travailles en lecture seule : ne modifie, ne crée et ne supprime aucun fichier, à l'exception du fichier de résultat antigravity-audit.json. Les seules commandes autorisées sont des lectures (ls, cat, find, sha256sum ou shasum -a 256) et la commande node -e ou python3 -c qui écrit ce fichier de résultat.

### Directives d'exécution :
1. Examine les manifestes de dépendances (package.json, pyproject.toml, Cargo.toml, go.mod, docker-compose.yml, etc.).
2. Identifie les commandes exactes du projet : build, test, lint, typecheck, dev.
3. Cartographie l'arborescence (2 à 3 niveaux, en ignorant node_modules, .git, .next, dist, build, coverage, .venv).
4. Inventorie le harnais existant, fichier par fichier, dans existingAiHarness.files :
   - AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules (kind « instructions ») ;
   - chaque fichier de .agents/rules/ (kind « rule », avec la valeur de trigger de son en-tête YAML) ;
   - chaque SKILL.md de .agents/skills/ (kind « skill ») ;
   - chaque fichier de .agents/agents/ (kind « subagent ») ;
   - chaque fichier de .agents/workflows/ s'il existe (kind « workflow », dossier déprécié).
   Pour chacun : chemin relatif, empreinte SHA-256 du contenu exact (sha256sum <fichier>), et la description de son en-tête YAML s'il en a une (200 caractères au plus). N'invente jamais une empreinte : si tu ne peux pas la calculer, omets le champ.
5. Si docs/HARNESS_MANIFEST.json existe (harnais produit par Antigravity Harness Builder), recopie dans previousGeneration son generationId, son generatedAt et, pour chaque entrée de filesInventory, le couple relativePath (dans path) et sha256, sans les modifier.
6. Joins dans functionalDocuments les documents fonctionnels du dépôt, pour que ce fichier unique suffise à l'import :
   - le cahier des charges ou les spécifications (role « SPECIFICATION ») ;
   - le design system, par exemple DESIGN.md (role « DESIGN_SYSTEM ») ;
   - tout autre document de cadrage utile (role « SUPPLEMENTARY »).
   Pour chacun : chemin, role, taille et contenu texte intégral (champ content), sans le résumer ni le modifier. Seuls les formats texte (.md, .txt) sont joints ; pour un PDF ou un DOCX, indique seulement le chemin et la taille.
   Pour insérer ces contenus sans erreur d'échappement, écris antigravity-audit.json avec une commande node -e ou python3 -c qui lit les documents et sérialise l'objet (JSON.stringify ou json.dump), plutôt que de recopier les textes à la main.
7. Lis le README.md pour résumer l'objectif métier du projet en 2 phrases.
8. Relève dans existingDirectivesToPreserve les consignes rédigées par l'équipe qui doivent survivre à la mise à niveau (une phrase par consigne).
9. Ne lis et ne divulgue JAMAIS le contenu des fichiers de secrets (.env, .env.local, clés privées, jetons API).

### Format de restitution obligatoire :
Enregistre le résultat dans antigravity-audit.json à la racine de l'espace de travail (ou affiche-le dans un unique bloc de code JSON), en respectant cette structure :

\`\`\`json
{
  "auditVersion": "2.1.0",
  "scannedAt": "<ISO_TIMESTAMP>",
  "projectName": "<Nom extrait du package.json ou du dossier>",
  "projectDescription": "<Résumé en 2 phrases>",
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
    "hasDeprecatedWorkflows": false,
    "hasMcpConfig": false,
    "files": [
      { "path": "AGENTS.md", "kind": "instructions", "sha256": "<64 caractères hexadécimaux>" },
      { "path": ".agents/rules/code-style.md", "kind": "rule", "trigger": "always_on", "sha256": "<…>", "description": "<…>" }
    ]
  },
  "previousGeneration": {
    "manifestPath": "docs/HARNESS_MANIFEST.json",
    "generationId": "<…>",
    "generatedAt": "<…>",
    "files": [{ "path": ".agents/rules/common-security.md", "sha256": "<…>" }]
  },
  "functionalDocuments": [
    { "path": "docs/cahier-des-charges.md", "role": "SPECIFICATION", "sizeBytes": 54288, "content": "<texte intégral>" },
    { "path": "DESIGN.md", "role": "DESIGN_SYSTEM", "sizeBytes": 12000, "content": "<texte intégral>" }
  ],
  "existingDirectivesToPreserve": []
}
\`\`\`
Omets previousGeneration si docs/HARNESS_MANIFEST.json n'existe pas.
Indique ensuite à l'utilisateur : « L'audit est terminé : importez antigravity-audit.json dans Antigravity Harness Builder. » Précise quels documents fonctionnels ont été joints, et lesquels n'ont pas pu l'être (format non texte).`;

/**
 * Extrait le JSON d'audit même si l'utilisateur le colle avec du Markdown
 * (ex: clôturé par ```json ... ``` ou texte introductif).
 */
export function parseAuditReportText(rawText: string): AntigravityAuditReport {
  const trimmed = rawText.trim();

  // Candidats essayés dans l'ordre. Le fichier brut passe en premier : un audit 2.1 contient des documents
  // Markdown dont les blocs de code (```) tromperaient une recherche de bloc avant la lecture directe.
  const candidates: string[] = [trimmed];
  const fenced = trimmed.match(/```json\s*\n([\s\S]*\})\s*\n```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) candidates.push(trimmed.substring(firstBrace, lastBrace + 1));

  let parsed: unknown;
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate);
      lastError = undefined;
      break;
    } catch (err: unknown) {
      lastError = err;
    }
  }
  if (lastError !== undefined || parsed === undefined) {
    throw new Error(
      `Impossible de lire le rapport d'audit JSON : syntaxe JSON non valide (${lastError instanceof Error ? lastError.message : 'erreur de parsing'}).`
    );
  }

  const result = AntigravityAuditReportSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Format de rapport d'audit invalide (${errorDetails}).`);
  }

  return result.data;
}

export const AUDIT_MISSING_FEATURES_ID = 'feat-missing-from-audit';
export const AUDIT_MISSING_FEATURES_UNCERTAINTY_ID = 'unc-audit-without-features';

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
  const uncertainties: ProjectProfile['uncertainties'] = [
    {
      id: AUDIT_MISSING_FEATURES_UNCERTAINTY_ID,
      category: 'missing_information',
      topic: 'Fonctionnalités métier du projet',
      statement:
        "Le profil vient du seul rapport d'audit : il ne contient aucune fonctionnalité métier. Les règles et skills seront choisis sur la seule pile technique.",
      impact: 'high',
      proposedFallback: 'Importer le cahier des charges du projet puis relancer l’extraction du profil.',
      requiresHumanDecision: true,
      sourceRefs: [docRef],
      isResolved: false,
    },
  ];

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

    // L'audit ne décrit que la technique et le harnais existant : les fonctionnalités viennent du cahier
    // des charges (fusion par mergeAuditIntoProfile). Sans lui, le manque est déclaré, jamais comblé.
    features: [
      {
        id: AUDIT_MISSING_FEATURES_ID,
        title: 'Fonctionnalités métier non fournies',
        description:
          "L'audit décrit la pile technique et le harnais existant, pas les fonctionnalités du projet. Importez le cahier des charges pour les obtenir.",
        priority: 'P0',
        businessRules: [],
        acceptanceCriteria: ['Le cahier des charges est importé et son profil fusionné avec l’audit.'],
        epistemicStatus: 'missing_or_contradictory',
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

/** Fusionne deux listes d'éléments identifiés, la première l'emportant à identifiant égal. */
function mergeById<T extends { id: string }>(first: readonly T[], second: readonly T[]): T[] {
  const seen = new Set(first.map((x) => x.id));
  return [...first, ...second.filter((x) => !seen.has(x.id))];
}

/**
 * Parcours B avec cahier des charges : le cahier fournit le métier (domaine, rôles, fonctionnalités, design system),
 * l'audit fournit la réalité du code (pile technique, commandes, structure, consignes de l'équipe à préserver).
 * Une technologie citée par le cahier mais absente du code est signalée, pas ajoutée.
 */
export function mergeAuditIntoProfile(specProfile: ProjectProfile, auditProfile: ProjectProfile): ProjectProfile {
  const auditTech = auditProfile.techStack;
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  const inCode = new Set(
    [...auditTech.languages, ...auditTech.frameworks, ...auditTech.databases, ...auditTech.testingTools].map(norm)
  );
  const specOnly = [
    ...specProfile.techStack.languages,
    ...specProfile.techStack.frameworks,
    ...specProfile.techStack.databases,
  ].filter((t) => !inCode.has(norm(t)));

  const uncertainties = mergeById(
    specProfile.uncertainties,
    auditProfile.uncertainties.filter((u) => u.id !== AUDIT_MISSING_FEATURES_UNCERTAINTY_ID)
  );
  if (specOnly.length > 0) {
    uncertainties.push({
      id: 'unc-spec-stack-not-in-code',
      category: 'contradiction',
      topic: 'Pile technique : cahier des charges et code existant',
      statement: `Le cahier des charges cite ${specOnly.join(', ')}, absent(s) du code audité. Le harnais suit le code existant.`,
      impact: 'medium',
      proposedFallback: 'Confirmer si une migration technique est prévue ; sinon corriger le cahier des charges.',
      requiresHumanDecision: true,
      sourceRefs: [],
      isResolved: false,
    });
  }

  return {
    ...specProfile,
    techStack: auditTech,
    architectureConstraints: mergeById(auditProfile.architectureConstraints, specProfile.architectureConstraints),
    qualityAndTestingStrategy: mergeById(auditProfile.qualityAndTestingStrategy, specProfile.qualityAndTestingStrategy),
    securityAndCompliance: mergeById(specProfile.securityAndCompliance, auditProfile.securityAndCompliance),
    uncertainties,
  };
}
