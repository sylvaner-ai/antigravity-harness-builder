import crypto from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDbPool, getDb, projects, sourceDocuments, users } from '../src/db';
import { ingestAuditBundle } from '../src/modules/documents/audit-bundle';
import { LocalDiskStorage } from '../src/modules/documents/storage';
import { parseAuditReportText } from '../src/modules/project-profile';

describe('Export d’audit complet (audit 2.1) — import en une seule opération', () => {
  const db = getDb();
  const storageDir = mkdtempSync(join(tmpdir(), 'ahb-audit-bundle-'));
  const email = `audit-bundle-${crypto.randomUUID()}@test.local`;

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    rmSync(storageDir, { recursive: true, force: true });
    await closeDbPool();
  });

  it('importe le cahier des charges et le design system joints, et conserve l’audit sans leurs contenus', async () => {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
    const [project] = await db
      .insert(projects)
      .values({ userId: user!.id, name: 'felicicar', mode: 'UPGRADE' })
      .returning();

    const spec = '# Cahier des charges\n\nLes contrats de location sont signés électroniquement.';
    const design = '# DESIGN\n\nCouleur primaire : #0F766E';
    const auditReport = parseAuditReportText(
      JSON.stringify({
        auditVersion: '2.1.0',
        projectName: 'felicicar',
        techStack: { languages: ['TypeScript'], frameworks: ['Next.js'] },
        functionalDocuments: [
          { path: 'docs/cahier-des-charges.md', role: 'SPECIFICATION', content: spec },
          { path: 'DESIGN.md', role: 'DESIGN_SYSTEM', content: design },
          { path: 'docs/annexe.pdf', sizeBytes: 12000 },
        ],
      })
    );

    const result = await ingestAuditBundle({
      db,
      projectId: project!.id,
      projectName: 'felicicar',
      targetSurface: 'IDE',
      auditReport,
      storage: new LocalDiskStorage(storageDir),
    });

    expect(result.hasSpecification).toBe(true);
    expect(result.importedDocuments.map((d) => d.role).sort()).toEqual(['DESIGN_SYSTEM', 'SPECIFICATION']);
    expect(result.documentsWithoutContent).toEqual(['docs/annexe.pdf']);

    const docs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, project!.id));
    const specDoc = docs.find((d) => d.role === 'SPECIFICATION');
    expect(specDoc?.extractedText).toBe(spec);
    expect(specDoc?.sha256Hash).toBe(crypto.createHash('sha256').update(spec).digest('hex'));
    expect(specDoc?.sha256Hash).toMatch(/^[0-9a-f]{64}$/);

    const auditDoc = docs.find((d) => d.role === 'AUDIT_REPORT');
    expect(auditDoc?.extractedText).not.toContain('signés électroniquement');
    // L'audit stocké reste lisible (plan de mise à niveau, fusion du profil)
    expect(parseAuditReportText(auditDoc!.extractedText!).functionalDocuments).toHaveLength(3);
  });
});
