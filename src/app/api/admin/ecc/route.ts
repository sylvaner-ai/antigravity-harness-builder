import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, eccSyncs, eccComponents } from '@/db';
import { requireAuthUser } from '@/modules/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    // Réservé aux administrateurs si role !== ADMIN on peut restreindre ou autoriser la lecture
    const db = getDb();

    const syncs = await db.select().from(eccSyncs).orderBy(desc(eccSyncs.syncedAt)).limit(10);
    const activeSync = syncs.find((s) => s.isActiveCatalog) ?? null;

    let totalActiveComponents = 0;
    if (activeSync) {
      const components = await db.select().from(eccComponents).where(desc(eccComponents.createdAt));
      totalActiveComponents = components.filter((c) => c.eccSyncId === activeSync.id).length;
    }

    return NextResponse.json({
      activeCatalog: activeSync,
      totalActiveComponents,
      history: syncs,
      userRole: user.role,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
