import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { buildTarGzBase64 } from '../src/modules/package-exporter/tar-builder';
import { renderSafeInstallScript } from '../src/modules/package-exporter/deploy-script';

type PkgFile = { relativePath: string; content: string };

const BASE_FILES: PkgFile[] = [
  { relativePath: 'AGENTS.md', content: '# Instructions du harnais\n' },
  { relativePath: 'README.md', content: '# README du paquet (ne doit jamais atterrir à la racine)\n' },
  { relativePath: 'START_HERE.md', content: '# Démarrage\n' },
  { relativePath: 'docs/HARNESS_MANIFEST.json', content: '{"v":1}\n' },
  { relativePath: '.agents/rules/rule-a.md', content: '---\ntrigger: always_on\ndescription: A\n---\nRègle A v1\n' },
  { relativePath: '.agents/rules/rule-b.md', content: '---\ntrigger: always_on\ndescription: B\n---\nRègle B v1\n' },
  { relativePath: '.agents/agents/reviewer.md', content: '---\nname: reviewer\ndescription: Relecteur\n---\nCorps\n' },
  { relativePath: '.agents/skills/tdd/SKILL.md', content: '---\nname: tdd\ndescription: TDD\n---\nCorps\n' },
];

function withFile(files: PkgFile[], rel: string, content: string): PkgFile[] {
  return files.map((f) => (f.relativePath === rel ? { ...f, content } : f));
}

describe('Script d’installation sûre du harnais (exécuté réellement avec bash)', () => {
  let project: string;
  let scratch: string;

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'harness-proj-'));
    scratch = mkdtempSync(join(tmpdir(), 'harness-scr-'));
  });
  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
    rmSync(scratch, { recursive: true, force: true });
  });

  function run(files: PkgFile[], args: string[] = [], opts: { projectName?: string; smoke?: string } = {}) {
    const script = renderSafeInstallScript({
      projectName: opts.projectName ?? 'Projet Test',
      base64Payload: buildTarGzBase64(files),
      smokeTestCommand: opts.smoke,
    });
    const scriptPath = join(scratch, `deploy-${Math.random().toString(36).slice(2)}.sh`);
    writeFileSync(scriptPath, script);
    const r = spawnSync('bash', [scriptPath, ...args], { cwd: project, encoding: 'utf8' });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  }
  const read = (rel: string) => readFileSync(join(project, rel), 'utf8');
  const exists = (rel: string) => existsSync(join(project, rel));
  const write = (rel: string, content: string) => {
    mkdirSync(dirname(join(project, rel)), { recursive: true });
    writeFileSync(join(project, rel), content);
  };

  it('installe un projet vierge, écrit le verrou et n’installe jamais README.md à la racine', () => {
    const r = run(BASE_FILES);
    expect(r.status).toBe(0);
    expect(r.out).toContain('✅ Harnais installé');
    expect(read('.agents/rules/rule-a.md')).toContain('Règle A v1');
    expect(read('AGENTS.md')).toBe('# Instructions du harnais\n');
    expect(exists('README.md')).toBe(false);
    const lock = read('.agents/harness.lock');
    expect(lock).toContain('.agents/rules/rule-a.md');
    expect(lock).not.toContain('README.md');
  });

  it('est idempotent : une seconde exécution ne change rien et ne crée aucune sauvegarde', () => {
    run(BASE_FILES);
    const r = run(BASE_FILES);
    expect(r.status).toBe(0);
    expect(r.out).toContain('0 à créer, 0 à mettre à jour');
    expect(exists('.agents/.harness-backup')).toBe(false);
  });

  it('ne modifie jamais les agents de l’utilisateur (la ligne model: est conservée)', () => {
    const mine = '---\nname: mon-agent\ndescription: Le mien\nmodel: pro\n---\nCorps perso\n';
    write('.agents/agents/mon-agent.md', mine);
    const r = run(BASE_FILES);
    expect(r.status).toBe(0);
    expect(read('.agents/agents/mon-agent.md')).toBe(mine);
  });

  it('n’écrase pas un AGENTS.md existant : conflit signalé et proposition déposée', () => {
    write('AGENTS.md', '# Mes consignes\n');
    const r = run(BASE_FILES);
    expect(r.status).toBe(0);
    expect(r.out).toContain('Conflits');
    expect(read('AGENTS.md')).toBe('# Mes consignes\n');
    expect(read('.agents/.harness-proposed/AGENTS.md')).toBe('# Instructions du harnais\n');
  });

  it('met à jour un fichier resté intact et sauvegarde l’ancienne version', () => {
    run(BASE_FILES);
    const v2 = withFile(BASE_FILES, '.agents/rules/rule-a.md', '---\ntrigger: always_on\ndescription: A\n---\nRègle A v2\n');
    const r = run(v2);
    expect(r.status).toBe(0);
    expect(read('.agents/rules/rule-a.md')).toContain('Règle A v2');
    const backups = readdirSync(join(project, '.agents/.harness-backup'));
    expect(backups).toHaveLength(1);
    expect(readFileSync(join(project, '.agents/.harness-backup', backups[0]!, '.agents/rules/rule-a.md'), 'utf8')).toContain('Règle A v1');
  });

  it('n’écrase pas un fichier géré modifié localement', () => {
    run(BASE_FILES);
    write('.agents/rules/rule-a.md', 'Ma version modifiée\n');
    const v2 = withFile(BASE_FILES, '.agents/rules/rule-a.md', '---\ntrigger: always_on\ndescription: A\n---\nRègle A v2\n');
    const r = run(v2);
    expect(r.status).toBe(0);
    expect(r.out).toContain('Conflits');
    expect(read('.agents/rules/rule-a.md')).toBe('Ma version modifiée\n');
    expect(read('.agents/.harness-proposed/.agents/rules/rule-a.md')).toContain('Règle A v2');
  });

  it('retire un fichier disparu du paquet seulement s’il est intact, sinon le conserve', () => {
    run(BASE_FILES);
    write('.agents/rules/rule-b.md', 'Modifié par moi\n');
    const without = BASE_FILES.filter(
      (f) => f.relativePath !== '.agents/rules/rule-b.md' && f.relativePath !== '.agents/skills/tdd/SKILL.md'
    );
    const r = run(without);
    expect(r.status).toBe(0);
    expect(exists('.agents/skills/tdd/SKILL.md')).toBe(false);
    expect(read('.agents/rules/rule-b.md')).toBe('Modifié par moi\n');
    expect(r.out).toContain('modifiés localement, donc conservés');
  });

  it('--dry-run n’écrit rien', () => {
    const r = run(BASE_FILES, ['--dry-run']);
    expect(r.status).toBe(0);
    expect(r.out).toContain('Simulation terminée');
    expect(readdirSync(project)).toHaveLength(0);
  });

  it('ne touche pas au dossier déprécié .agents/workflows', () => {
    write('.agents/workflows/old.md', 'ancien workflow\n');
    const r = run(BASE_FILES);
    expect(r.status).toBe(0);
    expect(read('.agents/workflows/old.md')).toBe('ancien workflow\n');
    expect(r.out).toContain('.agents/workflows/');
  });

  it('refuse une archive contenant un chemin remontant (..) et n’écrit rien', () => {
    const evil = [...BASE_FILES, { relativePath: '../evil.md', content: 'x' }];
    const r = run(evil);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('Chemin suspect');
    expect(exists('.agents')).toBe(false);
    expect(existsSync(join(dirname(project), 'evil.md'))).toBe(false);
  });

  it('n’exécute pas un nom de projet hostile', () => {
    const marker = join(scratch, 'pwned');
    const r = run(BASE_FILES, [], { projectName: `x'; touch ${marker}; echo '$(touch ${marker})` });
    expect(r.status).toBe(0);
    expect(existsSync(marker)).toBe(false);
  });

  it('signale un frontmatter dont le name ne correspond pas au fichier', () => {
    const bad = withFile(BASE_FILES, '.agents/agents/reviewer.md', '---\nname: autre\ndescription: X\n---\n');
    const r = run(bad);
    expect(r.status).toBe(0);
    expect(r.out).toContain('Frontmatter à vérifier');
  });

  it('exécute la commande de non-régression autorisée et ignore une commande hostile', () => {
    const ok = run(BASE_FILES, [], { smoke: 'echo smoke-ok' });
    expect(ok.out).toContain('smoke-ok');
    rmSync(join(project, '.agents'), { recursive: true, force: true });
    const marker = join(scratch, 'pwned2');
    const bad = run(BASE_FILES, [], { smoke: `echo a; touch ${marker}` });
    expect(bad.out).not.toContain('Test de non-régression');
    expect(existsSync(marker)).toBe(false);
  });
});
