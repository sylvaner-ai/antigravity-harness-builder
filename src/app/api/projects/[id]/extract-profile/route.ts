import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, projects, sourceDocuments } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { ProjectProfileService } from '@/modules/project-profile/service';
import { extractProfileFromAuditReport, parseAuditReportText } from '@/modules/project-profile/audit-extractor';
import { GeminiLLMAdapter } from '@/modules/llm-gateway/gemini-adapter';
import { MockLLMAdapter } from '@/modules/llm-gateway/mock-adapter';
import { LLMGatewayPort } from '@/modules/llm-gateway/types';

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

    const docs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, projectId));
    const specDoc = docs.find((d: typeof sourceDocuments.$inferSelect) => d.role === 'SPECIFICATION');
    const dsDoc = docs.find((d: typeof sourceDocuments.$inferSelect) => d.role === 'DESIGN_SYSTEM');
    // Parcours B : le dernier rapport d'audit importé apporte la pile technique réelle et les consignes de l'équipe
    const auditDoc = docs
      .filter((d: typeof sourceDocuments.$inferSelect) => d.role === 'AUDIT_REPORT' && d.extractedText)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!specDoc || !specDoc.extractedText) {
      return NextResponse.json(
        { error: 'Le document de cahier des charges est requis et doit être extrait.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const supplementaryNotes = body.supplementaryNotes ?? {};

    // Sélection de l'adaptateur LLM (Gemini si clé fournie, sinon extraction heuristique mock)
    const apiKey = (body.geminiApiKey as string | undefined)?.trim() || process.env.GEMINI_API_KEY;
    const model = (body.geminiModel as string | undefined)?.trim();
    const llm: LLMGatewayPort = apiKey
      ? new GeminiLLMAdapter(apiKey, model ? { fastModel: model } : undefined)
      : new MockLLMAdapter();

    const profileService = new ProjectProfileService(db, llm);
    const profile = await profileService.extractProfileFromDocuments({
      projectId,
      projectName: project.name,
      targetSurface: project.targetSurface,
      specDocumentText: specDoc.extractedText,
      designSystemDocumentText: dsDoc?.extractedText ?? 'Aucun design system fourni.',
      supplementaryNotes,
      auditProfile: auditDoc?.extractedText
        ? extractProfileFromAuditReport({
            projectId,
            projectName: project.name,
            targetSurface: project.targetSurface,
            auditReport: parseAuditReportText(auditDoc.extractedText),
            documentId: auditDoc.id,
          })
        : undefined,
    });

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l extraction du profil.';
    console.error('[extract-profile]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
