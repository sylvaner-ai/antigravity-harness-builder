import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type AppDatabase = NodePgDatabase<typeof schema>;

let globalPool: Pool | null = null;
let globalDb: AppDatabase | null = null;

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    'postgresql://ahb_user:ahb_dev_password_2026@localhost:5433/ahb_db'
  );
}

export function getDbPool(): Pool {
  if (!globalPool) {
    globalPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalPool;
}

export function getDb(): AppDatabase {
  if (!globalDb) {
    globalDb = drizzle(getDbPool(), { schema });
  }
  return globalDb;
}

export async function closeDbPool(): Promise<void> {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
    globalDb = null;
  }
}

export * from './schema';
