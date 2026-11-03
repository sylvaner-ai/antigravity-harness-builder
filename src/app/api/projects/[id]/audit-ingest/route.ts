import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, projects, sourceDocuments } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import {
  parseAuditReportText,
  AntigravityAuditReportSchema,
  ProjectProfileService,
} from '@/modules/project-profile';
import { computeSha256 } from '@/modules/package-exporter/exporter';
import { MockLLMAdapter } from '@/modules/llm-gateway/mock-adapter';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const db = getDb();
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    const body = await req.json();
    let auditReport;

    if (body.auditData && typeof body.auditData === 'object') {
      const parsed = AntigravityAuditReportSchema.safeParse(body.auditData);
      if (!parsed.success) {
        const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return NextResponse.json({ error: `Rapport d'audit invalide (${errorDetails}).` }, { status: 400 });
      }
      auditReport = parsed.data;
    } else if (body.auditText && typeof body.auditText === 'string') {
      try {
        auditReport = parseAuditReportText(body.auditText);
      } catch (err: unknown) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Erreur de lecture du rapport d audit.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Veuillez fournir auditText ou auditData dans le corps de la requête.' },
        { status: 400 }
      );
    }

    const rawAuditString = JSON.stringify(auditReport, null, 2);
    const auditSha256 = computeSha256(rawAuditString);

    // 1. Sauvegarder le rapport d'audit comme document source
    const [doc] = await db
      .insert(sourceDocuments)
      .values({
        projectId,
        role: 'AUDIT_REPORT',
        originalName: 'antigravity-audit.json',
        safeStoragePath: `audits/${projectId}/antigravity-audit.json`,
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(rawAuditString, 'utf-8'),
        sha256Hash: auditSha256,
        extractionStatus: 'COMPLETED',
        extractedText: rawAuditString,
        extractionMeta: {
          method: 'antigravity-audit-scan',
        },
      })
      .returning();

    const documentId = doc?.id ?? 'audit-doc';

    // 2. Extraire et persister directement le profil de projet
    const profileService = new ProjectProfileService(db, new MockLLMAdapter());
    const profile = await profileService.ingestAuditReport({
      projectId,
      projectName: auditReport.projectName || project.name,
      targetSurface: project.targetSurface,
      auditReport,
      documentId,
    });

    // 3. Mettre à jour le projet si le nom ou description ont été extraits
    if (auditReport.projectName && project.name === 'Nouveau Projet') {
      await db
        .update(projects)
        .set({ name: auditReport.projectName, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    return NextResponse.json({
      success: true,
      document: doc,
      profile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l ingestion de l audit.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
