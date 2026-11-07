import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, projects, projectProfiles, harnessGenerations } from '../../../db';
import { requireAuthUser } from '../../../modules/auth';
import { parseAuditReportText } from '../../../modules/project-profile';
import { ingestAuditBundle } from '../../../modules/documents/audit-bundle';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const db = getDb();

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') as 'ACTIVE' | 'ARCHIVED' | null;
    const surfaceFilter = url.searchParams.get('surface') as 'APP' | 'IDE' | 'CLI' | null;

    const conditions = [eq(projects.userId, user.userId)];
    if (statusFilter) conditions.push(eq(projects.status, statusFilter));
    if (surfaceFilter) conditions.push(eq(projects.targetSurface, surfaceFilter));

    const list = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt));

    const listWithStatus = await Promise.all(
      list.map(async (p) => {
        const [prof] = await db
          .select({ id: projectProfiles.id })
          .from(projectProfiles)
          .where(eq(projectProfiles.projectId, p.id))
          .limit(1);

        const [gen] = await db
          .select({ id: harnessGenerations.id })
          .from(harnessGenerations)
          .where(eq(harnessGenerations.projectId, p.id))
          .limit(1);

        return {
          ...p,
          hasProfile: Boolean(prof),
          hasGeneration: Boolean(gen),
        };
      })
    );

    return NextResponse.json({ projects: listWithStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const db = getDb();
    const body = await req.json();

    const mode = (body.mode === 'UPGRADE' ? 'UPGRADE' : 'NEW') as 'NEW' | 'UPGRADE';

    // Flux 1 : Mode Mise à Niveau avec texte/JSON d'audit direct
    if (mode === 'UPGRADE' && (body.auditText || body.auditData)) {
      // Validation par le schéma dans les deux cas (texte collé ou objet JSON)
      const auditReport =
        body.auditData && typeof body.auditData === 'object'
          ? parseAuditReportText(JSON.stringify(body.auditData))
          : parseAuditReportText(String(body.auditText));

      const name = auditReport.projectName?.trim() || body.name?.trim() || 'Projet Audité';
      const description =
        auditReport.projectDescription?.trim() ||
        body.description?.trim() ||
        'Projet existant modernisé avec Google Antigravity.';
      const targetSurface = (['APP', 'IDE', 'CLI'].includes(auditReport.targetSurfaceRecommendation || body.targetSurface)
        ? (auditReport.targetSurfaceRecommendation || body.targetSurface)
        : 'IDE') as 'APP' | 'IDE' | 'CLI';

      const [created] = await db
        .insert(projects)
        .values({
          userId: user.userId,
          name,
          description,
          targetSurface,
          mode: 'UPGRADE',
          status: 'ACTIVE',
        })
        .returning();

      if (!created) {
        throw new Error('Impossible de créer le projet.');
      }

      const ingestion = await ingestAuditBundle({
        db,
        projectId: created.id,
        projectName: name,
        targetSurface,
        auditReport,
      });

      return NextResponse.json(
        {
          project: created,
          profile: ingestion.profile,
          importedDocuments: ingestion.importedDocuments,
          documentsWithoutContent: ingestion.documentsWithoutContent,
          hasSpecification: ingestion.hasSpecification,
        },
        { status: 201 }
      );
    }

    // Flux 2 : Création standard (Nouveau projet ou Mise à niveau sans audit initial)
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Le nom du projet est obligatoire.' }, { status: 400 });
    }

    const description = body.description?.trim() ?? '';
    const targetSurface = (['APP', 'IDE', 'CLI'].includes(body.targetSurface) ? body.targetSurface : 'IDE') as 'APP' | 'IDE' | 'CLI';

    const [created] = await db
      .insert(projects)
      .values({
        userId: user.userId,
        name,
        description,
        targetSurface,
        mode,
        status: 'ACTIVE',
      })
      .returning();

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la création.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
