import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getDb, projects, projectProfiles, harnessGenerations, sourceDocuments } from '../../../db';
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

    const ids = list.map((p) => p.id);
    const profileIds = new Set<string>();
    const lastGeneration = new Map<string, Date>();
    const documentCount = new Map<string, number>();
    if (ids.length > 0) {
      const profs = await db
        .select({ projectId: projectProfiles.projectId })
        .from(projectProfiles)
        .where(inArray(projectProfiles.projectId, ids));
      for (const r of profs) profileIds.add(r.projectId);

      const gens = await db
        .select({ projectId: harnessGenerations.projectId, last: sql<Date>`max(${harnessGenerations.createdAt})` })
        .from(harnessGenerations)
        .where(inArray(harnessGenerations.projectId, ids))
        .groupBy(harnessGenerations.projectId);
      for (const r of gens) lastGeneration.set(r.projectId, new Date(r.last));

      // Documents fonctionnels importés (le rapport d'audit n'est pas compté : il se voit par le mode du projet)
      const docs = await db
        .select({ projectId: sourceDocuments.projectId, n: sql<number>`count(*)::int` })
        .from(sourceDocuments)
        .where(and(inArray(sourceDocuments.projectId, ids), sql`${sourceDocuments.role} <> 'AUDIT_REPORT'`))
        .groupBy(sourceDocuments.projectId);
      for (const r of docs) documentCount.set(r.projectId, r.n);
    }

    const listWithStatus = list.map((p) => ({
      ...p,
      hasProfile: profileIds.has(p.id),
      hasGeneration: lastGeneration.has(p.id),
      lastGeneratedAt: lastGeneration.get(p.id)?.toISOString() ?? null,
      documentCount: documentCount.get(p.id) ?? 0,
    }));

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
