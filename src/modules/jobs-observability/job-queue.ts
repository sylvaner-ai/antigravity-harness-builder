import { eq, sql } from 'drizzle-orm';
import { AppDatabase, getDb, jobs } from '../../db';

export type JobType = 'DOCUMENT_EXTRACT' | 'PROFILE_ANALYZE' | 'ECC_SYNC' | 'HARNESS_GENERATE';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED';

export type JobRecord = typeof jobs.$inferSelect;

export interface EnqueueJobInput {
  type: JobType;
  projectId?: string;
  generationId?: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}

/**
 * Sanitise un message d'erreur pour s'assurer qu'aucun secret (clé API, token Bearer, mot de passe DB)
 * ni document confidentiel brut ne soit persisté dans les journaux techniques (§7 FR-10, §9 & §12).
 */
export function sanitizeErrorMessage(rawError: unknown): {
  code: string;
  message: string;
  occurredAt: string;
} {
  const rawMessage =
    rawError instanceof Error
      ? rawError.message
      : typeof rawError === 'string'
        ? rawError
        : 'Unknown processing error';

  const errorCode =
    rawError && typeof rawError === 'object' && 'code' in rawError && typeof rawError.code === 'string'
      ? rawError.code
      : 'JOB_EXECUTION_ERROR';

  // Masquage systématique des motifs de clés API, tokens et URLs de connexion avec mot de passe
  const redactedMessage = rawMessage
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gh[pousr]_[0-9A-Za-z]{20,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/Bearer\s+[0-9A-Za-z\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(postgresql:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED_PASSWORD]$2')
    .slice(0, 600);

  return {
    code: errorCode,
    message: redactedMessage,
    occurredAt: new Date().toISOString(),
  };
}

/**
 * File de tâches persistante adossée à PostgreSQL (ADR-03).
 * Prend en charge :
 * - Verrouillage transactionnel concurrent `SELECT ... FOR UPDATE SKIP LOCKED`
 * - Suivi d'état, progression et checkpoints intermédiaires par étape
 * - Tentatives bornées (`maxAttempts`) avec backoff exponentiel
 * - Récupération des jobs orphelins après redémarrage du conteneur (`recoverStaleRunningJobs`)
 */
export class PostgresJobQueue {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = getDb()) {
    this.db = db;
  }

  /**
   * Ajoute un nouveau job en file d'attente.
   */
  async enqueue(input: EnqueueJobInput): Promise<JobRecord> {
    const [created] = await this.db
      .insert(jobs)
      .values({
        type: input.type,
        projectId: input.projectId ?? null,
        generationId: input.generationId ?? null,
        payload: input.payload ?? {},
        maxAttempts: input.maxAttempts ?? 3,
        status: 'QUEUED',
        currentStep: 'QUEUED',
        progressPercent: 0,
      })
      .returning();

    if (!created) {
      throw new Error("Impossible d'insérer le job dans PostgreSQL.");
    }
    return created;
  }

  /**
   * Récupère un job par son identifiant.
   */
  async getJobById(jobId: string): Promise<JobRecord | null> {
    const [found] = await this.db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    return found ?? null;
  }

  /**
   * Réclame de manière atomique le prochain job éligible via `FOR UPDATE SKIP LOCKED`.
   */
  async claimNextJob(typesFilter?: readonly JobType[]): Promise<JobRecord | null> {
    const typeCondition =
      typesFilter && typesFilter.length > 0
        ? sql`AND type IN (${sql.join(
            typesFilter.map((t) => sql`${t}`),
            sql`, `
          )})`
        : sql``;

    const result = await this.db.execute(sql`
      UPDATE jobs
      SET
        status = 'RUNNING',
        attempts = attempts + 1,
        locked_at = NOW(),
        current_step = CASE WHEN current_step = 'QUEUED' THEN 'STARTED' ELSE current_step END
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'QUEUED'
          AND run_after <= NOW()
          AND attempts < max_attempts
          ${typeCondition}
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return this.getJobById(String(row.id));
  }

  /**
   * Enregistre un point de sauvegarde (checkpoint) et met à jour la progression du job (§15.3).
   */
  async saveCheckpoint(
    jobId: string,
    stepName: string,
    progressPercent: number,
    checkpointPatch?: Record<string, unknown>
  ): Promise<JobRecord> {
    const existing = await this.getJobById(jobId);
    if (!existing) {
      throw new Error(`Job introuvable : ${jobId}`);
    }

    const mergedCheckpoint = checkpointPatch
      ? { ...existing.checkpointData, ...checkpointPatch }
      : existing.checkpointData;

    const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));

    const [updated] = await this.db
      .update(jobs)
      .set({
        currentStep: stepName,
        progressPercent: clampedProgress,
        checkpointData: mergedCheckpoint,
        lockedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (!updated) {
      throw new Error(`Échec de mise à jour du checkpoint pour le job ${jobId}`);
    }
    return updated;
  }

  /**
   * Marque un job comme terminé avec succès.
   */
  async markCompleted(
    jobId: string,
    finalCheckpointPatch?: Record<string, unknown>
  ): Promise<JobRecord> {
    const existing = await this.getJobById(jobId);
    if (!existing) {
      throw new Error(`Job introuvable : ${jobId}`);
    }

    const mergedCheckpoint = finalCheckpointPatch
      ? { ...existing.checkpointData, ...finalCheckpointPatch }
      : existing.checkpointData;

    const [updated] = await this.db
      .update(jobs)
      .set({
        status: 'COMPLETED',
        currentStep: 'COMPLETED',
        progressPercent: 100,
        checkpointData: mergedCheckpoint,
        safeError: null,
        lockedAt: null,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (!updated) {
      throw new Error(`Impossible de marquer le job ${jobId} comme terminé.`);
    }
    return updated;
  }

  /**
   * Gère l'échec d'une exécution :
   * - Si `attempts < maxAttempts`, remet le job en état `QUEUED` avec un délai de backoff exponentiel
   *   tout en conservant `checkpointData` pour reprendre à l'étape échouée.
   * - Si `attempts >= maxAttempts`, marque définitivement le job comme `FAILED`.
   */
  async markFailedOrRetry(
    jobId: string,
    error: unknown,
    options?: { retryDelayMs?: number; forcePermanentFailure?: boolean }
  ): Promise<JobRecord> {
    const existing = await this.getJobById(jobId);
    if (!existing) {
      throw new Error(`Job introuvable : ${jobId}`);
    }

    const safeErr = sanitizeErrorMessage(error);
    const canRetry = !options?.forcePermanentFailure && existing.attempts < existing.maxAttempts;

    if (canRetry) {
      const delayMs =
        options?.retryDelayMs ?? Math.min(30_000, Math.pow(2, existing.attempts) * 1_000);
      const runAfter = new Date(Date.now() + delayMs);

      const [requeued] = await this.db
        .update(jobs)
        .set({
          status: 'QUEUED',
          safeError: safeErr,
          lockedAt: null,
          runAfter,
        })
        .where(eq(jobs.id, jobId))
        .returning();

      return requeued!;
    }

    const [failed] = await this.db
      .update(jobs)
      .set({
        status: 'FAILED',
        safeError: safeErr,
        lockedAt: null,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    return failed!;
  }

  /**
   * Récupère les jobs bloqués en état `RUNNING` après un crash ou redémarrage de conteneur
   * dont le `lockedAt` est plus ancien que `staleThresholdMs` (par défaut 5 minutes).
   */
  async recoverStaleRunningJobs(staleThresholdMs = 5 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - staleThresholdMs);

    const result = await this.db.execute(sql`
      UPDATE jobs
      SET
        status = CASE WHEN attempts < max_attempts THEN 'QUEUED'::text ELSE 'FAILED'::text END,
        locked_at = NULL,
        safe_error = jsonb_build_object(
          'code', 'STALE_JOB_RECOVERED',
          'message', 'Reprise automatique après interruption ou redémarrage du processus.',
          'occurredAt', NOW()::text
        )
      WHERE status = 'RUNNING'
        AND locked_at < ${cutoff}
      RETURNING id
    `);

    return result.rowCount ?? 0;
  }
}
