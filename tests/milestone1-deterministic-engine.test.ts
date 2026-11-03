import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  adaptEccAgentMarkdown,
  sanitizeClaudeSpecificReferences,
  serializeAntigravityRule,
  serializeAntigravitySkill,
  serializeAntigravitySubagent,
  translateModelToAntigravity,
  translateToolsToAntigravity,
} from '../src/modules/antigravity-adapter/adapter';
import {
  validatePackagePathSafety,
  validateRulesAndContextBudget,
  validateSkills,
  validateSubagents,
} from '../src/modules/antigravity-adapter/validators';
import {
  buildDeterministicHarnessPackage,
  verifyGeneratedZipIntegrity,
  renderDeploymentPromptMarkdown,
} from '../src/modules/package-exporter/exporter';
import { createSampleDeterministicInput } from './fixtures';

describe('Jalon 1 — Antigravity Adapter (Traduction & Sérialisation déterministes)', () => {
  it('traduit exactement les 8 outils Claude Code vers la liste blanche Antigravity et filtre les outils non reconnus', () => {
    const result = translateToolsToAntigravity([
      'Read',
      'Write',
      'Edit',
      'Grep',
      'Glob',
      'Bash',
      'WebSearch',
      'WebFetch',
      'Task',
      'TodoWrite',
      'mcp__github__create_issue',
    ]);

    expect(result.tools).toEqual([
      'view_file',
      'write_to_file',
      'replace_file_content',
      'grep_search',
      'find_by_name',
      'run_command',
      'search_web',
      'read_url_content',
    ]);
    expect(result.removedTools).toHaveLength(3);
    expect(result.removedTools.map((r) => r.tool)).toEqual([
      'Task',
      'TodoWrite',
      'mcp__github__create_issue',
    ]);
  });

  it('traduit les tiers de modèles Claude (haiku, sonnet, opus) vers flash/pro et replie les modèles inconnus sur inherit', () => {
    expect(translateModelToAntigravity('haiku')).toEqual({
      model: 'flash',
      wasAdapted: true,
      note: "Modèle source 'haiku' adapté vers le tier natif Antigravity 'flash'.",
    });
    expect(translateModelToAntigravity('sonnet').model).toBe('pro');
    expect(translateModelToAntigravity('opus').model).toBe('pro');
    expect(translateModelToAntigravity('pro')).toEqual({
      model: 'pro',
      wasAdapted: false,
    });
    expect(translateModelToAntigravity('claude-3-5-sonnet-20241022').model).toBe('inherit');
  });

  it('adapte un agent ECC brut en supprimant color:, en traduisant les outils et en retirant les outils de mutation pour un relecteur (§6.2)', () => {
    const rawReviewer = `---
name: security-reviewer
description: Security auditor reviewing code for vulnerabilities and secrets.
tools: Read, Grep, Write, Edit, Bash
model: opus
color: red
---
Check \${CLAUDE_PROJECT_DIR}/src and ~/.claude/rules.
`;
    const adapted = adaptEccAgentMarkdown(rawReviewer, 'security-reviewer', {
      isIndependentReviewer: true,
    });

    expect('model' in adapted.frontmatter).toBe(false);
    expect(adapted.recommendedModelTier).toBe('pro');
    expect(adapted.content).not.toContain('model:');
    expect(adapted.frontmatter.tools).toEqual(['view_file', 'grep_search', 'run_command']);
    expect(adapted.frontmatter.tools).not.toContain('write_to_file');
    expect(adapted.frontmatter.tools).not.toContain('replace_file_content');
    expect(adapted.content).not.toContain('color:');
    expect(adapted.content).not.toContain('${CLAUDE_PROJECT_DIR}');
    expect(adapted.content).not.toContain('~/.claude');
  });

  it('nettoie toutes les variables spécifiques à Claude Code dans un corps Markdown et sérialise un SKILL.md sur une seule ligne de description', () => {
    const raw = 'Run in ${CLAUDE_PROJECT_DIR} with ${CLAUDE_PLUGIN_ROOT} and $ARGUMENTS';
    const res = sanitizeClaudeSpecificReferences(raw);
    expect(res.content).toBe('Run in . with .agents and <user-request>');
    expect(res.replacements.length).toBeGreaterThanOrEqual(3);

    const skillMd = serializeAntigravitySkill(
      {
        name: 'api-design',
        description: 'Multi-line\ndescription collapsed into one inline scalar for Antigravity.',
      },
      '# API Design Skill'
    );
    expect(skillMd).toContain(
      'description: Multi-line description collapsed into one inline scalar for Antigravity.'
    );
  });
});

describe('Jalon 1 — Validateurs statiques de sécurité et de compatibilité Antigravity (FR-09)', () => {
  it('rejette les chemins dangereux (Zip Slip, chemins absolus, workflows legacy dépréciés, hooks et scripts)', () => {
    expect(validatePackagePathSafety('../etc/passwd')[0]?.code).toBe(
      'PATH_TRAVERSAL_OR_INVALID_SEGMENT'
    );
    expect(validatePackagePathSafety('/etc/passwd')[0]?.code).toBe('PATH_UNSAFE_FORMAT');
    expect(validatePackagePathSafety('C:\\Windows\\system32')[0]?.code).toBe('PATH_UNSAFE_FORMAT');
    expect(validatePackagePathSafety('.agents/workflows/plan.md')[0]?.code).toBe(
      'LEGACY_ANTIGRAVITY_PATH_FORBIDDEN'
    );
    expect(validatePackagePathSafety('.agent/rules/test.md')[0]?.code).toBe(
      'LEGACY_ANTIGRAVITY_PATH_FORBIDDEN'
    );
    expect(validatePackagePathSafety('.agents/hooks.json')[0]?.code).toBe(
      'EXECUTABLE_OR_HOOK_FORBIDDEN_V1'
    );
    expect(validatePackagePathSafety('.agents/skills/my-skill/scripts/run.sh')[0]?.code).toBe(
      'EXECUTABLE_OR_HOOK_FORBIDDEN_V1'
    );
  });

  it('rejette un AGENTS.md contenant du frontmatter YAML ou une règle dépassant la limite Antigravity de 24 000 octets', () => {
    const badAgentsMd = `---\ntrigger: always_on\n---\n# Bad AGENTS.md`;
    const oversizedRule = serializeAntigravityRule(
      { trigger: 'always_on' },
      'A'.repeat(24_500)
    );

    const validation = validateRulesAndContextBudget([
      { relativePath: 'AGENTS.md', content: badAgentsMd },
      { relativePath: '.agents/rules/oversized-rule.md', content: oversizedRule },
    ]);

    const codes = validation.issues.map((i) => i.code);
    expect(codes).toContain('AGENTS_MD_FORBIDDEN_FRONTMATTER');
    expect(codes).toContain('RULE_FILE_SIZE_LIMIT_EXCEEDED');
  });

  it('rejette une règle model_decision sans description ou une règle glob sans globs', () => {
    const badModelDecision = `---\ntrigger: model_decision\n---\n# Missing description`;
    const badGlob = `---\ntrigger: glob\n---\n# Missing globs`;

    const validation = validateRulesAndContextBudget([
      { relativePath: '.agents/rules/bad-md.md', content: badModelDecision },
      { relativePath: '.agents/rules/bad-glob.md', content: badGlob },
    ]);

    expect(validation.issues.filter((i) => i.code === 'RULE_SCHEMA_VIOLATION')).toHaveLength(2);
  });

  it('rejette un skill sans SKILL.md, avec un bloc scalaire | sur description, avec une variable Claude ou un lien relatif cassé', () => {
    const badSkillContent = `---
name: wrong-slug
description: |
  Multiline block scalar description that breaks table renderers
---
See [missing](./references/does-not-exist.md) and use \${CLAUDE_SKILL_DIR}.
`;
    const issues = validateSkills([
      { relativePath: '.agents/skills/my-skill/SKILL.md', content: badSkillContent },
      {
        relativePath: '.agents/skills/orphan-skill/references/doc.md',
        content: '# Orphan without SKILL.md',
      },
    ]);

    const codes = issues.map((i) => i.code);
    expect(codes).toContain('SKILL_MISSING_SKILL_MD');
    expect(codes).toContain('SKILL_BLOCK_SCALAR_DESCRIPTION_FORBIDDEN');
    expect(codes).toContain('SKILL_NAME_DIRECTORY_MISMATCH');
    expect(codes).toContain('SKILL_UNTRANSLATED_CLAUDE_VARIABLE');
    expect(codes).toContain('SKILL_BROKEN_RELATIVE_LINK');
  });

  it('rejette un sous-agent avec un outil non reconnu, un modèle invalide ou un relecteur possédant write_to_file', () => {
    const badSubagent = `---
name: code-reviewer
description: Reviewer agent that illegally has write access and invalid tool.
tools:
  - view_file
  - write_to_file
  - Bash
model: opus
---
Instructions.
`;
    const issues = validateSubagents([
      {
        relativePath: '.agents/agents/code-reviewer.md',
        content: badSubagent,
        isReviewerAgent: true,
      },
    ]);

    const codes = issues.map((i) => i.code);
    expect(codes).toContain('SUBAGENT_FORBIDDEN_OR_UNKNOWN_TOOL');
    expect(codes).toContain('SUBAGENT_FORBIDDEN_MODEL_IN_FRONTMATTER');
    expect(codes).toContain('SUBAGENT_SCHEMA_VIOLATION');
  });

  it('rejette spécifiquement un relecteur valide syntaxiquement mais doté de replace_file_content (§6.2)', () => {
    const reviewerWithEdit = serializeAntigravitySubagent(
      {
        name: 'security-auditor',
        description: 'Auditeur sécurité qui ne devrait jamais avoir le droit de modifier le code.',
        tools: ['view_file', 'replace_file_content'],
      },
      '# Security Auditor'
    );

    const issues = validateSubagents([
      {
        relativePath: '.agents/agents/security-auditor.md',
        content: reviewerWithEdit,
        isReviewerAgent: true,
      },
    ]);

    expect(issues.map((i) => i.code)).toContain('REVIEWER_SUBAGENT_HAS_MUTATION_TOOLS');
  });
});

describe('Jalon 1 — Moteur déterministe d’assemblage et d’export ZIP (FR-06, FR-08, §15.1)', () => {
  it('produit une archive ZIP valide, complète, conforme au manifeste et strictement reproductible à entrées identiques', () => {
    const input1 = createSampleDeterministicInput();
    const input2 = createSampleDeterministicInput();

    const pkg1 = buildDeterministicHarnessPackage(input1);
    const pkg2 = buildDeterministicHarnessPackage(input2);

    // 1. Reproductibilité bit-à-bit du ZIP et des fichiers à entrées identiques
    expect(pkg1.zipSha256).toBe(pkg2.zipSha256);
    expect(pkg1.files.map((f) => ({ p: f.relativePath, h: f.sha256 }))).toEqual(
      pkg2.files.map((f) => ({ p: f.relativePath, h: f.sha256 }))
    );

    // 2. Vérification de l'intégrité du ZIP décompressé et de la cohérence bijective avec HARNESS_MANIFEST.json
    const verification = verifyGeneratedZipIntegrity(pkg1.zipBuffer, 'acme-billing-harness');
    expect(verification.valid).toBe(true);

    // 3. Vérification de la présence de tous les fichiers requis par la section §5 du CDC
    const relPaths = pkg1.files.map((f) => f.relativePath);
    expect(relPaths).toContain('START_HERE.md');
    expect(relPaths).toContain('README.md');
    expect(relPaths).toContain('AGENTS.md');
    expect(relPaths).toContain('docs/PROJECT_SPEC.md');
    expect(relPaths).toContain('docs/DESIGN_SYSTEM.md');
    expect(relPaths).toContain('docs/ARCHITECTURE.md');
    expect(relPaths).toContain('docs/ORCHESTRATION.md');
    expect(relPaths).toContain('docs/ACCEPTANCE_CRITERIA.md');
    expect(relPaths).toContain('docs/ASSUMPTIONS.md');
    expect(relPaths).toContain('docs/ECC_SOURCES.md');
    expect(relPaths).toContain('docs/HARNESS_MANIFEST.json');
    expect(relPaths).toContain('.agents/rules/model-effort-governance.md');
    expect(relPaths).toContain('.agents/rules/common-coding-style.md');
    expect(relPaths).toContain('.agents/rules/typescript-strict-billing.md');
    expect(relPaths).toContain('.agents/skills/backend-patterns/SKILL.md');
    expect(relPaths).toContain('.agents/skills/backend-patterns/references/api-checklist.md');
    expect(relPaths).toContain('.agents/agents/architect.md');
    expect(relPaths).toContain('.agents/agents/code-reviewer.md');

    // 4. Vérification du contenu de START_HERE.md (10 étapes, mode simulation, idempotence, validation humaine)
    expect(pkg1.startHereContent).toContain('Étape 1');
    expect(pkg1.startHereContent).toContain('Étape 10');
    expect(pkg1.startHereContent).toContain('mode simulation');
    expect(pkg1.startHereContent).toContain('idempotence');

    // 5. Vérification de la politique indicative Modèle / Effort hors frontmatter YAML (§6.3 & §5.2)
    const architectManifest = pkg1.manifest.components.find((c) => c.id === 'subagent:architect');
    expect(architectManifest?.modelPolicy).toEqual({
      recommendedModelTier: 'pro',
      modelConfigurability: 'seulement indicatif',
      recommendedEffort: 'high',
      effortConfigurability: 'seulement indicatif',
      qualityCostRecommendation:
        'Modèle Pro avec effort élevé recommandé pour la conception des transactions de facturation.',
    });

    // 6. Vérification que les hypothèses et incertitudes figurent dans ASSUMPTIONS.md et le manifeste
    const assumptionsFile = pkg1.files.find((f) => f.relativePath === 'docs/ASSUMPTIONS.md');
    expect(assumptionsFile?.content).toContain('UNC-01');
    expect(assumptionsFile?.content).toContain('Passerelle de paiement internationale');
    expect(pkg1.manifest.assumptionsAndWarnings.uncertaintiesCount).toBe(1);

    // 7. Vérification de la licence MIT et du commit ECC dans ECC_SOURCES.md
    const eccSourcesFile = pkg1.files.find((f) => f.relativePath === 'docs/ECC_SOURCES.md');
    expect(eccSourcesFile?.content).toContain('MIT License');
    expect(eccSourcesFile?.content).toContain('Affaan Mustafa');
    expect(eccSourcesFile?.content).toContain('25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b');

    // 8. Décompression réelle sur le système de fichiers avec l'utilitaire OS `unzip` pour prouver la compatibilité standard (§11.4)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahb-zip-test-'));
    try {
      const zipFilePath = path.join(tmpDir, 'harness.zip');
      const extractDir = path.join(tmpDir, 'extracted');
      fs.mkdirSync(extractDir, { recursive: true });
      fs.writeFileSync(zipFilePath, pkg1.zipBuffer);
      execFileSync('unzip', ['-q', zipFilePath, '-d', extractDir]);
      const extractedStartHere = fs.readFileSync(
        path.join(extractDir, 'acme-billing-harness', 'START_HERE.md'),
        'utf8'
      );
      expect(extractedStartHere).toBe(pkg1.startHereContent);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bloque immédiatement la génération du paquet si un composant viole une règle de sécurité ou un lien de skill', () => {
    const brokenInput = createSampleDeterministicInput();
    brokenInput.selectedSkills[0]!.markdownBody =
      'Follow [broken-link](./references/non-existent.md)';

    expect(() => buildDeterministicHarnessPackage(brokenInput)).toThrow(
      /SKILL_BROKEN_RELATIVE_LINK/
    );
  });

  it('génère un script / prompt de déploiement Markdown autonome pour Antigravity sans passer par le format ZIP', () => {
    const input = createSampleDeterministicInput();
    const pkg = buildDeterministicHarnessPackage(input);

    expect(pkg.deploymentPromptMarkdown).toBeDefined();
    expect(pkg.deploymentPromptMarkdown).toContain('# 🚀 Déploiement Direct du Harnais Antigravity');
    expect(pkg.deploymentPromptMarkdown).toContain('Acme Billing Portal');
    expect(pkg.deploymentPromptMarkdown).toContain('Directives d\'exécution pour Antigravity');

    // Vérifie que chaque fichier est référencé avec son bloc de code
    for (const f of pkg.files) {
      expect(pkg.deploymentPromptMarkdown).toContain(`### Fichier : \`${f.relativePath}\``);
    }

    // Vérifie que la fonction directe renderDeploymentPromptMarkdown produit un résultat cohérent
    const customPrompt = renderDeploymentPromptMarkdown({
      projectName: 'Test App',
      targetSurface: 'CLI',
      files: [
        { relativePath: '.agents/rules/test.md', content: '---\ntrigger: always_on\n---\n# Rule' },
        { relativePath: 'docs/test.md', content: '```bash\necho "nested code block"\n```' },
      ],
    });

    expect(customPrompt).toContain('Test App');
    expect(customPrompt).toContain('(CLI)');
    expect(customPrompt).toContain('### Fichier : `.agents/rules/test.md`');
    expect(customPrompt).toContain('### Fichier : `docs/test.md`');
    // Le bloc avec des backticks imbriqués doit être enveloppé avec au moins 4 backticks
    expect(customPrompt).toMatch(/````markdown[\s\S]*?```bash[\s\S]*?````/);
  });
});
