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

  } catch {
    dbOk = false;
  }

  // Information seulement : l'état du catalogue ne rend jamais l'application « malade ».
  // Colonnes explicites, pour ne pas dépendre d'une colonne ajoutée par une migration récente.
  if (dbOk) {
    try {
      const [active] = await getDb()
        .select({
          commitSha: eccSyncs.commitSha,
          versionTag: eccSyncs.versionTag,
          componentCount: eccSyncs.componentCount,
          syncedAt: eccSyncs.syncedAt,
        })
        .from(eccSyncs)
        .where(sql`is_active_catalog = true`)
        .limit(1);
      if (active) activeCatalogInfo = active;
    } catch {
      activeCatalogInfo = null;
    }
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
