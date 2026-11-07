import { NextRequest } from 'next/server';
import { desc } from 'drizzle-orm';
import { eccSyncs, getDb } from '@/db';
import { adminAction } from '@/lib/admin-route';
import { listCatalogSources } from '@/modules/ecc-catalog/source-registry';

/** État du catalogue : sources enregistrées, catalogue actif et historique des synchronisations. */
export async function GET(req: NextRequest) {
  return adminAction(
    req,
    async () => {
      const db = getDb();
      const sources = await listCatalogSources(db);
      const history = await db.select().from(eccSyncs).orderBy(desc(eccSyncs.syncedAt)).limit(10);
      return { sources, activeCatalog: history.find((s) => s.isActiveCatalog) ?? null, history };
    },
    { readOnly: true }
  );
}
