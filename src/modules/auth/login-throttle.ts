/**
 * Limiteur de tentatives de connexion en mémoire (instance unique).
 * Bloque une adresse e-mail après 5 échecs, et une adresse IP après 20 échecs,
 * pendant 15 minutes.
 */
export interface ThrottleOptions {
  maxFailuresPerEmail?: number;
  maxFailuresPerIp?: number;
  windowMs?: number;
  now?: () => number;
}

interface Entry {
  failures: number[];
}

export class LoginThrottle {
  private readonly maxEmail: number;
  private readonly maxIp: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly byEmail = new Map<string, Entry>();
  private readonly byIp = new Map<string, Entry>();

  constructor(options: ThrottleOptions = {}) {
    this.maxEmail = options.maxFailuresPerEmail ?? 5;
    this.maxIp = options.maxFailuresPerIp ?? 20;
    this.windowMs = options.windowMs ?? 15 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  private recent(map: Map<string, Entry>, key: string): number[] {
    const limit = this.now() - this.windowMs;
    const entry = map.get(key);
    if (!entry) return [];
    entry.failures = entry.failures.filter((t) => t > limit);
    if (entry.failures.length === 0) map.delete(key);
    return entry.failures;
  }

  /** Secondes à attendre avant une nouvelle tentative, ou 0 si la connexion est autorisée. */
  retryAfterSeconds(email: string, ip: string): number {
    const checks: Array<[number[], number]> = [
      [this.recent(this.byEmail, email.trim().toLowerCase()), this.maxEmail],
      [this.recent(this.byIp, ip), this.maxIp],
    ];
    let wait = 0;
    for (const [failures, max] of checks) {
      if (failures.length >= max) {
        const first = failures[failures.length - max]!;
        wait = Math.max(wait, Math.ceil((first + this.windowMs - this.now()) / 1000));
      }
    }
    return Math.max(wait, 0);
  }

  recordFailure(email: string, ip: string): void {
    const t = this.now();
    for (const [map, key] of [
      [this.byEmail, email.trim().toLowerCase()],
      [this.byIp, ip],
    ] as const) {
      const entry = map.get(key) ?? { failures: [] };
      entry.failures.push(t);
      map.set(key, entry);
    }
    if (this.byEmail.size > 5000) this.purge(this.byEmail);
    if (this.byIp.size > 5000) this.purge(this.byIp);
  }

  recordSuccess(email: string): void {
    this.byEmail.delete(email.trim().toLowerCase());
  }

  private purge(map: Map<string, Entry>): void {
    for (const key of [...map.keys()]) this.recent(map, key);
  }
}

export const loginThrottle = new LoginThrottle();

/** Adresse IP du client : dernière entrée de X-Forwarded-For (ajoutée par le proxy de confiance). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return headers.get('x-real-ip') ?? 'inconnue';
}
