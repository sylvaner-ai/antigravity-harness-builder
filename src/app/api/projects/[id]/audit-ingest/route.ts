import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, projects } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { parseAuditReportText, AntigravityAuditReportSchema } from '@/modules/project-profile';
import { ingestAuditBundle } from '@/modules/documents/audit-bundle';

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

    const ingestion = await ingestAuditBundle({
      db,
      projectId,
      projectName: auditReport.projectName || project.name,
      targetSurface: project.targetSurface,
      auditReport,
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
      profile: ingestion.profile,
      importedDocuments: ingestion.importedDocuments,
      documentsWithoutContent: ingestion.documentsWithoutContent,
      hasSpecification: ingestion.hasSpecification,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l ingestion de l audit.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
