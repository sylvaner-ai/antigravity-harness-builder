import { describe, it, expect } from 'vitest';
import {
  parseAuditReportText,
  extractProfileFromAuditReport,
  AUDIT_EXTRACTION_PROMPT,
} from '../src/modules/project-profile/audit-extractor';
import { ProjectProfileSchema } from '../src/modules/project-profile/schema';

describe('Audit Extractor & Upgrade Mode', () => {
  const sampleAuditJson = {
    auditVersion: '1.0.0',
    scannedAt: '2026-10-29T18:00:00Z',
    projectName: 'MySuperApp',
    projectDescription: 'Application de gestion logistique et inventaire.',
    targetSurfaceRecommendation: 'IDE',
    techStack: {
      languages: ['TypeScript', 'SQL'],
      frameworks: ['Next.js 15', 'React 19', 'Tailwind CSS v4'],
      databases: ['PostgreSQL', 'Drizzle ORM'],
      testingTools: ['Vitest', 'Playwright'],
      packageManager: 'npm',
      infrastructureAndDeployment: ['Docker', 'Nginx'],
    },
    operationalCommands: {
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint',
      typecheck: 'npx tsc --noEmit',
    },
    projectStructure: {
      organization: 'standalone',
      sourceRoot: 'src',
      keyDirectories: ['src/app', 'src/components', 'src/db'],
    },
    existingAiHarness: {
      hasRootInstructions: true,
      rootInstructionFiles: ['AGENTS.md'],
      rules: [
        { slug: 'code-style', path: '.agents/rules/code-style.md', customUserContent: true },
      ],
      skills: ['modern-web-guidance'],
      subagents: ['research'],
      hasDeprecatedWorkflows: true,
      hasMcpConfig: false,
    },
    existingDirectivesToPreserve: [
      'Toujours utiliser les composants du dossier src/components',
      'Pas de secrets dans le code',
    ],
  };

  it('fournit un prompt d audit autonome valide et non vide', () => {
    expect(AUDIT_EXTRACTION_PROMPT).toBeDefined();
    expect(AUDIT_EXTRACTION_PROMPT).toContain('antigravity-audit.json');
    expect(AUDIT_EXTRACTION_PROMPT).toContain('lecture seule');
    expect(AUDIT_EXTRACTION_PROMPT).toContain('.env');
  });

  it('parse correctement un JSON d audit pur', () => {
    const raw = JSON.stringify(sampleAuditJson);
    const parsed = parseAuditReportText(raw);
    expect(parsed.projectName).toBe('MySuperApp');
    expect(parsed.techStack.languages).toContain('TypeScript');
    expect(parsed.operationalCommands.test).toBe('npm test');
  });

  it('parse correctement un JSON d audit enveloppé dans un bloc Markdown', () => {
    const markdown = `
Voici l'audit réalisé sur le projet :

\`\`\`json
${JSON.stringify(sampleAuditJson, null, 2)}
\`\`\`

Vous pouvez copier ce résultat.
`;
    const parsed = parseAuditReportText(markdown);
    expect(parsed.projectName).toBe('MySuperApp');
    expect(parsed.techStack.frameworks).toContain('Next.js 15');
    expect(parsed.existingAiHarness?.hasDeprecatedWorkflows).toBe(true);
  });

  it('lève une erreur explicite si le JSON est corrompu', () => {
    expect(() => parseAuditReportText('ceci n est pas du json')).toThrow(/syntaxe JSON non valide/);
  });

  it('génère un ProjectProfile 100% conforme au schéma avec statut explicit', () => {
    const profile = extractProfileFromAuditReport({
      projectId: 'proj-123',
      projectName: 'MySuperApp',
      targetSurface: 'IDE',
      auditReport: sampleAuditJson as any,
    });

    // Validation par le schéma Zod officiel du profil
    const validated = ProjectProfileSchema.safeParse(profile);
    expect(validated.success).toBe(true);

    // Vérification de la classification épistémique
    expect(profile.techStack.epistemicStatus).toBe('explicit');
    expect(profile.domainAndObjective.epistemicStatus).toBe('explicit');
    expect(profile.techStack.frameworks).toContain('Next.js 15');
    expect(profile.techStack.databases).toContain('PostgreSQL');

    // Vérification de la détection des commandes opérationnelles
    const qualityCmd = profile.qualityAndTestingStrategy.find((q) => q.id === 'quality-commands');
    expect(qualityCmd).toBeDefined();
    expect(qualityCmd?.value).toContain('npm test');
    expect(qualityCmd?.value).toContain('npm run build');

    // Vérification des directives préservées
    const preservedRule = profile.architectureConstraints.find((a) =>
      a.value.includes('Directive existante préservée')
    );
    expect(preservedRule).toBeDefined();

    // Vérification du signalement des workflows dépréciés
    const deprecatedUncertainty = profile.uncertainties.find((u) => u.id === 'unc-deprecated-workflows');
    expect(deprecatedUncertainty).toBeDefined();
    expect(deprecatedUncertainty?.statement).toContain('.agents/workflows/');
  });
});
