import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, projects, harnessGenerations, generatedArtifacts } from '@/db';
import { buildTarGzBase64 } from '@/modules/package-exporter/exporter';
import { renderSafeInstallScript } from '@/modules/package-exporter/deploy-script';
import { AuthService, requireAuthUser } from '@/modules/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const auth = new AuthService();

    let authorized = false;
    if (token && auth.verifyDeploymentToken(projectId, token)) {
      authorized = true;
    } else {
      try {
        const user = await requireAuthUser(req);
        await auth.assertProjectOwnership(projectId, user.userId);
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return new NextResponse(
        'echo "Erreur 401 : Accès non autorisé au script de déploiement (jeton de déploiement manquant ou expiré). Récupérez une commande valide depuis l\'interface web."; exit 1;\n',
        {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    const db = getDb();

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return new NextResponse('echo "Erreur : Projet introuvable"; exit 1;\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const [generation] = await db
      .select()
      .from(harnessGenerations)
      .where(eq(harnessGenerations.projectId, projectId))
      .orderBy(desc(harnessGenerations.createdAt))
      .limit(1);

    if (!generation) {
      return new NextResponse('echo "Erreur : Aucun harnais généré pour ce projet"; exit 1;\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const artifacts = await db
      .select()
      .from(generatedArtifacts)
      .where(eq(generatedArtifacts.generationId, generation.id));

    const files = artifacts
      .filter((a) => a.relativePath && a.content)
      .map((a) => ({
        relativePath: a.relativePath,
        content: a.content,
      }));

    const script = renderSafeInstallScript({
      projectName: project.name,
      base64Payload: buildTarGzBase64(files),
    });

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/x-shellscript; charset=utf-8',
        'Content-Disposition': 'inline; filename="deploy.sh"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Erreur';
    const safeMsg = rawMsg.replace(/["`$\\\r\n']/g, '');
    return new NextResponse(`echo "Erreur serveur : ${safeMsg}"; exit 1;\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
