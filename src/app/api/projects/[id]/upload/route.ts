import { NextRequest, NextResponse } from 'next/server';
import { getDb, sourceDocuments } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { LocalDiskStorage } from '@/modules/documents/storage';
import {
  extractDocumentText,
  sanitizeTextForPromptSafety,
  validateAndDetectMimeType,
} from '@/modules/documents/extractor';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const role = (formData.get('role') as 'SPECIFICATION' | 'DESIGN_SYSTEM' | 'SUPPLEMENTARY') || 'SPECIFICATION';

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 1. Validation du type réel et rejet des fichiers invalides / déguisés
    const mimeCheck = validateAndDetectMimeType(file.name, buffer);
    if (!mimeCheck.isSupported) {
      return NextResponse.json(
        { error: `Format de fichier non supporté ou dangereux : ${mimeCheck.reason}` },
        { status: 400 }
      );
    }

    // 2. Stockage sécurisé hors public/
    const storage = new LocalDiskStorage();
    const storageMeta = await storage.saveFile(projectId, file.name, buffer);

    // 3. Extraction du texte
    let extractedText = '';
    let extractionStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';
    const extractionMeta: Record<string, unknown> = {
      detectedMime: mimeCheck.mimeType,
    };

    try {
      const extracted = await extractDocumentText(file.name, mimeCheck.mimeType, buffer);
      // Nettoyage de sécurité Unicode & anti-injection (R-02)
      const { sanitized, warnings } = sanitizeTextForPromptSafety(extracted.text);
      extractedText = sanitized;
      extractionMeta.method = extracted.metadata.method;
      extractionMeta.tokensCountEstimate = extracted.metadata.tokensCountEstimate;
      extractionMeta.warnings = [...(extracted.metadata.warnings ?? []), ...warnings];
    } catch (parseErr: unknown) {
      extractionStatus = 'FAILED';
      extractionMeta.error = parseErr instanceof Error ? parseErr.message : 'Erreur d extraction';
    }

    // 4. Enregistrement en base de données
    const db = getDb();
    const [doc] = await db
      .insert(sourceDocuments)
      .values({
        projectId,
        role,
        originalName: file.name,
        safeStoragePath: storageMeta.relativePath,
        mimeType: mimeCheck.mimeType,
        sizeBytes: storageMeta.sizeBytes,
        sha256Hash: storageMeta.sha256,
        extractionStatus,
        extractedText: extractionStatus === 'COMPLETED' ? extractedText : null,
        extractionMeta,
      })
      .returning();

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l upload.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
