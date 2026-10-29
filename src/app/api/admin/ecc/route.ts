import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, eccSyncs, eccComponents } from '@/db';
import { requireAuthUser } from '@/modules/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const db = getDb();

    const syncs = await db.select().from(eccSyncs).orderBy(desc(eccSyncs.syncedAt)).limit(10);
    const activeSync = syncs.find((s) => s.isActiveCatalog) ?? null;

    let totalActiveComponents = 0;
    if (activeSync) {
      const components = await db
        .select({ id: eccComponents.id })
        .from(eccComponents)
        .where(eq(eccComponents.eccSyncId, activeSync.id));
      totalActiveComponents = components.length;
    }

    return NextResponse.json({
      activeCatalog: activeSync,
      totalActiveComponents,
      history: syncs,
      userRole: user.role,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    const status = msg.includes('Authentification') || msg.includes('Session') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
