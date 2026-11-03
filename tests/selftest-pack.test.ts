import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AntigravityRuleFrontmatterSchema } from '../src/modules/antigravity-adapter/schema';
import { splitMarkdownFrontmatter } from '../src/modules/antigravity-adapter/adapter';
import { validateSubagents } from '../src/modules/antigravity-adapter/validators';
import {
  SELFTEST_ALLOWED_PATH,
  buildSelfTestPack,
  randomNonce,
  renderSelfTestGuide,
  renderSelfTestScript,
} from '../src/modules/selftest/pack';

const NONCE = 'K7M2QX';
const pack = buildSelfTestPack(NONCE);
const dirs: string[] = [];

function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function run(script: string, action: string, project: string): string {
  return execFileSync('bash', [script, action, project], { encoding: 'utf8' });
}

function installScript(): string {
  const dir = tmp('selftest-script-');
  const path = join(dir, 'selftest.sh');
  writeFileSync(path, renderSelfTestScript(pack));
  return path;
}

describe('Pack d’auto-test — contenu', () => {
  it('refuse un jeton mal formé et produit des jetons aléatoires valides', () => {
    expect(() => buildSelfTestPack('abc')).toThrow();
    expect(() => buildSelfTestPack('ABCDEFG')).toThrow();
    expect(randomNonce()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('ne crée que des chemins de la liste blanche', () => {
    for (const f of pack.files) expect(f.relativePath, f.relativePath).toMatch(SELFTEST_ALLOWED_PATH);
  });

  it('chaque jeton attendu dans une sonde est écrit dans un fichier du pack, et dans aucun autre', () => {
    for (const prefix of ['ALWAYS-OK', 'GLOB-OK', 'MD-OK', 'SKILL-OK', 'AGENT-OK', 'FLASH-OK', 'WF-RAN']) {
      const token = `${prefix}-${NONCE}`;
      const holders = pack.files.filter((f) => f.content.includes(token));
      expect(holders.length, token).toBe(1);
    }
    expect(pack.files.filter((f) => f.content.includes('ALWAYS-OK-'))).toHaveLength(1);
  });

  it('les règles respectent le schéma Antigravity et couvrent les trois déclencheurs', () => {
    const triggers = new Set<string>();
    for (const f of pack.files.filter((x) => x.relativePath.startsWith('.agents/rules/'))) {
      const fm = splitMarkdownFrontmatter(f.content).parsedFrontmatter!;
      const parsed = AntigravityRuleFrontmatterSchema.parse(fm);
      triggers.add(parsed.trigger);
    }
    expect([...triggers].sort()).toEqual(['always_on', 'glob', 'model_decision']);
  });

  it('le sous-agent de base est valide ; seul le sous-agent de test du champ model en porte un', () => {
    const probe = pack.files.find((f) => f.relativePath.endsWith('selftest-probe.md'))!;
    expect(validateSubagents([probe]).filter((i) => i.severity === 'error')).toEqual([]);
    const withModel = pack.files.filter((f) => /^model:/m.test(f.content));
    expect(withModel.map((f) => f.relativePath)).toEqual(['.agents/agents/selftest-flash.md']);
  });

  it('le skill porte un name identique à son dossier et une description', () => {
    const skill = pack.files.find((f) => f.relativePath === '.agents/skills/selftest-skill/SKILL.md')!;
    const fm = splitMarkdownFrontmatter(skill.content).parsedFrontmatter!;
    expect(fm.name).toBe('selftest-skill');
    expect(String(fm.description).length).toBeGreaterThan(20);
  });

  it('prévoit 11 sondes avec attendu et conséquence, dont deux facultatives et deux nécessitant le harnais', () => {
    expect(pack.probes.map((p) => p.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11']);
    for (const p of pack.probes) {
      expect(p.prompt.length, p.id).toBeGreaterThan(5);
      expect(p.expected.length, p.id).toBeGreaterThan(20);
      expect(p.ifFails.length, p.id).toBeGreaterThan(40);
    }
    expect(pack.probes.filter((p) => p.optional).map((p) => p.id)).toEqual(['T6', 'T9']);
    expect(pack.probes.filter((p) => p.requiresHarness).map((p) => p.id)).toEqual(['T10', 'T11']);
    expect(pack.probes.find((p) => p.id === 'T6')!.warning).toMatch(/selftest\.sh remove/);
  });

  it('le guide contient les jetons attendus, la grille et la consigne de le garder hors du projet', () => {
    const guide = renderSelfTestGuide(pack);
    expect(guide).toContain(`ALWAYS-OK-${NONCE}`);
    expect(guide).toContain('Ne placez pas ce guide dans le projet testé');
    for (const p of pack.probes) expect(guide).toContain(`### ${p.id} —`);
    expect(guide).toMatch(/\| T11 \|/);
    expect(guide).toContain('bash selftest.sh remove');
  });
});

describe('Pack d’auto-test — script d’installation', () => {
  it('a une syntaxe bash valide', () => {
    expect(() => execFileSync('bash', ['-n', installScript()])).not.toThrow();
  });

  it('installe exactement les fichiers du pack, sans toucher aux fichiers existants', () => {
    const script = installScript();
    const project = tmp('selftest-proj-');
    writeFileSync(join(project, 'keep.txt'), 'à conserver');
    mkdirSync(join(project, '.agents/rules'), { recursive: true });
    writeFileSync(join(project, '.agents/rules/ma-regle.md'), 'règle existante');

    run(script, 'install', project);

    for (const f of pack.files) expect(readFileSync(join(project, f.relativePath), 'utf8').trimEnd(), f.relativePath).toBe(f.content.trimEnd());
    expect(readFileSync(join(project, 'keep.txt'), 'utf8')).toBe('à conserver');
    expect(readFileSync(join(project, '.agents/rules/ma-regle.md'), 'utf8')).toBe('règle existante');
    expect(run(script, 'status', project)).toContain('selftest-always.md');
  });

  it('est idempotent et se désinstalle sans laisser de résidu', () => {
    const script = installScript();
    const project = tmp('selftest-proj-');
    writeFileSync(join(project, 'keep.txt'), 'à conserver');
    mkdirSync(join(project, '.agents/rules'), { recursive: true });
    writeFileSync(join(project, '.agents/rules/ma-regle.md'), 'règle existante');

    run(script, 'install', project);
    run(script, 'install', project);
    run(script, 'remove', project);

    for (const f of pack.files) expect(existsSync(join(project, f.relativePath)), f.relativePath).toBe(false);
    expect(existsSync(join(project, '.agents/.selftest-manifest'))).toBe(false);
    expect(existsSync(join(project, '.agents/skills'))).toBe(false);
    expect(existsSync(join(project, '.agents/workflows'))).toBe(false);
    expect(readFileSync(join(project, 'keep.txt'), 'utf8')).toBe('à conserver');
    expect(readFileSync(join(project, '.agents/rules/ma-regle.md'), 'utf8')).toBe('règle existante');
  });

  it('ignore les chemins non autorisés d’un manifeste altéré', () => {
    const script = installScript();
    const project = tmp('selftest-proj-');
    writeFileSync(join(project, 'keep.txt'), 'à conserver');
    mkdirSync(join(project, '.agents'), { recursive: true });
    writeFileSync(join(project, '.agents/precieux.md'), 'précieux');
    writeFileSync(
      join(project, '.agents/.selftest-manifest'),
      ['keep.txt', '../keep.txt', '.agents/precieux.md', '.agents/rules/../precieux.md', '/etc/hostname'].join('\n') + '\n'
    );

    run(script, 'remove', project);

    expect(readFileSync(join(project, 'keep.txt'), 'utf8')).toBe('à conserver');
    expect(readFileSync(join(project, '.agents/precieux.md'), 'utf8')).toBe('précieux');
  });

  it('échoue proprement sur un dossier inexistant ou une action inconnue', () => {
    const script = installScript();
    expect(() => run(script, 'install', join(tmpdir(), 'dossier-inexistant-selftest'))).toThrow();
    const project = tmp('selftest-proj-');
    expect(() => run(script, 'detruire', project)).toThrow();
  });
});
