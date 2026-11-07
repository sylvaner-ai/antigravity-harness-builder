import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { adminAction } from '@/lib/admin-route';
import { GitHubOfficialEccFetcher } from '@/modules/ecc-catalog/catalog-service';
import {
  analyzeCatalogSource,
  deleteCatalogSource,
  repinCatalogSource,
  setCatalogSourceStatus,
} from '@/modules/ecc-catalog/source-registry';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('analyze') }).strict(),
  z.object({ action: z.literal('activate') }).strict(),
  z.object({ action: z.literal('disable') }).strict(),
  z.object({ action: z.literal('repin'), ref: z.string().trim().min(1).max(100) }).strict(),
]);

/** Analyse, active, désactive ou fige sur un autre commit une source du catalogue. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminAction(req, async () => {
    const { id } = await params;
    const body = ActionSchema.parse(await req.json());
    const db = getDb();
    const fetcher = new GitHubOfficialEccFetcher();
    switch (body.action) {
      case 'analyze':
        return { source: await analyzeCatalogSource(db, fetcher, id) };
      case 'activate':
        return { source: await setCatalogSourceStatus(db, id, 'ACTIVE') };
      case 'disable':
        return { source: await setCatalogSourceStatus(db, id, 'DISABLED') };
      case 'repin':
        return { source: await repinCatalogSource(db, fetcher, id, body.ref) };
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminAction(req, async () => {
    const { id } = await params;
    await deleteCatalogSource(getDb(), id);
    return { deleted: id };
  });
}
