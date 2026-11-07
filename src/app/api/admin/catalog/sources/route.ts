import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { adminAction } from '@/lib/admin-route';
import { GitHubCatalogFetcher } from '@/modules/catalog/catalog-service';
import { addCatalogSource } from '@/modules/catalog/source-registry';

const NewSourceSchema = z
  .object({
    repository: z.string().trim().min(3).max(200),
    ref: z.string().trim().max(100).optional(),
    role: z.enum(['BASE_LIBRARY', 'SPECIALIST', 'METHODOLOGY']).optional(),
    priority: z.number().int().min(1).max(99).optional(),
    category: z.enum(['CORE', 'DESIGN', 'SECURITY', 'QUALITY']).optional(),
  })
  .strict();

/** Ajoute un dépôt GitHub (en attente) et l'analyse aussitôt sur le commit figé. */
export async function POST(req: NextRequest) {
  return adminAction(req, async () => {
    const input = NewSourceSchema.parse(await req.json());
    return { source: await addCatalogSource(getDb(), new GitHubCatalogFetcher(), input) };
  });
}
