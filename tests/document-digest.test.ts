import crypto from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDbPool, getDb, projects, sourceDocuments, users } from '../src/db';
import { ensureDocumentDigests } from '../src/modules/documents/document-digest';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

describe('Empreintes des documents avant génération', () => {
  const db = getDb();
  const email = `digest-${crypto.randomUUID()}@test.local`;

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await closeDbPool();
  });

  it('recalcule une empreinte factice depuis le fichier, à défaut depuis le texte, et la corrige en base', async () => {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
    const [project] = await db.insert(projects).values({ userId: user!.id, name: 'p' }).returning();
    const base = { projectId: project!.id, mimeType: 'text/markdown', sizeBytes: 1, extractionStatus: 'COMPLETED' as const };
    const docs = await db
      .insert(sourceDocuments)
      .values([
        { ...base, role: 'SPECIFICATION', originalName: 'cdc.md', safeStoragePath: 'p/cdc.md', sha256Hash: 'dummy-sha-spec' },
        { ...base, role: 'DESIGN_SYSTEM', originalName: 'DESIGN.md', safeStoragePath: 'p/absent.md', sha256Hash: 'dummy-sha-ds', extractedText: '# Design' },
        { ...base, role: 'SUPPLEMENTARY', originalName: 'ok.md', safeStoragePath: 'p/ok.md', sha256Hash: sha('ok') },
      ])
      .returning();
    const storage = {
      async readFile(p: string) {
        if (p === 'p/cdc.md') return new TextEncoder().encode('# Cahier');
        throw new Error('absent');
      },
    };

    const fixed = await ensureDocumentDigests(db, docs, storage);
    expect(fixed.map((d) => d.sha256Hash)).toEqual([sha('# Cahier'), sha('# Design'), sha('ok')]);
    const [stored] = await db.select().from(sourceDocuments).where(eq(sourceDocuments.id, docs[0]!.id));
    expect(stored!.sha256Hash).toBe(sha('# Cahier'));

    const [empty] = await db
      .insert(sourceDocuments)
      .values({ ...base, role: 'SUPPLEMENTARY', originalName: 'vide.pdf', safeStoragePath: 'p/vide.pdf', sha256Hash: 'dummy' })
      .returning();
    await expect(ensureDocumentDigests(db, [empty!], storage)).rejects.toThrow(/« vide.pdf » .*réimportez/);
  });
});
