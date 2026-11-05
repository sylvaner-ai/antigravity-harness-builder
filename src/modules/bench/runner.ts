import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { BenchScenario, Verdict } from './scenarios';

/**
 * Exécution des scénarios avec `agy -p` (mode non interactif) et mise en forme des résultats.
 * Options utilisées, toutes documentées sur https://antigravity.google/docs/cli/headless/ et /cli/reference/ :
 * `-p`, `--output-format json`, `--print-timeout`, `--model`, `--effort`. Aucune option n'est déduite.
 */

export interface AgyConfig {
  label: string;
  model?: string;
  effort?: string;
}

export interface AgyResult {
  ok: boolean;
  status: string;
  response: string;
  error?: string;
  exitCode: number | null;
  durationSeconds?: number;
  numTurns?: number;
  usage?: unknown;
  conversationId?: string;
  wallSeconds: number;
  stderrTail: string;
}

export interface RunRecord {
  scenarioId: string;
  group: string;
  config: string;
  rep: number;
  verdict: Verdict;
  result: AgyResult;
  filesChanged: string[];
}

/** Erreurs du service (et non du harnais) : indisponibilité, quota, délai dépassé. */
const SERVICE_ERROR = /UNAVAILABLE|RESOURCE_EXHAUSTED|quota|code 429|code 503|DEADLINE_EXCEEDED|interrompu par le banc/i;

const IGNORED_TOP_DIRS = new Set(['.git', '.gemini', 'node_modules', '.next']);

/** Copie le projet sans dépendances ni historique, pour que `agy` ne touche jamais l'original. */
export function copyProject(source: string, destination: string): void {
  cpSync(source, destination, {
    recursive: true,
    filter: (src) => {
      const rel = relative(source, src);
      return !rel.split('/').some((part) => IGNORED_TOP_DIRS.has(part));
    },
  });
}

/** Empreinte (taille et date) de chaque fichier, pour détecter les modifications. */
export function snapshotFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (IGNORED_TOP_DIRS.has(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const st = statSync(full);
        out.set(relative(dir, full), `${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(dir);
  return out;
}

export function changedFiles(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed: string[] = [];
  for (const [path, sig] of after) if (before.get(path) !== sig) changed.push(path);
  for (const path of before.keys()) if (!after.has(path)) changed.push(path);
  return changed.sort();
}

/** Extrait l'enveloppe JSON de la sortie standard (la dernière ligne qui commence par « { » en secours). */
export function parseEnvelope(stdout: string): Record<string, unknown> | null {
  const text = stdout.trim();
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s) as unknown;
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  return tryParse(text) ?? [...text.split('\n')].reverse().map((l) => l.trim()).filter((l) => l.startsWith('{')).map(tryParse).find(Boolean) ?? null;
}

export function runAgy(options: {
  agy: string;
  prompt: string;
  cwd: string;
  config: AgyConfig;
  printTimeout: string;
  killAfterMs: number;
}): Promise<AgyResult> {
  const { agy, prompt, cwd, config, printTimeout, killAfterMs } = options;
  const args = ['-p', prompt, '--output-format', 'json', '--print-timeout', printTimeout];
  if (config.model) args.push('--model', config.model);
  if (config.effort) args.push('--effort', config.effort);

  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(agy, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const finish = (exitCode: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const wallSeconds = (Date.now() - started) / 1000;
      const env = parseEnvelope(stdout);
      const status = typeof env?.status === 'string' ? env.status : spawnError ? 'SPAWN_ERROR' : env ? 'UNKNOWN' : 'NO_JSON';
      resolve({
        ok: status === 'SUCCESS' && exitCode === 0,
        status,
        response: typeof env?.response === 'string' ? env.response : env ? '' : stdout.slice(0, 2_000),
        error: spawnError ?? (typeof env?.error === 'string' ? env.error : undefined),
        exitCode,
        durationSeconds: typeof env?.duration_seconds === 'number' ? env.duration_seconds : undefined,
        numTurns: typeof env?.num_turns === 'number' ? env.num_turns : undefined,
        usage: env?.usage,
        conversationId: typeof env?.conversation_id === 'string' ? env.conversation_id : undefined,
        wallSeconds,
        stderrTail: stderr.slice(-600),
      });
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(null, `interrompu par le banc d'essai après ${Math.round(killAfterMs / 1000)} s`);
    }, killAfterMs);
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', (e) => finish(null, e.message));
    child.on('close', (code) => finish(code));
  });
}

/** Convertit « 10m », « 90s », « 2h » en millisecondes (formats vus dans la documentation). */
export function durationToMs(value: string): number {
  const m = /^(\d+)(s|m|h)$/.exec(value.trim());
  if (!m) throw new Error(`Durée invalide « ${value} » : utilisez par exemple 90s, 10m ou 1h.`);
  return Number(m[1]) * { s: 1_000, m: 60_000, h: 3_600_000 }[m[2] as 's' | 'm' | 'h'];
}

export function parseConfig(spec: string): AgyConfig {
  const [model, effort, ...rest] = spec.split(':');
  if (rest.length > 0 || !model) throw new Error(`Configuration invalide « ${spec} » : utilisez modèle ou modèle:effort.`);
  return { label: spec, model, ...(effort ? { effort } : {}) };
}

export interface BenchOptions {
  project: string;
  scenarios: BenchScenario[];
  configs: AgyConfig[];
  runs: number;
  agy: string;
  printTimeout: string;
  onRecord?: (record: RunRecord, index: number, total: number) => void;
}

/** Exécute le banc d'essai. Ordre entrelacé (répétition, scénario, configuration) pour limiter les dérives. */
export async function executeBench(options: BenchOptions): Promise<RunRecord[]> {
  const { project, scenarios, configs, runs, agy, printTimeout, onRecord } = options;
  const killAfterMs = durationToMs(printTimeout) + 60_000;
  const plan: Array<{ scenario: BenchScenario; config: AgyConfig; rep: number }> = [];
  for (let rep = 1; rep <= runs; rep++) for (const scenario of scenarios) for (const config of configs) plan.push({ scenario, config, rep });

  const records: RunRecord[] = [];
  for (const [i, step] of plan.entries()) {
    const dir = mkdtempSync(join(tmpdir(), 'bench-agy-'));
    try {
      copyProject(project, dir);
      step.scenario.prepare(dir);
      const before = snapshotFiles(dir);
      const result = await runAgy({ agy, prompt: step.scenario.prompt, cwd: dir, config: step.config, printTimeout, killAfterMs });
      const filesChanged = changedFiles(before, snapshotFiles(dir));
      const verdict: Verdict = result.ok
        ? step.scenario.evaluate({ dir, response: result.response, status: result.status, filesChanged })
        : {
            pass: false,
            inconclusive: SERVICE_ERROR.test(`${result.error ?? ''} ${result.status}`),
            detail: `${SERVICE_ERROR.test(`${result.error ?? ''} ${result.status}`) ? 'indéterminé, erreur du service' : 'exécution en échec'} (${result.status}${result.error ? `: ${result.error}` : ''})`,
          };
      const record: RunRecord = { scenarioId: step.scenario.id, group: step.scenario.group, config: step.config.label, rep: step.rep, verdict, result, filesChanged };
      records.push(record);
      onRecord?.(record, i + 1, plan.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return records;
}

function flattenNumbers(value: unknown, prefix = '', out: Record<string, number> = {}): Record<string, number> {
  if (typeof value === 'number' && Number.isFinite(value)) out[prefix || 'valeur'] = value;
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value as Record<string, unknown>)) flattenNumbers(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const mean = (xs: number[]) => (xs.length === 0 ? undefined : xs.reduce((a, b) => a + b, 0) / xs.length);
const fmt = (n: number | undefined, digits = 1) => (n === undefined ? '—' : n.toFixed(digits));

/** Tableau récapitulatif : taux de réussite, durée et consommation moyennes par scénario et par configuration. */
export function renderSummary(records: readonly RunRecord[], meta: { agyVersion?: string; project: string; runs: number; generatedAt: string }): string {
  const configs = [...new Set(records.map((r) => r.config))];
  const scenarioIds = [...new Set(records.map((r) => r.scenarioId))];
  const lines: string[] = [
    '# Résultats du banc d\'essai Antigravity',
    '',
    `Date : ${meta.generatedAt} | Version agy : ${meta.agyVersion ?? 'non relevée'} | Projet : ${meta.project} | Répétitions : ${meta.runs}`,
    '',
    'Les critères de gouvernance (G1, G2) sont des heuristiques ; lisez les réponses dans `runs.jsonl` avant de conclure. Avec peu de répétitions, un taux n\'est qu\'un indice.',
    '',
  ];
  for (const config of configs) {
    lines.push(`## Configuration : ${config === 'défaut' ? 'réglage par défaut de la CLI' : config}`, '', '| Scénario | Réussites | Durée moy. (s) | Tours moy. | Consommation moyenne (champs numériques de `usage`) |', '| :--- | :--- | :--- | :--- | :--- |');
    for (const id of scenarioIds) {
      const rs = records.filter((r) => r.scenarioId === id && r.config === config);
      if (rs.length === 0) continue;
      const conclusive = rs.filter((r) => !r.verdict.inconclusive);
      const passes = conclusive.filter((r) => r.verdict.pass).length;
      const undetermined = rs.length - conclusive.length;
      const usageSums = new Map<string, number[]>();
      for (const r of rs) for (const [k, v] of Object.entries(flattenNumbers(r.result.usage))) usageSums.set(k, [...(usageSums.get(k) ?? []), v]);
      const usage = [...usageSums.entries()].map(([k, v]) => `${k}=${fmt(mean(v), 0)}`).join(', ') || '—';
      lines.push(`| ${id} | ${passes}/${conclusive.length}${undetermined > 0 ? ` (+${undetermined} indéterminé)` : ''} | ${fmt(mean(rs.map((r) => r.result.durationSeconds ?? r.result.wallSeconds)))} | ${fmt(mean(rs.flatMap((r) => (r.result.numTurns === undefined ? [] : [r.result.numTurns]))))} | ${usage} |`);
    }
    lines.push('');
  }
  const failed = records.filter((r) => !r.verdict.pass && !r.verdict.inconclusive);
  if (failed.length > 0) {
    lines.push('## Détail des échecs', '');
    for (const r of failed) lines.push(`- ${r.scenarioId} (${r.config}, essai ${r.rep}) : ${r.verdict.detail}`);
    lines.push('');
  }
  const undeterminedRuns = records.filter((r) => r.verdict.inconclusive);
  if (undeterminedRuns.length > 0) {
    lines.push('## Essais indéterminés (erreur du service, exclus des taux)', '');
    for (const r of undeterminedRuns) lines.push(`- ${r.scenarioId} (${r.config}, essai ${r.rep}) : ${r.verdict.detail}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function projectHasHarness(project: string): boolean {
  return existsSync(join(project, '.agents')) || existsSync(join(project, 'AGENTS.md'));
}
