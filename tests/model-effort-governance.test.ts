import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  adaptEccAgentMarkdown,
  serializeAntigravitySubagent,
  splitMarkdownFrontmatter,
} from '../src/modules/antigravity-adapter/adapter';
import { AntigravitySubagentFrontmatterSchema } from '../src/modules/antigravity-adapter/schema';
import {
  PackageFileEntry,
  validateRulesAndContextBudget,
  validateSubagents,
} from '../src/modules/antigravity-adapter/validators';
import { getBuiltinCuratedExcellenceComponents } from '../src/modules/ecc-catalog/curated-excellence';
import { HarnessBuilderService, generateOrchestrationPlan } from '../src/modules/harness-builder';
import { HarnessManifestSchema } from '../src/modules/package-exporter/schema';
import { SelectionEngine } from '../src/modules/selection-engine';
import { createSampleDeterministicInput } from './fixtures';

describe('Gouvernance Centralisée du Couple Modèle / Niveau d’Effort & Suppression de model dans le YAML des Agents', () => {
  describe('1. Suppression stricte de `model` dans le frontmatter YAML des sous-agents', () => {
    it('rejette toute clé `model` dans AntigravitySubagentFrontmatterSchema et ne sérialise jamais `model:`', () => {
      const schemaWithModel = AntigravitySubagentFrontmatterSchema.safeParse({
        name: 'code-reviewer',
        description: 'Relecteur indépendant vérifiant la qualité et la sécurité du code.',
        tools: ['view_file', 'grep_search'],
        model: 'pro',
      });
      expect(schemaWithModel.success).toBe(false);

      const serialized = serializeAntigravitySubagent(
        {
          name: 'code-reviewer',
          description: 'Relecteur indépendant vérifiant la qualité et la sécurité du code.',
          tools: ['view_file', 'grep_search'],
        },
        '# Code Reviewer'
      );

      const split = splitMarkdownFrontmatter(serialized);
      expect(split.parsedFrontmatter).not.toBeNull();
      expect('model' in (split.parsedFrontmatter ?? {})).toBe(false);
      expect(serialized).not.toMatch(/^model:/m);
    });

    it('supprime `model:` lors de l’adaptation d’un agent ECC (opus/sonnet/haiku) tout en extrayant le couple recommandé hors-YAML', () => {
      const rawEccOpus = `---
name: architect
description: Software architecture specialist for system design and technical decisions.
tools: Read, Grep, Glob
model: opus
color: purple
---
Design scalable systems.
`;
      const adaptedOpus = adaptEccAgentMarkdown(rawEccOpus, 'architect');
      expect('model' in (adaptedOpus.frontmatter as Record<string, unknown>)).toBe(false);
      expect(adaptedOpus.content).not.toMatch(/^model:/m);
      expect(adaptedOpus.recommendedModelTier).toBe('pro');
      expect(adaptedOpus.recommendedEffort).toBe('high');
      expect(
        adaptedOpus.adaptationNotes.some((n) => n.includes('model') && n.includes('frontmatter'))
      ).toBe(true);

      const rawEccHaiku = `---
name: doc-updater
description: Documentation and codemap updater for lightweight markdown maintenance.
tools: Read, Write, Edit
model: haiku
---
Update docs cleanly.
`;
      const adaptedHaiku = adaptEccAgentMarkdown(rawEccHaiku, 'doc-updater');
      expect(adaptedHaiku.content).not.toMatch(/^model:/m);
      expect(adaptedHaiku.recommendedModelTier).toBe('flash');
      expect(adaptedHaiku.recommendedEffort).toBe('low');
    });

    it('émet SUBAGENT_FORBIDDEN_MODEL_IN_FRONTMATTER dans validateSubagents si un fichier .agents/agents/*.md contient encore `model:`', () => {
      const legacyAgentWithModel = `---
name: build-error-resolver
description: Build and TypeScript error resolution specialist with minimal diffs.
tools:
  - view_file
  - run_command
model: pro
---
# Build Error Resolver
`;
      const issues = validateSubagents([
        {
          relativePath: '.agents/agents/build-error-resolver.md',
          content: legacyAgentWithModel,
        },
      ]);

      expect(issues.map((i) => i.code)).toContain('SUBAGENT_FORBIDDEN_MODEL_IN_FRONTMATTER');
    });

    it('garantit que les sous-agents pré-packagés dans curated-excellence ne contiennent aucun champ `model:`', () => {
      const curatedSubagents = getBuiltinCuratedExcellenceComponents().filter(
        (c) => c.kind === 'SUBAGENT'
      );
      expect(curatedSubagents.length).toBeGreaterThanOrEqual(2);

      for (const sub of curatedSubagents) {
        expect(sub.adaptedContent).not.toMatch(/^model:/m);
        const issues = validateSubagents([
          {
            relativePath: `.agents/agents/${sub.slug}.md`,
            content: sub.adaptedContent,
          },
        ]);
        expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
      }
    });
  });

  describe('2. Règle `always_on` de gouvernance pré-tâche (.agents/rules/model-effort-governance.md) & Cohérence documentaire', () => {
    it('génère systématiquement `.agents/rules/model-effort-governance.md` (trigger: always_on) avec le protocole pré-tâche et un seul couple préconisé', async () => {
      const sample = createSampleDeterministicInput();
      const engine = new SelectionEngine();
      const selection = engine.selectComponents(sample.profile, getBuiltinCuratedExcellenceComponents(), {
        presetMode: 'MINIMAL',
        excellencePacks: [],
      });

      const builder = new HarnessBuilderService();
      const pkg = await builder.buildHarness(sample.profile, selection);

      const govRule = pkg.files.find(
        (f) => f.relativePath === '.agents/rules/model-effort-governance.md'
      );
      expect(govRule).toBeDefined();

      const split = splitMarkdownFrontmatter(govRule!.content);
      expect(split.parsedFrontmatter?.trigger).toBe('always_on');

      // Vérifie les exigences fonctionnelles du protocole pré-tâche :
      // 1. Arbitrage proportionné : une seule fois, avant d'exécuter une tâche longue ou critique
      expect(govRule!.content).toMatch(/avant d['’]exécuter la tâche/i);
      expect(govRule!.content).toMatch(/tâche courte/i);
      expect(govRule!.content).toMatch(/une seule fois/i);
      expect(govRule!.content).toMatch(/coût\s*\/\s*performance/i);
      // 2. Exécution automatique si le couple optimal est identique au couple paramétré
      expect(govRule!.content).toMatch(/identique|même que celui qui est paramétré/i);
      expect(govRule!.content).toMatch(/automatiquement/i);
      // 3. Sinon, demander à l'utilisateur de modifier les paramètres avec UN SEUL couple préconisé
      expect(govRule!.content).toMatch(/un seul couple préconisé|un unique couple/i);
      expect(govRule!.content).toMatch(/Model Selection|<USER_SETTINGS_CHANGE>/);

      // Vérifie l'absence totale de `model:` dans tous les sous-agents générés
      const agentFiles = pkg.files.filter((f) => f.relativePath.startsWith('.agents/agents/'));
      expect(agentFiles.length).toBeGreaterThan(0);
      for (const af of agentFiles) {
        expect(af.content).not.toMatch(/^model:/m);
      }

      // Vérifie AGENTS.md : aucune mention `, modèle :` sur la liste des sous-agents + référence à model-effort-governance.md
      const agentsMd = pkg.files.find((f) => f.relativePath === 'AGENTS.md');
      expect(agentsMd?.content).toContain('.agents/rules/model-effort-governance.md');
      expect(agentsMd?.content).not.toMatch(/\.agents\/agents\/[a-z0-9-]+\.md`, modèle :/);

      // Vérifie START_HERE.md : aucune mention `tier modèle YAML`
      expect(pkg.startHereContent).not.toContain('tier modèle YAML');
      expect(pkg.startHereContent).toContain('.agents/rules/model-effort-governance.md');

      // Vérifie docs/ORCHESTRATION.md et generateOrchestrationPlan
      const orchMd = pkg.files.find((f) => f.relativePath === 'docs/ORCHESTRATION.md');
      expect(orchMd?.content).toContain('.agents/rules/model-effort-governance.md');
      expect(orchMd?.content).not.toContain('Configurable YAML');
      expect(orchMd?.content).toMatch(/un seul couple préconisé/i);

      const dynamicOrch = generateOrchestrationPlan(sample.profile, selection);
      expect(dynamicOrch).toContain('.agents/rules/model-effort-governance.md');
      expect(dynamicOrch).not.toContain('Modèle YAML');

      // Vérifie docs/HARNESS_MANIFEST.json
      const subagentManifestEntries = pkg.manifest.components.filter((c) => c.kind === 'SUBAGENT');
      expect(subagentManifestEntries.length).toBeGreaterThan(0);
      for (const entry of subagentManifestEntries) {
        expect(entry.modelPolicy?.modelConfigurability).toBe('seulement indicatif');
        expect(['flash', 'pro']).toContain(entry.modelPolicy?.recommendedModelTier);
      }
    });

    it('synthétise automatiquement `model-effort-governance` dès SelectionEngine (non-excluable) et préserve le couple (adaptedModel, recommendedEffort) issu de parsedMeta jusqu’au harnais final', async () => {
      const sample = createSampleDeterministicInput();
      const engine = new SelectionEngine();
      const selection = engine.selectComponents(
        sample.profile,
        [
          {
            slug: 'fast-changelog-helper',
            name: 'Assistant Changelog Rapide',
            kind: 'SUBAGENT',
            description: 'Génère rapidement des notes de version légères.',
            adaptedContent:
              '---\nname: fast-changelog-helper\ndescription: Assistant léger\ntools:\n  - view_file\n---\n# Assistant',
            parsedMeta: {
              languages: ['typescript'],
              frameworks: ['next.js'],
              dependencies: [],
              family: 'docs',
              tags: ['typescript', 'nextjs'],
              hasResources: false,
              resourcesList: [],
              skippedUnsafeFiles: [],
              adaptationNotes: [],
              adaptedModel: 'flash',
              recommendedEffort: 'low',
            },
            compatibilityStatus: 'COMPATIBLE',
          },
        ],
        {
          presetMode: 'BALANCED',
          userIncludes: ['fast-changelog-helper'],
          // Même si l'utilisateur tente d'exclure la gouvernance, elle reste automatique et obligatoire
          userExcludes: ['model-effort-governance'],
        }
      );

      // 1. Présent dès l'étape 3 (SelectionResult.customComponents) pour affichage dans l'UI
      const govCustom = selection.customComponents.find(
        (c) => c.slug === 'model-effort-governance'
      );
      expect(govCustom).toBeDefined();
      expect(govCustom?.kind).toBe('RULE');
      expect(govCustom?.content).toContain('trigger: always_on');
      expect(selection.budgetCompliance.rulesBudgetTokens).toBeGreaterThan(200);

      // 2. Le couple (flash / low) issu de parsedMeta est préservé de bout en bout sans champ model dans le YAML
      const builder = new HarnessBuilderService();
      const pkg = await builder.buildHarness(sample.profile, selection);

      const helperManifest = pkg.manifest.components.find(
        (c) => c.id === 'subagent:fast-changelog-helper'
      );
      expect(helperManifest?.modelPolicy?.recommendedModelTier).toBe('flash');
      expect(helperManifest?.modelPolicy?.recommendedEffort).toBe('low');

      const govFile = pkg.files.find(
        (f) => f.relativePath === '.agents/rules/model-effort-governance.md'
      );
      // La règle permanente reste courte : le couple par sous-agent est publié dans docs/ORCHESTRATION.md
      expect(govFile?.content).not.toContain('`fast-changelog-helper`');
      expect(Buffer.byteLength(govFile!.content, 'utf8')).toBeLessThan(3_500);
      const orch = pkg.files.find((f) => f.relativePath === 'docs/ORCHESTRATION.md');
      expect(orch?.content).toContain('`fast-changelog-helper`');
      expect(orch?.content).toContain('Flash — Effort Low');
    });

    it('embarque automatiquement la gouvernance Modèle / Effort sans jamais modifier les agents existants de l’utilisateur, dans tous les formats de déploiement (ZIP, Base64 compact, Markdown allégé, Upgrade)', async () => {
      const sample = createSampleDeterministicInput();
      const engine = new SelectionEngine();
      const selection = engine.selectComponents(
        sample.profile,
        getBuiltinCuratedExcellenceComponents(),
        { presetMode: 'BALANCED' }
      );
      const builder = new HarnessBuilderService();
      const pkg = await builder.buildHarness(sample.profile, selection);

      // 1. Prompt Markdown allégé : contient model-effort-governance.md ET docs/ORCHESTRATION.md ET AGENTS.md
      expect(pkg.lightweightUpgradePromptMarkdown).toContain(
        '.agents/rules/model-effort-governance.md'
      );
      expect(pkg.lightweightUpgradePromptMarkdown).toContain('docs/ORCHESTRATION.md');
      expect(pkg.lightweightUpgradePromptMarkdown).toContain('AGENTS.md');

      // 2. Prompt d'upgrade 5 phases : ne modifie jamais les agents existants de l'utilisateur
      expect(pkg.upgradePromptMarkdown).toContain('Ne modifie jamais');

      // 3. One-liner Base64 : script sûr, sans suppression de `model:` ni déplacement de dossier
      expect(pkg.compactOneLinerPrompt).toContain('.agents/agents');
      expect(pkg.compactOneLinerPrompt).not.toContain('^model:');
      expect(pkg.compactOneLinerPrompt).toContain('--dry-run');
    });
  });

  describe('3. Conformité du harnais actif du dépôt AntigravityHarnessBuilder (Dogfooding)', () => {
    const repoRoot = path.resolve(__dirname, '..');

    it('valide que tous les fichiers .agents/agents/*.md du dépôt sont exempts de `model:` et conformes au validateur', () => {
      const agentsDir = path.join(repoRoot, '.agents', 'agents');
      const agentFiles = fs
        .readdirSync(agentsDir)
        .filter((f) => f.endsWith('.md'))
        .sort();

      expect(agentFiles.length).toBeGreaterThanOrEqual(6);

      const entries: PackageFileEntry[] = agentFiles.map((fileName) => ({
        relativePath: `.agents/agents/${fileName}`,
        content: fs.readFileSync(path.join(agentsDir, fileName), 'utf8'),
      }));

      for (const entry of entries) {
        expect(entry.content).not.toMatch(/^model:/m);
      }

      const issues = validateSubagents(entries);
      expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    });

    it('valide la présence de `.agents/rules/model-effort-governance.md`, le budget de tokens always_on et la cohérence de AGENTS.md / docs/ORCHESTRATION.md / START_HERE.md', () => {
      const govRulePath = path.join(repoRoot, '.agents', 'rules', 'model-effort-governance.md');
      expect(fs.existsSync(govRulePath)).toBe(true);

      const rulesDir = path.join(repoRoot, '.agents', 'rules');
      const ruleEntries: PackageFileEntry[] = fs
        .readdirSync(rulesDir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((fileName) => ({
          relativePath: `.agents/rules/${fileName}`,
          content: fs.readFileSync(path.join(rulesDir, fileName), 'utf8'),
        }));

      const agentsMdContent = fs.readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8');
      const budgetResult = validateRulesAndContextBudget([
        { relativePath: 'AGENTS.md', content: agentsMdContent },
        ...ruleEntries,
      ]);

      expect(budgetResult.issues.filter((i) => i.severity === 'error')).toEqual([]);

      expect(agentsMdContent).toContain('.agents/rules/model-effort-governance.md');
      expect(agentsMdContent).not.toMatch(/\.agents\/agents\/[a-z0-9-]+\.md`, modèle :/);

      const orchContent = fs.readFileSync(path.join(repoRoot, 'docs', 'ORCHESTRATION.md'), 'utf8');
      expect(orchContent).toContain('.agents/rules/model-effort-governance.md');
      expect(orchContent).not.toContain('Configurable YAML');

      const startHereContent = fs.readFileSync(path.join(repoRoot, 'START_HERE.md'), 'utf8');
      expect(startHereContent).not.toContain('tier modèle YAML');

      const manifestRaw = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'docs', 'HARNESS_MANIFEST.json'), 'utf8')
      );
      const parsedManifest = HarnessManifestSchema.parse(manifestRaw);
      expect(
        parsedManifest.components.some((c) => c.id === 'rule:model-effort-governance')
      ).toBe(true);
      for (const comp of parsedManifest.components.filter((c) => c.kind === 'SUBAGENT')) {
        expect(comp.modelPolicy?.modelConfigurability).toBe('seulement indicatif');
      }
    });
  });
});
