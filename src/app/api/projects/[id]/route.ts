import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import {
  getDb,
  projects,
  sourceDocuments,
  projectProfiles,
  harnessGenerations,
  generatedArtifacts,
} from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(id, user.userId);

    const db = getDb();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    const docs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, id));
    const profiles = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, id))
      .orderBy(desc(projectProfiles.version));
    const gens = await db
      .select()
      .from(harnessGenerations)
      .where(eq(harnessGenerations.projectId, id))
      .orderBy(desc(harnessGenerations.createdAt));

    let latestArtifacts: Array<{ relativePath: string; content: string; sizeBytes: number; sha256Hash: string }> = [];
    if (gens[0]) {
      latestArtifacts = await db
        .select({
          relativePath: generatedArtifacts.relativePath,
          content: generatedArtifacts.content,
          sizeBytes: generatedArtifacts.sizeBytes,
          sha256Hash: generatedArtifacts.sha256Hash,
        })
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, gens[0].id));
    }

    return NextResponse.json({
      project,
      documents: docs,
      latestProfile: profiles[0] ?? null,
      generations: gens,
      artifacts: latestArtifacts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(id, user.userId);

    const db = getDb();
    const body = await req.json();

    const updateData: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.name) updateData.name = body.name.trim();
    if (typeof body.description === 'string') updateData.description = body.description.trim();
    if (['ACTIVE', 'ARCHIVED'].includes(body.status)) updateData.status = body.status;
    if (['APP', 'IDE', 'CLI'].includes(body.targetSurface)) updateData.targetSurface = body.targetSurface;

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json({ project: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(id, user.userId);

    const db = getDb();
    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
