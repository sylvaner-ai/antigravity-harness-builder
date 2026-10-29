import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { requireAuthUser } from '@/modules/auth';
import { EccCatalogService } from '@/modules/ecc-catalog/catalog-service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    const db = getDb();
    const service = new EccCatalogService(db);
    const syncRecord = await service.synchronizeCatalog();

    return NextResponse.json({
      success: true,
      syncId: syncRecord.id,
      commitSha: syncRecord.commitSha,
      componentCount: syncRecord.componentCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de synchronisation.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
