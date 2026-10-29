import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, projects, sourceDocuments, projectProfiles } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(id, user.userId);

    const db = getDb();
    const [original] = await db.select().from(projects).where(eq(projects.id, id));
    if (!original) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    // Création du projet dupliqué
    const [duplicated] = await db
      .insert(projects)
      .values({
        userId: user.userId,
        name: `${original.name} (Copie)`,
        description: original.description,
        targetSurface: original.targetSurface,
        status: 'ACTIVE',
      })
      .returning();

    if (!duplicated) {
      throw new Error('Échec de la duplication du projet.');
    }

    // Duplication des documents sources
    const originalDocs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, id));
    for (const doc of originalDocs) {
      await db.insert(sourceDocuments).values({
        projectId: duplicated.id,
        role: doc.role,
        originalName: doc.originalName,
        safeStoragePath: doc.safeStoragePath,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        sha256Hash: doc.sha256Hash,
        extractionStatus: doc.extractionStatus,
        extractedText: doc.extractedText,
        extractionMeta: doc.extractionMeta,
      });
    }

    // Duplication du profil actif le plus récent
    const [latestProfile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, id))
      .orderBy(desc(projectProfiles.version));

    if (latestProfile) {
      await db.insert(projectProfiles).values({
        projectId: duplicated.id,
        version: 1,
        status: latestProfile.status,
        profileData: {
          ...latestProfile.profileData,
          projectId: duplicated.id,
          projectName: duplicated.name,
        },
        userNotes: latestProfile.userNotes,
        profileSha256: latestProfile.profileSha256,
      });
    }

    return NextResponse.json({ project: duplicated }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la duplication.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
