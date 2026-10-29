import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, eccSyncs } from '../../../db';

export async function GET() {
  const startTime = Date.now();
  let dbOk = false;
  let activeCatalogInfo = null;

  try {
    const db = getDb();
    // Test PostgreSQL ping
    await db.execute(sql`SELECT 1`);
    dbOk = true;

    // Récupération de l'état du catalogue ECC actif
    const activeSyncs = await db.select().from(eccSyncs).where(sql`is_active_catalog = true`).limit(1);
    const active = activeSyncs[0];
    if (active) {
      activeCatalogInfo = {
        commitSha: active.commitSha,
        versionTag: active.versionTag,
        componentCount: active.componentCount,
        syncedAt: active.syncedAt,
      };
    }
  } catch (err: unknown) {
    dbOk = false;
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      status: dbOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      checks: {
        database: dbOk ? 'connected' : 'error',
        eccCatalog: activeCatalogInfo ? 'synced' : 'pending_or_none',
      },
      activeCatalog: activeCatalogInfo,
      uptimeSeconds: process.uptime(),
    },
    { status }
  );
}
