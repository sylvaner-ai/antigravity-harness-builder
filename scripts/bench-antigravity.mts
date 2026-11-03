/**
 * Banc d'essai Antigravity en mode non interactif (`agy -p`).
 *
 * Usage (depuis la racine du dépôt, après une première connexion interactive à `agy`) :
 *   npx tsx scripts/bench-antigravity.mts --project /chemin/du/projet [--runs 3] [--config modèle[:effort]]...
 *        [--scenarios C1-always-on,G1-tache-courte] [--agy agy] [--timeout 10m] [--out ./bench-results] [--dry-run]
 *   npx tsx scripts/bench-antigravity.mts --summarize bench-results/<dossier>/runs.jsonl
 *
 * Les modèles disponibles se listent avec `agy models`. Le projet n'est jamais modifié : chaque essai travaille
 * dans une copie jetable.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parseArgs } from 'node:util';
import { buildBenchScenarios } from '../src/modules/bench/scenarios';
import { executeBench, parseConfig, projectHasHarness, renderSummary, runAgy, type AgyConfig, type RunRecord } from '../src/modules/bench/runner';
import { randomNonce } from '../src/modules/selftest/pack';

function fail(message: string, code = 1): never {
  console.error(`Erreur : ${message}`);
  process.exit(code);
}

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    runs: { type: 'string', default: '3' },
    config: { type: 'string', multiple: true },
    scenarios: { type: 'string' },
    agy: { type: 'string', default: 'agy' },
    timeout: { type: 'string', default: '10m' },
    out: { type: 'string', default: './bench-results' },
    'dry-run': { type: 'boolean', default: false },
    summarize: { type: 'string' },
    nonce: { type: 'string' },
  },
});

if (values.summarize) {
  const file = resolve(values.summarize);
  if (!existsSync(file)) fail(`fichier introuvable : ${file}`);
  const records = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as RunRecord);
  console.log(renderSummary(records, { project: '(voir runs.jsonl)', runs: Math.max(0, ...records.map((r) => r.rep)), generatedAt: new Date().toISOString() }));
  process.exit(0);
}

if (!values.project) fail('--project est obligatoire (dossier du projet portant le harnais à mesurer).');
const project = resolve(values.project);
if (!existsSync(project)) fail(`dossier introuvable : ${project}`);
if (!projectHasHarness(project)) fail(`aucun harnais trouvé dans ${project} (ni .agents/ ni AGENTS.md).`);

const runs = Number(values.runs);
if (!Number.isInteger(runs) || runs < 1 || runs > 20) fail('--runs doit être un entier entre 1 et 20.');

let configs: AgyConfig[];
try {
  configs = (values.config ?? []).length > 0 ? (values.config ?? []).map(parseConfig) : [{ label: 'défaut' }];
} catch (e) {
  fail((e as Error).message);
}

const nonce = values.nonce ?? randomNonce();
let scenarios = buildBenchScenarios(nonce);
if (values.scenarios) {
  const wanted = new Set(values.scenarios.split(',').map((s) => s.trim()).filter(Boolean));
  const unknown = [...wanted].filter((id) => !scenarios.some((s) => s.id === id));
  if (unknown.length > 0) fail(`scénario(s) inconnu(s) : ${unknown.join(', ')}. Disponibles : ${scenarios.map((s) => s.id).join(', ')}`);
  scenarios = scenarios.filter((s) => wanted.has(s.id));
}

const total = runs * scenarios.length * configs.length;
console.log(`Projet : ${project}`);
console.log(`Scénarios : ${scenarios.map((s) => s.id).join(', ')}`);
console.log(`Configurations : ${configs.map((c) => c.label).join(', ')}`);
console.log(`Exécutions prévues : ${total} appels à agy (chacun consomme votre quota).`);
if (values['dry-run']) {
  console.log('Mode --dry-run : rien n\'est lancé.');
  process.exit(0);
}

const agy = values.agy as string;
const printTimeout = values.timeout as string;

// Contrôle préalable : agy installé, connecté, réponse JSON exploitable
const probeDir = mkdtempSync(join(tmpdir(), 'bench-agy-probe-'));
let agyVersion: string | undefined;
try {
  try {
    agyVersion = execFileSync(agy, ['--version'], { encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n')[0];
  } catch {
    agyVersion = undefined;
  }
  const probe = await runAgy({ agy, prompt: 'Réponds par le seul mot OK.', cwd: probeDir, config: configs[0]!, printTimeout: '2m', killAfterMs: 180_000 });
  if (!probe.ok) {
    fail(
      `contrôle préalable en échec (statut ${probe.status}${probe.error ? `, ${probe.error}` : ''}). Vérifiez que « ${agy} » est installé, que vous vous êtes connecté une fois via une session « ${agy} » interactive, et que le modèle demandé existe (« ${agy} models »).${probe.stderrTail ? `\nDernières lignes de stderr :\n${probe.stderrTail}` : ''}`,
      2
    );
  }
} finally {
  rmSync(probeDir, { recursive: true, force: true });
}

const outDir = resolve(String(values.out), new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(outDir, { recursive: true });
const jsonl = join(outDir, 'runs.jsonl');
console.log(`Résultats : ${outDir}\n`);

const records = await executeBench({
  project,
  scenarios,
  configs,
  runs,
  agy,
  printTimeout,
  onRecord: (r, i, n) => {
    appendFileSync(jsonl, `${JSON.stringify({ ...r, result: { ...r.result, response: r.result.response.slice(0, 4_000) } })}\n`);
    console.log(`[${i}/${n}] ${r.scenarioId} (${r.config}, essai ${r.rep}) : ${r.verdict.pass ? 'OK' : 'ÉCHEC'} — ${r.verdict.detail}`);
  },
});

const summary = renderSummary(records, { agyVersion, project, runs, generatedAt: new Date().toISOString() });
writeFileSync(join(outDir, 'summary.md'), summary + '\n', 'utf8');
console.log(`\n${summary}`);
