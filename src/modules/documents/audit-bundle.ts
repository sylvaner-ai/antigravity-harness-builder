import path from 'node:path';
import { AppDatabase, sourceDocuments } from '../../db';
import { AntigravitySurface } from '../antigravity-adapter/schema';
import { computeSha256 } from '../package-exporter/exporter';
import { AntigravityAuditReport, ProjectProfile, ProjectProfileService } from '../project-profile';
import { MockLLMAdapter } from '../llm-gateway/mock-adapter';
import { sanitizeTextForPromptSafety } from './extractor';
import { LocalDiskStorage, StoragePort } from './storage';

export interface AuditBundleIngestion {
  auditDocumentId: string;
  profile: ProjectProfile;
  /** Documents joints à l'audit et importés comme documents sources. */
  importedDocuments: Array<{ id: string; role: string; originalName: string }>;
  /** Documents cités par l'audit sans contenu (PDF, DOCX…) : à importer à la main. */
  documentsWithoutContent: string[];
  hasSpecification: boolean;
}

/**
 * Importe un export d'audit complet (audit 2.1) : les documents fonctionnels joints deviennent des documents
 * sources du projet, l'audit est conservé sans ces contenus, et le profil technique est extrait de l'audit.
 * L'extraction du métier depuis le cahier des charges se fait ensuite par la route `extract-profile`, qui fusionne.
 */
export async function ingestAuditBundle(params: {
  db: AppDatabase;
  projectId: string;
  projectName: string;
  targetSurface: AntigravitySurface;
  auditReport: AntigravityAuditReport;
  storage?: StoragePort;
}): Promise<AuditBundleIngestion> {
  const { db, projectId, projectName, targetSurface, auditReport } = params;
  const storage = params.storage ?? new LocalDiskStorage();

  const importedDocuments: AuditBundleIngestion['importedDocuments'] = [];
  const documentsWithoutContent: string[] = [];

  for (const doc of auditReport.functionalDocuments) {
    if (!doc.content?.trim()) {
      documentsWithoutContent.push(doc.path);
      continue;
    }
    const role = doc.role ?? 'SUPPLEMENTARY';
    const fileName = path.posix.basename(doc.path) || 'document.md';
    const { sanitized, warnings } = sanitizeTextForPromptSafety(doc.content);
    const saved = await storage.saveFile(projectId, fileName, new TextEncoder().encode(doc.content));
    const [inserted] = await db
      .insert(sourceDocuments)
      .values({
        projectId,
        role,
        originalName: doc.path,
        safeStoragePath: saved.relativePath,
        mimeType: fileName.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
        sizeBytes: saved.sizeBytes,
        sha256Hash: saved.sha256,
        extractionStatus: 'COMPLETED',
        extractedText: sanitized,
        extractionMeta: { method: 'antigravity-audit-embedded', warnings },
      })
      .returning();
    if (inserted) importedDocuments.push({ id: inserted.id, role, originalName: doc.path });
  }

  // L'audit est conservé sans les contenus déjà importés comme documents (ni doublon, ni poids inutile).
  const storedAudit: AntigravityAuditReport = {
    ...auditReport,
    functionalDocuments: auditReport.functionalDocuments.map(({ content: _content, ...rest }) => rest),
  };
  const rawAuditString = JSON.stringify(storedAudit, null, 2);
  const [auditDoc] = await db
    .insert(sourceDocuments)
    .values({
      projectId,
      role: 'AUDIT_REPORT',
      originalName: 'antigravity-audit.json',
      safeStoragePath: `audits/${projectId}/antigravity-audit.json`,
      mimeType: 'application/json',
      sizeBytes: Buffer.byteLength(rawAuditString, 'utf-8'),
      sha256Hash: computeSha256(rawAuditString),
      extractionStatus: 'COMPLETED',
      extractedText: rawAuditString,
      extractionMeta: { method: 'antigravity-audit-scan' },
    })
    .returning();
  if (!auditDoc) throw new Error("Échec de l'enregistrement du rapport d'audit.");

  const profileService = new ProjectProfileService(db, new MockLLMAdapter());
  const profile = await profileService.ingestAuditReport({
    projectId,
    projectName,
    targetSurface,
    auditReport,
    documentId: auditDoc.id,
  });

  return {
    auditDocumentId: auditDoc.id,
    profile,
    importedDocuments,
    documentsWithoutContent,
    hasSpecification: importedDocuments.some((d) => d.role === 'SPECIFICATION'),
  };
}
