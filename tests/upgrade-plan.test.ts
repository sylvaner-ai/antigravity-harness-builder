import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeUpgradePlan, renderUpgradePlanMarkdown } from '../src/modules/package-exporter/upgrade-plan';
import { renderUpgradePromptMarkdown } from '../src/modules/package-exporter/templates';

const sha = (c: string) => crypto.createHash('sha256').update(c).digest('hex');
const actionOf = (plan: ReturnType<typeof computeUpgradePlan>, path: string) => plan?.find((e) => e.path === path)?.action;

describe('Plan de mise à niveau calculé (parcours B)', () => {
  // Génération précédente : trois règles et une doc posées par AHB
  const previousFiles = [
    { path: '.agents/rules/common-security.md', sha256: sha('securite v1') },
    { path: '.agents/rules/common-testing.md', sha256: sha('tests v1') },
    { path: '.agents/rules/old-rule.md', sha256: sha('ancienne') },
    { path: '.agents/rules/old-edited.md', sha256: sha('ancienne 2') },
    { path: 'docs/ORCHESTRATION.md', sha256: sha('orchestration v1') },
    { path: 'docs/OBSOLETE.md', sha256: sha('obsolete') },
  ];
  // État du projet audité
  const existingFiles = [
    { path: 'AGENTS.md', sha256: sha('consignes équipe') },
    { path: '.agents/rules/common-security.md', sha256: sha('securite v1') }, // intact
    { path: '.agents/rules/common-testing.md', sha256: sha('tests modifiés par l’équipe') }, // modifié
    { path: '.agents/rules/old-rule.md', sha256: sha('ancienne') }, // intact, plus généré
    { path: '.agents/rules/old-edited.md', sha256: sha('ancienne 2 modifiée') }, // modifié, plus généré
    { path: '.agents/rules/team-rule.md', sha256: sha('règle équipe') }, // jamais généré
    { path: '.agents/rules/code-style.md', sha256: sha('style équipe') }, // homonyme d'une nouvelle règle
    { path: '.agents/skills/same/SKILL.md', sha256: sha('identique') },
  ];
  const newFiles = [
    { relativePath: 'AGENTS.md', content: 'nouveau bloc géré' },
    { relativePath: '.agents/rules/common-security.md', content: 'securite v2' },
    { relativePath: '.agents/rules/common-testing.md', content: 'tests v2' },
    { relativePath: '.agents/rules/code-style.md', content: 'style AHB' },
    { relativePath: '.agents/rules/new-rule.md', content: 'nouvelle' },
    { relativePath: '.agents/skills/same/SKILL.md', content: 'identique' },
    { relativePath: 'docs/ORCHESTRATION.md', content: 'orchestration v2' },
    { relativePath: 'README.md', content: 'readme du paquet' },
    { relativePath: 'docs/HARNESS_MANIFEST.json', content: '{}' },
  ];
  const plan = computeUpgradePlan({ newFiles, existingFiles, previousFiles });

  it('ne modifie ou ne retire que les fichiers AHB intacts', () => {
    expect(actionOf(plan, '.agents/rules/common-security.md')).toBe('UPDATE');
    expect(actionOf(plan, '.agents/rules/old-rule.md')).toBe('REMOVE');
    expect(plan?.find((e) => e.path === '.agents/rules/old-rule.md')?.expectedSha256).toBe(sha('ancienne'));
  });

  it('conserve tout ce qui appartient à l’équipe ou a été modifié par elle', () => {
    expect(actionOf(plan, '.agents/rules/common-testing.md')).toBe('CONFLICT');
    expect(actionOf(plan, '.agents/rules/code-style.md')).toBe('CONFLICT');
    expect(actionOf(plan, '.agents/rules/old-edited.md')).toBe('KEEP');
    expect(actionOf(plan, '.agents/rules/team-rule.md')).toBe('KEEP');
  });

  it('crée, fusionne et ignore ce qui est déjà identique', () => {
    expect(actionOf(plan, '.agents/rules/new-rule.md')).toBe('CREATE');
    expect(actionOf(plan, 'AGENTS.md')).toBe('MERGE');
    expect(actionOf(plan, '.agents/skills/same/SKILL.md')).toBe('UNCHANGED');
    expect(actionOf(plan, 'docs/HARNESS_MANIFEST.json')).toBe('UPDATE');
  });

  it('hors inventaire, ne remplace ou ne retire qu’après vérification de l’empreinte', () => {
    expect(actionOf(plan, 'README.md')).toBe('CREATE_IF_ABSENT');
    const orchestration = plan?.find((e) => e.path === 'docs/ORCHESTRATION.md');
    expect(orchestration?.action).toBe('UPDATE');
    expect(orchestration?.expectedSha256).toBe(sha('orchestration v1'));
    expect(actionOf(plan, 'docs/OBSOLETE.md')).toBe('REMOVE');
  });

  it('renvoie undefined pour un audit 1.0 sans inventaire', () => {
    expect(computeUpgradePlan({ newFiles, existingFiles: [] })).toBeUndefined();
  });

  it('le prompt de mise à niveau embarque le plan et omet les fichiers déjà identiques', () => {
    const md = renderUpgradePlanMarkdown(plan!);
    expect(md).toContain('CONFLIT');
    expect(md).toContain(sha('ancienne'));

    const prompt = renderUpgradePromptMarkdown({ projectName: 'Felicicar', files: newFiles, plan });
    expect(prompt).toContain('Plan de mise à niveau calculé par Antigravity Harness Builder');
    expect(prompt).toContain('plan calculé');
    expect(prompt).not.toContain('### Fichier : `.agents/skills/same/SKILL.md`');
    expect(prompt).toContain('### Fichier : `.agents/rules/new-rule.md`');
  });

  it('sans plan, le prompt garde le protocole général', () => {
    const prompt = renderUpgradePromptMarkdown({ projectName: 'Felicicar', files: newFiles });
    expect(prompt).not.toContain('Plan de mise à niveau calculé');
    expect(prompt).toContain('Inspecte l\'arborescence actuelle');
  });

  describe('règle de l’équipe en chevauchement avec la gouvernance modèle / effort', () => {
    const governance = { relativePath: '.agents/rules/model-effort-governance.md', content: 'gouvernance' };
    const legacy = {
      path: '.agents/rules/00-model-routing.md',
      kind: 'rule',
      trigger: 'always_on',
      sha256: sha('ancien routage'),
      description: 'Évaluation systématique du couple optimal modèle / effort avant chaque tâche.',
    };
    const base = [{ path: 'AGENTS.md', sha256: sha('x') }];

    it('signale une règle permanente de l’équipe sur le même sujet, sans la retirer', () => {
      const p = computeUpgradePlan({ newFiles: [governance], existingFiles: [...base, legacy] });
      expect(actionOf(p, legacy.path)).toBe('OVERLAP');
      expect(p?.find((e) => e.path === legacy.path)?.expectedSha256).toBeUndefined();
    });

    it('ne signale rien si la règle n’est pas permanente, ou si le sujet est autre', () => {
      const onDemand = { ...legacy, trigger: 'model_decision' };
      const other = { path: '.agents/rules/code-style.md', kind: 'rule', trigger: 'always_on', sha256: sha('s'), description: 'Style de code.' };
      const p = computeUpgradePlan({ newFiles: [governance], existingFiles: [...base, onDemand, other] });
      expect(actionOf(p, legacy.path)).toBe('KEEP');
      expect(actionOf(p, other.path)).toBe('KEEP');
    });

    it('ne signale rien si le nouveau harnais ne contient pas la règle gérée', () => {
      const p = computeUpgradePlan({ newFiles: [{ relativePath: 'AGENTS.md', content: 'n' }], existingFiles: [...base, legacy] });
      expect(actionOf(p, legacy.path)).toBe('KEEP');
    });

    it('le prompt demande l’arbitrage et interdit toute suppression d’office', () => {
      const p = computeUpgradePlan({ newFiles: [governance], existingFiles: [...base, legacy] });
      const prompt = renderUpgradePromptMarkdown({ projectName: 'Felicicar', files: [governance], plan: p });
      expect(prompt).toContain('CHEVAUCHEMENT');
      expect(prompt).toContain('Règles de l\'équipe en chevauchement');
      expect(prompt).toContain('Ne la supprime ni ne la modifie de toi-même');
      const sans = renderUpgradePromptMarkdown({ projectName: 'Felicicar', files: [governance] });
      expect(sans).not.toContain('en chevauchement');
    });
  });
});
