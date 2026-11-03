import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, harnessGenerations, generatedArtifacts, projects } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { LocalDiskStorage } from '@/modules/documents/storage';
import {
  isEssentialHarnessFile,
  renderDeploymentPromptMarkdown,
  renderUpgradePromptMarkdown,
  renderBase64OneLinerPrompt,
  renderLightweightUpgradePromptMarkdown,
  buildTarGzBase64,
} from '@/modules/package-exporter/exporter';

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

    if (target === 'compact_base64' || target === 'compact') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const files = artifacts
        .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
        .map((a: typeof generatedArtifacts.$inferSelect) => ({
          relativePath: a.relativePath,
          content: a.content,
        }));

      const essentialFiles = files.filter((f) => isEssentialHarnessFile(f.relativePath));

      const base64Payload = buildTarGzBase64(essentialFiles.length > 0 ? essentialFiles : files);
      const compactPrompt = renderBase64OneLinerPrompt({
        projectName: project.name,
        targetSurface: project.targetSurface || 'IDE',
        base64Payload,
        filesCount: files.length,
      });

      const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
      const safeProjectSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return new NextResponse(compactPrompt, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `${disposition}; filename="deploy-${safeProjectSlug}-compact.md"`,
        },
      });
    }

    if (target === 'lightweight_markdown' || target === 'lightweight') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const files = artifacts
        .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
        .map((a: typeof generatedArtifacts.$inferSelect) => ({
          relativePath: a.relativePath,
          content: a.content,
        }));

      const lightweightPrompt = renderLightweightUpgradePromptMarkdown({
        projectName: project.name,
        targetSurface: project.targetSurface || 'IDE',
        files,
      });

      const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
      const safeProjectSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return new NextResponse(lightweightPrompt, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `${disposition}; filename="upgrade-${safeProjectSlug}-light.md"`,
        },
      });
    }

    if (target === 'upgrade_markdown' || target === 'upgrade_script') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const files = artifacts
        .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
        .map((a: typeof generatedArtifacts.$inferSelect) => ({
          relativePath: a.relativePath,
          content: a.content,
        }));

      const upgradePrompt = renderUpgradePromptMarkdown({
        projectName: project.name,
        targetSurface: project.targetSurface || 'IDE',
        files,
      });

      const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
      const safeProjectSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return new NextResponse(upgradePrompt, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `${disposition}; filename="upgrade-${safeProjectSlug}-harness.md"`,
        },
      });
    }

    if (target === 'deploy_markdown' || target === 'deploy_script' || target === 'markdown') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const files = artifacts
        .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
        .map((a: typeof generatedArtifacts.$inferSelect) => ({
          relativePath: a.relativePath,
          content: a.content,
        }));

      const deploymentPrompt = renderDeploymentPromptMarkdown({
        projectName: project.name,
        targetSurface: project.targetSurface || 'IDE',
        files,
      });

      const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
      const safeProjectSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return new NextResponse(deploymentPrompt, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `${disposition}; filename="deploy-${safeProjectSlug}-harness.md"`,
        },
      });
    }

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
