import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { adminAction } from '@/lib/admin-route';
import { CatalogService } from '@/modules/catalog/catalog-service';

/** Reconstruit le catalogue à partir des sources actives, chacune sur son commit figé. */
export async function POST(req: NextRequest) {
  return adminAction(req, async () => {
    const sync = await new CatalogService(getDb()).synchronizeCatalog({ forceResync: true, includeCuratedExcellence: true });
    return { syncId: sync.id, componentCount: sync.componentCount, sources: sync.sources };
  });
}
