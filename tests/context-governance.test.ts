import { describe, expect, it } from 'vitest';
import {
  ALWAYS_ON_BUDGET_BYTES,
  enforceAlwaysOnBudget,
  isReviewerSlug,
  normalizeDelegationDescription,
  restrictReviewerTools,
} from '../src/modules/harness-builder/context-budget';
import { HarnessBuilderService } from '../src/modules/harness-builder';
import { renderModelEffortGovernanceRuleBody } from '../src/modules/package-exporter/governance-template';
import { NATIVE_SLASH_COMMANDS, renderSlashCommandBullets } from '../src/modules/package-exporter/slash-commands';
import { getBuiltinCuratedExcellenceComponents } from '../src/modules/ecc-catalog/curated-excellence';
import { SelectionEngine } from '../src/modules/selection-engine';
import type { SelectedRuleSpec } from '../src/modules/package-exporter/schema';
import { createSampleDeterministicInput } from './fixtures';

function rule(slug: string, bytes: number, originStatus: 'ecc_adapted' | 'project_custom' = 'ecc_adapted'): SelectedRuleSpec {
  return {
    slug,
    title: slug,
    frontmatter: { trigger: 'always_on', description: `Règle ${slug}` },
    markdownBody: 'x'.repeat(bytes),
    selectionRationale: 'test',
    originStatus,
  } as SelectedRuleSpec;
}

describe('Lot 3 — plafond du contexte permanent', () => {
  it('conserve les règles protégées, garde les plus utiles et passe le reste en model_decision', () => {
    const rules = [
      rule('model-effort-governance', 2400, 'project_custom'),
      rule('common-coding-style', 3000),
      rule('common-security', 1000),
      rule('common-testing', 1500),
      rule('common-code-review', 3800),
      rule('common-git-workflow', 900),
    ];
    const res = enforceAlwaysOnBudget(rules, 'BALANCED');

    const trigger = (slug: string) => res.rules.find((r) => r.slug === slug)!.frontmatter.trigger;
    expect(trigger('model-effort-governance')).toBe('always_on');
    expect(trigger('common-security')).toBe('always_on');
    expect(trigger('common-testing')).toBe('always_on');
    expect(trigger('common-coding-style')).toBe('model_decision');
    expect(trigger('common-code-review')).toBe('model_decision');
    expect(res.alwaysOnBytesAfter).toBeLessThanOrEqual(ALWAYS_ON_BUDGET_BYTES.BALANCED);
    expect(res.alwaysOnBytesAfter).toBeLessThan(res.alwaysOnBytesBefore);
  });

  it('donne une description exploitable aux règles rétrogradées (exigence de model_decision) et ne supprime aucune règle', () => {
    const rules = [rule('model-effort-governance', 2400, 'project_custom'), rule('common-coding-style', 9000)];
    const res = enforceAlwaysOnBudget(rules, 'MINIMAL');
    expect(res.rules).toHaveLength(2);
    const demoted = res.rules.find((r) => r.slug === 'common-coding-style')!;
    expect(demoted.frontmatter.trigger).toBe('model_decision');
    expect(demoted.frontmatter.description).toMatch(/coding style/);
    expect(demoted.selectionRationale).toMatch(/budget de contexte permanent/);
  });

  it('est déterministe et inchangé quand le budget n’est pas atteint', () => {
    const rules = [rule('model-effort-governance', 2400, 'project_custom'), rule('common-security', 900)];
    const a = enforceAlwaysOnBudget(rules, 'BALANCED');
    const b = enforceAlwaysOnBudget([...rules].reverse(), 'BALANCED');
    expect(a.demoted).toEqual([]);
    expect(a.rules.map((r) => r.frontmatter.trigger)).toEqual(['always_on', 'always_on']);
    expect(b.demoted).toEqual([]);
  });

  it('ne rétrograde jamais une règle écrite pour le projet, même au-delà du budget', () => {
    const res = enforceAlwaysOnBudget([rule('project-security-compliance-guard', 12_000, 'project_custom')], 'MINIMAL');
    expect(res.rules[0]!.frontmatter.trigger).toBe('always_on');
    expect(res.demoted).toEqual([]);
  });

  it('un harnais généré respecte le plafond du preset et reste valide', async () => {
    const sample = createSampleDeterministicInput();
    const selection = new SelectionEngine().selectComponents(sample.profile, getBuiltinCuratedExcellenceComponents(), {
      presetMode: 'BALANCED',
    });
    const pkg = await new HarnessBuilderService().buildHarness(sample.profile, selection);
    const alwaysOn = pkg.files.filter(
      (f) => f.relativePath.startsWith('.agents/rules/') && /^trigger:\s*always_on/m.test(f.content.slice(0, 300))
    );
    const bytes = alwaysOn.reduce((n, f) => n + Buffer.byteLength(f.content, 'utf8'), 0);
    // Les règles protégées (gouvernance et règles projet) peuvent dépasser le plafond ; ici elles sont courtes.
    expect(bytes).toBeLessThan(ALWAYS_ON_BUDGET_BYTES.BALANCED + 2_000);
    expect(pkg.manifest.validationSummary.valid).toBe(true);
  });
});

describe('Lot 3 — descriptions de sous-agents sans délégation systématique', () => {
  it.each([
    [
      'Build and TypeScript error resolution specialist. Use PROACTIVELY when build fails or type errors occur. Fixes build/type errors only with minimal diffs.',
      'Use when build fails or type errors occur.',
    ],
    [
      'Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code. MUST BE USED for all code changes.',
      'Reviews code for quality, security, and maintainability. Use after a substantial change',
    ],
    ['Diagnose and fix React build failures. MUST BE USED when a React build fails.', 'Use when a React build fails.'],
  ])('neutralise les injonctions de %#', (input, expectedFragment) => {
    const out = normalizeDelegationDescription(input);
    expect(out).not.toMatch(/PROACTIVELY|MUST BE USED|Proactively/i);
    expect(out).toContain(expectedFragment);
    expect(out.length).toBeGreaterThanOrEqual(10);
  });

  it('laisse intacte une description sans injonction', () => {
    const d = 'Audit indépendant des failles de sécurité, injections, secrets et conformité OWASP.';
    expect(normalizeDelegationDescription(d)).toBe(d);
  });

  it('un harnais généré ne contient plus aucune injonction « MUST BE USED / PROACTIVELY » dans ses sous-agents', async () => {
    const sample = createSampleDeterministicInput();
    const selection = new SelectionEngine().selectComponents(sample.profile, getBuiltinCuratedExcellenceComponents(), {
      presetMode: 'THOROUGH',
    });
    const pkg = await new HarnessBuilderService().buildHarness(sample.profile, selection);
    for (const f of pkg.files.filter((x) => x.relativePath.startsWith('.agents/agents/'))) {
      expect(f.content.split('---')[1] ?? '').not.toMatch(/PROACTIVELY|MUST BE USED|Proactively/i);
    }
  });
});

describe('Lot 3 — agents de revue en lecture seule', () => {
  it('reconnaît les agents de revue et retire les outils d’écriture', () => {
    expect(isReviewerSlug('code-reviewer')).toBe(true);
    expect(isReviewerSlug('security-auditor')).toBe(true);
    expect(isReviewerSlug('react-build-resolver')).toBe(false);
    expect(restrictReviewerTools(['view_file', 'write_to_file', 'replace_file_content', 'run_command', 'grep_search'])).toEqual([
      'view_file',
      'run_command',
      'grep_search',
    ]);
  });

  it('aucun agent de revue ou d’audit généré ne reçoit d’outil d’écriture', async () => {
    const sample = createSampleDeterministicInput();
    const selection = new SelectionEngine().selectComponents(sample.profile, getBuiltinCuratedExcellenceComponents(), {
      presetMode: 'THOROUGH',
    });
    const pkg = await new HarnessBuilderService().buildHarness(sample.profile, selection);
    const reviewers = pkg.files.filter(
      (f) => f.relativePath.startsWith('.agents/agents/') && /(?:reviewer|auditor|audit)/.test(f.relativePath)
    );
    expect(reviewers.length).toBeGreaterThan(0);
    for (const f of reviewers) {
      expect(f.content).not.toMatch(/write_to_file|replace_file_content/);
    }
  });
});

describe('Lot 3 — règle modèle/effort et commandes natives', () => {
  const body = renderModelEffortGovernanceRuleBody({ projectName: 'Demo', targetSurface: 'IDE' });

  it('reste courte, sans exemple propre à un autre projet', () => {
    expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(3_500);
    expect(body).not.toMatch(/SEPA|Modulo 97|IBAN/i);
  });

  it('exempte les tâches courtes, prévoit un réglage inconnu et un seul couple préconisé', () => {
    expect(body).toMatch(/Tâche courte/);
    expect(body).toMatch(/Réglage actif inconnu/);
    expect(body).toMatch(/un seul couple préconisé/);
    expect(body).toMatch(/une seule fois/);
  });

  it('ne fait jamais s’arrêter l’agent pour planifier ou analyser, et limite l’avertissement à une phrase (constat T11 de l’auto-test)', () => {
    expect(body).toMatch(/une seule phrase/);
    expect(body).toMatch(/poursuivez immédiatement/);
    expect(body).toMatch(/Planifier, analyser, relire ou proposer sans modifier de fichier n'est \*\*jamais\*\* une raison de s'arrêter/);
    expect(body).toMatch(/difficilement réversible/);
  });

  it('ne recommande que des commandes documentées par Antigravity (pas /compact)', () => {
    const names = NATIVE_SLASH_COMMANDS.map((c) => c.command);
    expect(names).toEqual(expect.arrayContaining(['/plan', '/goal', '/teamwork', '/boost', '/grill-me', '/learn']));
    expect(names).not.toContain('/compact');
    expect(renderSlashCommandBullets()).not.toMatch(/\/compact/);
  });

  it('les documents générés ne mentionnent ni /compact ni les workflows comme mécanisme', async () => {
    const sample = createSampleDeterministicInput();
    const selection = new SelectionEngine().selectComponents(sample.profile, getBuiltinCuratedExcellenceComponents(), {
      presetMode: 'BALANCED',
    });
    const pkg = await new HarnessBuilderService().buildHarness(sample.profile, selection);
    for (const path of ['AGENTS.md', 'docs/ORCHESTRATION.md', 'docs/ARCHITECTURE.md']) {
      const f = pkg.files.find((x) => x.relativePath === path);
      if (!f) continue;
      expect(f.content).not.toMatch(/\/compact/);
    }
    const agents = pkg.files.find((x) => x.relativePath === 'AGENTS.md')!;
    expect(agents.content).toMatch(/\/grill-me/);
    expect(agents.content).toMatch(/pas des workflows/);
  });
});
