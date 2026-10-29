import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, harnessGenerations, generatedArtifacts, projects } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { LocalDiskStorage } from '@/modules/documents/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const db = getDb();
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    const [generation] = await db
      .select()
      .from(harnessGenerations)
      .where(eq(harnessGenerations.projectId, projectId))
      .orderBy(desc(harnessGenerations.createdAt))
      .limit(1);

    if (!generation || !project) {
      return NextResponse.json({ error: 'Aucun harnais généré pour ce projet.' }, { status: 404 });
    }

    const url = new URL(req.url);
    const target = url.searchParams.get('target') || 'zip';

    if (target === 'start_here') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const startHere = artifacts.find((a: typeof generatedArtifacts.$inferSelect) => a.relativePath === 'START_HERE.md');
      const content = startHere?.content || '# Guide START_HERE.md introuvable';

      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="START_HERE.md"`,
        },
      });
    }

    // Téléchargement du ZIP complet
    const storage = new LocalDiskStorage();
    const packageFileName = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;
    const zipBytes = await storage.readFile(generation.zipStoragePath || `${projectId}/${packageFileName}`);

    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${packageFileName}"`,
        'X-Harness-SHA256': generation.zipSha256 ?? '',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de téléchargement';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
