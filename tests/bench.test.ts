import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBenchScenarios } from '../src/modules/bench/scenarios';
import {
  changedFiles,
  durationToMs,
  executeBench,
  parseConfig,
  parseEnvelope,
  renderSummary,
  runAgy,
  snapshotFiles,
} from '../src/modules/bench/runner';

const NONCE = 'ABC123';

/** Faux `agy` : lit les fichiers du dossier courant comme le ferait un agent qui charge le harnais. */
const FAKE_AGY = `#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
const args = process.argv.slice(2);
if (process.env.FAKE_AGY_LOG) fs.appendFileSync(process.env.FAKE_AGY_LOG, JSON.stringify({ args, cwd: process.cwd() }) + '\\n');
if (args[0] === '--version') { console.log('1.4.12'); process.exit(0); }
const prompt = args[args.indexOf('-p') + 1];
const tokenIn = (file, prefix) => { try { return (fs.readFileSync(file, 'utf8').match(new RegExp(prefix + '-[A-Z0-9]{6}')) || [''])[0]; } catch { return ''; } };
const out = (response, status = 'SUCCESS') => { console.log(JSON.stringify({ conversation_id: 'c1', status, response, duration_seconds: 1.5, num_turns: 2, usage: { input_tokens: 100, output_tokens: 20 } })); process.exit(status === 'SUCCESS' ? 0 : 1); };
if (process.env.FAKE_AGY_FAIL) out('', 'ERROR');
if (process.env.FAKE_AGY_SLEEP) setTimeout(() => out('trop tard'), 60000);
else if (prompt.includes('SELFTEST-A')) out(tokenIn('.agents/rules/selftest-always.md', 'ALWAYS-OK'));
else if (prompt.includes('selftest-target.txt')) out('Résumé. ' + tokenIn('.agents/rules/selftest-glob.md', 'GLOB-OK'));
else if (prompt.includes('pomme-bleue')) {
  const agents = fs.existsSync('AGENTS.md') ? fs.readFileSync('AGENTS.md', 'utf8') : '';
  out(process.env.FAKE_AGY_FOLLOW_POINTER && agents.includes('selftest-decision.md') ? 'La pomme-bleue. ' + tokenIn('.agents/rules/selftest-decision.md', 'MD-OK') : 'La pomme-bleue est un fruit imaginaire.');
}
else if (prompt.includes('SELFTEST-SKILL')) out(tokenIn('.agents/skills/selftest-skill/SKILL.md', 'SKILL-OK'));
else if (prompt.includes('selftest-probe')) out(tokenIn('.agents/agents/selftest-probe.md', 'AGENT-OK'));
else if (prompt.includes('selftest-flash')) out(tokenIn('.agents/agents/selftest-flash.md', 'FLASH-OK') + ' Gemini 2.5 Flash');
else if (prompt.includes('/selftest-wf')) out(tokenIn('.agents/workflows/selftest-wf.md', 'WF-RAN'));
else if (prompt.includes('Corrige la faute')) {
  const f = 'BENCH-README.md'; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('dévelopement', 'développement'));
  out(process.env.FAKE_AGY_COMMENT ? "Réglage conseillé : Flash. Dites-le-moi si vous préférez garder le réglage actuel. Corrigé." : 'Corrigé.');
}
else if (prompt.includes('plan détaillé')) out((process.env.FAKE_AGY_WAIT ? 'Confirmez le réglage avant de poursuivre. ' : '') + 'Plan. '.repeat(400));
else out('OK');
`;

let work: string;
let fakeAgy: string;
let project: string;

function listBenchTemps(): string[] {
  return readdirSync(tmpdir()).filter((n) => n.startsWith('bench-agy-'));
}

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'bench-test-'));
  fakeAgy = join(work, 'fake-agy.cjs');
  writeFileSync(fakeAgy, FAKE_AGY);
  chmodSync(fakeAgy, 0o755);
  project = join(work, 'projet');
  mkdirSync(join(project, '.agents/rules'), { recursive: true });
  mkdirSync(join(project, 'node_modules/pkg'), { recursive: true });
  writeFileSync(join(project, 'AGENTS.md'), '# Instructions\n');
  writeFileSync(join(project, '.agents/rules/x.md'), '---\ntrigger: always_on\ndescription: x\n---\nx\n');
  writeFileSync(join(project, 'node_modules/pkg/index.js'), '// ne doit pas être copié\n');
});

afterAll(() => {
  rmSync(work, { recursive: true, force: true });
  for (const k of ['FAKE_AGY_FOLLOW_POINTER', 'FAKE_AGY_COMMENT', 'FAKE_AGY_WAIT', 'FAKE_AGY_FAIL', 'FAKE_AGY_LOG', 'FAKE_AGY_SLEEP']) delete process.env[k];
});

async function bench(ids: string[] | null, extra: Partial<Parameters<typeof executeBench>[0]> = {}) {
  const all = buildBenchScenarios(NONCE);
  return executeBench({
    project,
    scenarios: ids ? all.filter((s) => ids.includes(s.id)) : all,
    configs: [{ label: 'défaut' }],
    runs: 1,
    agy: fakeAgy,
    printTimeout: '1m',
    ...extra,
  });
}

describe('Lot 5 — scénarios et exécution (faux agy)', () => {
  it('réussit tous les scénarios quand l’agent suit le harnais et le pointeur d’AGENTS.md, sans toucher au projet', async () => {
    process.env.FAKE_AGY_FOLLOW_POINTER = '1';
    const before = snapshotFiles(project);
    const tempsBefore = listBenchTemps();
    const records = await bench(null);
    delete process.env.FAKE_AGY_FOLLOW_POINTER;

    expect(records).toHaveLength(10);
    // C3 (sans pointeur) échoue : l’agent simulé n’ouvre la règle que si AGENTS.md la lui annonce (mesure de l’option C)
    for (const r of records.filter((x) => x.scenarioId !== 'C3-decision')) expect(r.verdict.pass, `${r.scenarioId} : ${r.verdict.detail}`).toBe(true);
    expect(records.find((r) => r.scenarioId === 'C3-decision')!.verdict.pass).toBe(false);
    expect(changedFiles(before, snapshotFiles(project))).toEqual([]);
    expect(listBenchTemps()).toEqual(tempsBefore);
  });

  it('distingue la règle model_decision avec et sans pointeur (mesure de l’option C)', async () => {
    process.env.FAKE_AGY_FOLLOW_POINTER = '1';
    const records = await bench(['C3-decision', 'C3b-decision-pointeur']);
    delete process.env.FAKE_AGY_FOLLOW_POINTER;
    expect(records.find((r) => r.scenarioId === 'C3-decision')!.verdict.pass).toBe(false);
    expect(records.find((r) => r.scenarioId === 'C3b-decision-pointeur')!.verdict.pass).toBe(true);
  });

  it('ne copie pas node_modules et travaille dans une copie, avec les options documentées de agy', async () => {
    const log = join(work, 'calls.log');
    process.env.FAKE_AGY_LOG = log;
    await bench(['C1-always-on'], { configs: [{ label: 'm1:high', model: 'm1', effort: 'high' }], printTimeout: '7m' });
    delete process.env.FAKE_AGY_LOG;
    const call = JSON.parse(readFileSync(log, 'utf8').trim().split('\n')[0]!) as { args: string[]; cwd: string };
    expect(call.cwd).not.toBe(project);
    expect(call.args.slice(0, 1)).toEqual(['-p']);
    expect(call.args).toEqual(expect.arrayContaining(['--output-format', 'json', '--print-timeout', '7m', '--model', 'm1', '--effort', 'high']));
    expect(call.args).not.toContain('--dangerously-skip-permissions');
    expect(existsSync(join(call.cwd, 'node_modules'))).toBe(false);
  });

  it('G1 échoue quand l’agent commente le réglage du modèle sur une tâche courte', async () => {
    process.env.FAKE_AGY_COMMENT = '1';
    const [r] = await bench(['G1-tache-courte']);
    delete process.env.FAKE_AGY_COMMENT;
    expect(r!.verdict.pass).toBe(false);
    expect(r!.verdict.detail).toMatch(/faute corrigée : oui ; commentaire sur le modèle : oui/);
  });

  it('G2 échoue quand l’agent attend la confirmation de l’utilisateur', async () => {
    process.env.FAKE_AGY_WAIT = '1';
    const [r] = await bench(['G2-tache-longue']);
    delete process.env.FAKE_AGY_WAIT;
    expect(r!.verdict.pass).toBe(false);
    expect(r!.verdict.detail).toMatch(/attente de l'utilisateur : oui/);
  });

  it('G2 détecte une modification de fichier malgré la consigne de ne rien modifier', () => {
    const g2 = buildBenchScenarios(NONCE).find((s) => s.id === 'G2-tache-longue')!;
    const v = g2.evaluate({ dir: work, response: 'Plan. '.repeat(400), status: 'SUCCESS', filesChanged: ['src/auth.ts'] });
    expect(v.pass).toBe(false);
    expect(v.detail).toContain('src/auth.ts');
  });

  it('une exécution en échec est consignée comme échec avec son statut, sans exception', async () => {
    process.env.FAKE_AGY_FAIL = '1';
    const [r] = await bench(['C1-always-on']);
    delete process.env.FAKE_AGY_FAIL;
    expect(r!.result.ok).toBe(false);
    expect(r!.result.status).toBe('ERROR');
    expect(r!.verdict).toEqual({ pass: false, detail: expect.stringContaining('ERROR') });
  });

  it('un exécutable introuvable donne SPAWN_ERROR sans planter', async () => {
    const res = await runAgy({ agy: join(work, 'absent'), prompt: 'x', cwd: work, config: { label: 'défaut' }, printTimeout: '1m', killAfterMs: 5_000 });
    expect(res.status).toBe('SPAWN_ERROR');
    expect(res.ok).toBe(false);
  });

  it('interrompt un agy qui ne rend pas la main', async () => {
    process.env.FAKE_AGY_SLEEP = '1';
    const res = await runAgy({ agy: fakeAgy, prompt: 'x', cwd: work, config: { label: 'défaut' }, printTimeout: '1m', killAfterMs: 600 });
    delete process.env.FAKE_AGY_SLEEP;
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/interrompu/);
  });
});

describe('Lot 5 — utilitaires et synthèse', () => {
  it('lit l’enveloppe JSON même entourée de texte', () => {
    expect(parseEnvelope('{"status":"SUCCESS","response":"a"}')?.response).toBe('a');
    expect(parseEnvelope('bruit\n{"status":"SUCCESS","response":"b"}\n')?.response).toBe('b');
    expect(parseEnvelope('pas du json')).toBeNull();
  });

  it('valide les durées et les configurations', () => {
    expect(durationToMs('90s')).toBe(90_000);
    expect(durationToMs('10m')).toBe(600_000);
    expect(() => durationToMs('dix minutes')).toThrow(/Durée invalide/);
    expect(parseConfig('gemini-3.8-flash-medium:low')).toEqual({ label: 'gemini-3.8-flash-medium:low', model: 'gemini-3.8-flash-medium', effort: 'low' });
    expect(parseConfig('m')).toEqual({ label: 'm', model: 'm' });
    expect(() => parseConfig('a:b:c')).toThrow(/Configuration invalide/);
  });

  it('résume taux de réussite, durée, consommation (champs numériques de usage) et échecs', async () => {
    process.env.FAKE_AGY_FOLLOW_POINTER = '1';
    const records = await bench(['C1-always-on', 'C3-decision'], { runs: 2 });
    delete process.env.FAKE_AGY_FOLLOW_POINTER;
    const md = renderSummary(records, { project: 'p', runs: 2, generatedAt: '2026-11-03T00:00:00Z', agyVersion: '1.4.12' });
    expect(md).toContain('Version agy : 1.4.12');
    expect(md).toMatch(/\| C1-always-on \| 2\/2 \| 1\.5 \| 2\.0 \| input_tokens=100, output_tokens=20 \|/);
    expect(md).toMatch(/\| C3-decision \| 0\/2 /);
    expect(md).toContain('## Détail des échecs');
  });
});

describe('Lot 5 — ligne de commande', () => {
  const cli = (args: string[], env: Record<string, string> = {}) =>
    spawnSync('npx', ['tsx', 'scripts/bench-antigravity.mts', ...args], { encoding: 'utf8', env: { ...process.env, ...env }, cwd: process.cwd() });

  it('exige --project et un harnais présent', () => {
    expect(cli([]).stderr).toMatch(/--project est obligatoire/);
    const empty = mkdtempSync(join(work, 'vide-'));
    expect(cli(['--project', empty]).stderr).toMatch(/aucun harnais trouvé/);
  });

  it('refuse un scénario inconnu et annonce le nombre d’appels en --dry-run', () => {
    expect(cli(['--project', project, '--scenarios', 'ZZ']).stderr).toMatch(/inconnu\(s\) : ZZ/);
    const dry = cli(['--project', project, '--runs', '2', '--config', 'a:low', '--config', 'b:high', '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.stdout).toMatch(/Exécutions prévues : 40 appels/);
  });

  it('s’arrête avec un message clair si agy n’est pas utilisable (contrôle préalable)', () => {
    const res = cli(['--project', project, '--agy', join(work, 'absent'), '--out', join(work, 'sortie-ko')]);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/contrôle préalable en échec/);
  });

  it('exécute de bout en bout avec un faux agy et écrit runs.jsonl et summary.md', () => {
    const out = join(work, 'sortie');
    const res = cli(['--project', project, '--agy', fakeAgy, '--runs', '1', '--scenarios', 'C1-always-on,C4-skill', '--out', out]);
    expect(res.status, res.stderr).toBe(0);
    const dir = join(out, readdirSync(out)[0]!);
    const lines = readFileSync(join(dir, 'runs.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(readFileSync(join(dir, 'summary.md'), 'utf8')).toMatch(/\| C1-always-on \| 1\/1 /);
    expect(res.stdout).toMatch(/Version agy : 1\.4\.12/);
    // reconstruction de la synthèse depuis le fichier de résultats
    const again = execFileSync('npx', ['tsx', 'scripts/bench-antigravity.mts', '--summarize', join(dir, 'runs.jsonl')], { encoding: 'utf8' });
    expect(again).toMatch(/\| C4-skill \| 1\/1 /);
  });
});
