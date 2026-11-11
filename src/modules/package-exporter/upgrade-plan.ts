import crypto from 'node:crypto';

/**
 * Plan de mise à niveau calculé par l'application (parcours B).
 *
 * Il compare trois états, fichier par fichier, au moyen des empreintes SHA-256 :
 * - le nouveau harnais généré ;
 * - le harnais présent dans le projet, relevé par l'audit 2.0 ;
 * - le harnais posé par la génération précédente d'AHB (inventaire de son manifeste).
 *
 * Un fichier n'est modifié ou retiré que s'il est géré par AHB ET intact depuis la génération précédente ;
 * tout le reste appartient à l'équipe et est conservé. L'agent revérifie chaque empreinte avant d'agir.
 */

export type UpgradeAction =
  /** Absent du projet : à créer. */
  | 'CREATE'
  /** Hors de l'inventaire de l'audit (README, docs) : à créer seulement s'il n'existe pas. */
  | 'CREATE_IF_ABSENT'
  /** Géré par AHB, intact, contenu nouveau : à remplacer après sauvegarde. */
  | 'UPDATE'
  /** Déjà identique au nouveau contenu. */
  | 'UNCHANGED'
  /** Existe déjà mais modifié ou rédigé par l'équipe : conservé, différence présentée à l'utilisateur. */
  | 'CONFLICT'
  /** AGENTS.md : fusion entre les balises délimitées. */
  | 'MERGE'
  /** Posé par la génération précédente, intact, absent du nouveau harnais : à retirer après sauvegarde. */
  | 'REMOVE'
  /** Fichier de l'équipe, ou ancien fichier AHB modifié depuis : conservé tel quel. */
  | 'KEEP'
  /** Règle permanente de l'équipe qui traite du même sujet qu'une règle gérée : conservée, mais à arbitrer avec l'utilisateur. */
  | 'OVERLAP';

export interface UpgradePlanEntry {
  path: string;
  action: UpgradeAction;
  /** Empreinte attendue sur le disque avant d'agir (UPDATE, REMOVE). */
  expectedSha256?: string;
  reason: string;
}

export interface UpgradePlanInput {
  newFiles: ReadonlyArray<{ relativePath: string; content: string }>;
  /** Fichiers du harnais existant relevés par l'audit (vide pour un audit 1.0). */
  existingFiles: ReadonlyArray<{ path: string; sha256?: string; kind?: string; trigger?: string; description?: string }>;
  /** Inventaire de la génération AHB précédente, s'il existe. */
  previousFiles?: ReadonlyArray<{ path: string; sha256: string }>;
}

const MANIFEST_PATH = 'docs/HARNESS_MANIFEST.json';
const ROOT_INSTRUCTIONS = 'AGENTS.md';

const sha256 = (content: string) => crypto.createHash('sha256').update(content).digest('hex');

/** L'audit 2.0 inventorie tout `.agents/` et les fichiers d'instructions : l'absence d'un tel chemin y est significative. */
function isInventoriedByAudit(path: string): boolean {
  return path.startsWith('.agents/') || path === ROOT_INSTRUCTIONS;
}

const ORDER: Record<UpgradeAction, number> = {
  CONFLICT: 0,
  OVERLAP: 1,
  REMOVE: 2,
  UPDATE: 3,
  MERGE: 4,
  CREATE: 5,
  CREATE_IF_ABSENT: 6,
  KEEP: 7,
  UNCHANGED: 8,
};

/** Règle gérée par AHB dont le sujet (choix du modèle et de l'effort) est souvent déjà traité par une règle de l'équipe. */
const MODEL_EFFORT_RULE = '.agents/rules/model-effort-governance.md';
const MODEL_EFFORT_SUBJECT = /model[-_ ]?(routing|effort|selection|calibration)|mod[èe]le.{0,40}effort|effort.{0,40}mod[èe]le|model.{0,40}effort|effort.{0,40}model/i;

/**
 * Une règle de l'équipe, toujours active, portant sur le choix du modèle ou de l'effort, coexiste avec la règle gérée
 * `model-effort-governance.md` : deux consignes permanentes contradictoires rendent le comportement de l'agent imprévisible.
 */
function overlapsModelEffortGovernance(file: { path: string; kind?: string; trigger?: string; description?: string }): boolean {
  const isRule = file.kind === 'rule' || (file.kind === undefined && file.path.startsWith('.agents/rules/'));
  if (!isRule || file.path === MODEL_EFFORT_RULE) return false;
  if (file.trigger !== 'always_on') return false;
  return MODEL_EFFORT_SUBJECT.test(`${file.path} ${file.description ?? ''}`);
}

/** Calcule le plan ; renvoie `undefined` quand l'audit n'a pas d'inventaire (audit 1.0) : l'agent applique alors le protocole général. */
export function computeUpgradePlan(input: UpgradePlanInput): UpgradePlanEntry[] | undefined {
  if (input.existingFiles.length === 0) return undefined;

  const existing = new Map(input.existingFiles.map((f) => [f.path, f.sha256?.toLowerCase()]));
  const existingDetails = new Map(input.existingFiles.map((f) => [f.path, f]));
  const managesModelEffort = input.newFiles.some((f) => f.relativePath === MODEL_EFFORT_RULE);
  const previous = new Map((input.previousFiles ?? []).map((f) => [f.path, f.sha256.toLowerCase()]));
  const plan: UpgradePlanEntry[] = [];
  const newPaths = new Set<string>();

  for (const file of input.newFiles) {
    const path = file.relativePath;
    newPaths.add(path);
    const target = sha256(file.content);
    const current = existing.get(path);
    const prior = previous.get(path);

    if (path === ROOT_INSTRUCTIONS) {
      plan.push({ path, action: existing.has(path) ? 'MERGE' : 'CREATE', reason: existing.has(path) ? 'Consignes de l’équipe conservées hors des balises gérées.' : 'Absent du projet.' });
    } else if (path === MANIFEST_PATH) {
      plan.push({ path, action: 'UPDATE', reason: 'Manifeste de la génération, toujours remplacé.' });
    } else if (current !== undefined) {
      if (current === target) {
        plan.push({ path, action: 'UNCHANGED', reason: 'Déjà identique.' });
      } else if (prior !== undefined && prior === current) {
        plan.push({ path, action: 'UPDATE', expectedSha256: current, reason: 'Géré par AHB et intact depuis la génération précédente.' });
      } else {
        plan.push({
          path,
          action: 'CONFLICT',
          reason: prior !== undefined ? 'Modifié par l’équipe depuis la génération précédente.' : 'Fichier de l’équipe portant le même nom.',
        });
      }
    } else if (existing.has(path)) {
      // Présent sans empreinte : impossible de prouver qu'il est intact.
      plan.push({ path, action: 'CONFLICT', reason: 'Présent, mais sans empreinte dans l’audit.' });
    } else if (isInventoriedByAudit(path)) {
      plan.push({ path, action: 'CREATE', reason: 'Absent du projet.' });
    } else if (prior !== undefined) {
      // Hors inventaire mais posé par la génération précédente : l'agent vérifie l'empreinte avant de remplacer.
      plan.push({ path, action: 'UPDATE', expectedSha256: prior, reason: 'Posé par la génération précédente (à remplacer seulement s’il est intact).' });
    } else {
      plan.push({ path, action: 'CREATE_IF_ABSENT', reason: 'Hors de l’inventaire de l’audit : ne pas écraser un fichier existant.' });
    }
  }

  const leftovers = new Set([...existing.keys(), ...previous.keys()]);
  for (const path of leftovers) {
    if (newPaths.has(path)) continue;
    const current = existing.get(path);
    const prior = previous.get(path);
    const details = existingDetails.get(path);
    if (prior === undefined && managesModelEffort && details && overlapsModelEffortGovernance(details)) {
      plan.push({
        path,
        action: 'OVERLAP',
        reason: 'Règle permanente de l’équipe sur le choix du modèle ou de l’effort, qui chevauche `model-effort-governance.md` : les deux consignes peuvent se contredire.',
      });
    } else if (prior === undefined) {
      plan.push({ path, action: 'KEEP', reason: 'Fichier de l’équipe.' });
    } else if (current !== undefined && current === prior) {
      plan.push({ path, action: 'REMOVE', expectedSha256: prior, reason: 'Posé par la génération précédente, intact, absent du nouveau harnais.' });
    } else if (current === undefined && !existing.has(path) && !isInventoriedByAudit(path)) {
      // Fichier hors inventaire (docs/…) : l'agent ne le retire que si son empreinte est encore celle d'origine.
      plan.push({ path, action: 'REMOVE', expectedSha256: prior, reason: 'Posé par la génération précédente, absent du nouveau harnais (à retirer seulement s’il est intact).' });
    } else if (current === undefined && !existing.has(path)) {
      // Déjà supprimé par l'équipe.
      continue;
    } else {
      plan.push({ path, action: 'KEEP', reason: 'Ancien fichier AHB modifié par l’équipe : conservé, n’est plus géré.' });
    }
  }

  return plan.sort((a, b) => ORDER[a.action] - ORDER[b.action] || a.path.localeCompare(b.path));
}

const LABELS: Record<UpgradeAction, string> = {
  CONFLICT: 'CONFLIT — conserver, présenter la différence, demander',
  OVERLAP: 'CHEVAUCHEMENT — conserver, comparer avec la règle gérée, proposer l’archivage, demander',
  REMOVE: 'RETIRER — sauvegarder puis supprimer',
  UPDATE: 'METTRE À JOUR — sauvegarder puis remplacer',
  MERGE: 'FUSIONNER — entre les balises gérées',
  CREATE: 'CRÉER',
  CREATE_IF_ABSENT: 'CRÉER SI ABSENT — sinon conserver et signaler',
  KEEP: 'CONSERVER — ne pas toucher',
  UNCHANGED: 'INCHANGÉ — rien à faire',
};

/** Section Markdown du plan, insérée dans le prompt de mise à niveau. */
export function renderUpgradePlanMarkdown(plan: readonly UpgradePlanEntry[]): string {
  const counts = plan.reduce<Partial<Record<UpgradeAction, number>>>((acc, e) => ({ ...acc, [e.action]: (acc[e.action] ?? 0) + 1 }), {});
  const summary = (Object.keys(ORDER) as UpgradeAction[])
    .filter((a) => counts[a])
    .map((a) => `${LABELS[a].split(' — ')[0]} : ${counts[a]}`)
    .join(' · ');
  const rows = plan
    .map((e) => `| ${LABELS[e.action]} | \`${e.path}\` | ${e.expectedSha256 ? `\`${e.expectedSha256.slice(0, 12)}…\`` : '—'} | ${e.reason} |`)
    .join('\n');
  const checks = plan
    .filter((e) => e.expectedSha256)
    .map((e) => `- \`${e.path}\` : \`${e.expectedSha256}\``)
    .join('\n');

  return `## Plan de mise à niveau calculé par Antigravity Harness Builder

Ce plan est établi à partir de l'audit du projet et du manifeste de la génération précédente. **Applique-le tel quel**, à la place de ta propre analyse : il ne touche qu'aux fichiers posés par Antigravity Harness Builder et restés intacts.

${summary}

| Action | Fichier | Empreinte attendue | Motif |
| --- | --- | --- | --- |
${rows}

**Vérification obligatoire avant chaque mise à jour ou retrait** : calcule \`sha256sum <fichier>\`. Si l'empreinte diffère de celle ci-dessous, ou si le fichier n'existe pas, ne le touche pas et traite-le comme un CONFLIT.
${checks || '- (aucune)'}
`;
}
