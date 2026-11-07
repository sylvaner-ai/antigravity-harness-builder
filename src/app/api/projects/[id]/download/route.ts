import { NextRequest, NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { getDb, harnessGenerations, generatedArtifacts, projects, sourceDocuments } from '@/db';
import { AntigravityAuditReport, parseAuditReportText } from '@/modules/project-profile/audit-extractor';
import { computeUpgradePlan } from '@/modules/package-exporter/upgrade-plan';
import { filesForProjectInstall } from '@/modules/package-exporter/install-files';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { LocalDiskStorage } from '@/modules/documents/storage';
import {
  renderDeploymentPromptMarkdown,
  renderUpgradePromptMarkdown,
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

    if (target === 'upgrade_markdown' || target === 'upgrade_script') {
      const artifacts = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.generationId, generation.id));

      const files = filesForProjectInstall(
        artifacts
          .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
          .map((a: typeof generatedArtifacts.$inferSelect) => ({
            relativePath: a.relativePath,
            content: a.content,
          }))
      );

      // Plan calculé à partir du dernier audit importé (audit 2.0) et de la commande de test du projet
      const [auditDoc] = await db
        .select()
        .from(sourceDocuments)
        .where(and(eq(sourceDocuments.projectId, projectId), eq(sourceDocuments.role, 'AUDIT_REPORT')))
        .orderBy(desc(sourceDocuments.createdAt))
        .limit(1);
      let audit: AntigravityAuditReport | undefined;
      try {
        audit = auditDoc?.extractedText ? parseAuditReportText(auditDoc.extractedText) : undefined;
      } catch {
        audit = undefined; // audit illisible : protocole général sans plan
      }
      const plan = audit
        ? computeUpgradePlan({
            newFiles: files,
            existingFiles: audit.existingAiHarness?.files ?? [],
            previousFiles: audit.previousGeneration?.files,
          })
        : undefined;

      const upgradePrompt = renderUpgradePromptMarkdown({
        projectName: project.name,
        targetSurface: project.targetSurface || 'IDE',
        files,
        operationalTestCommand: audit?.operationalCommands?.test,
        plan,
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

      const files = filesForProjectInstall(
        artifacts
          .filter((a: typeof generatedArtifacts.$inferSelect) => a.relativePath && a.content)
          .map((a: typeof generatedArtifacts.$inferSelect) => ({
            relativePath: a.relativePath,
            content: a.content,
          }))
      );

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
