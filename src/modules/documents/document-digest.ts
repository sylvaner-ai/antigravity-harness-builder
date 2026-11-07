import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AppDatabase, sourceDocuments } from '../../db';
import { StoragePort } from './storage';

type SourceDocumentRow = typeof sourceDocuments.$inferSelect;

const SHA256_HEX = /^[0-9a-f]{64}$/i;

/**
 * Garantit une empreinte SHA-256 valide pour chaque document d'un projet, avant de l'inscrire au manifeste.
 * Une empreinte invalide (données anciennes, saisie de démonstration) est recalculée depuis le fichier conservé,
 * à défaut depuis le texte extrait, puis corrigée en base. Sans aucun contenu, le document doit être réimporté.
 */
export async function ensureDocumentDigests(
  db: AppDatabase,
  documents: SourceDocumentRow[],
  storage: Pick<StoragePort, 'readFile'>
): Promise<SourceDocumentRow[]> {
  const result: SourceDocumentRow[] = [];
  for (const doc of documents) {
    if (SHA256_HEX.test(doc.sha256Hash)) {
      result.push(doc);
      continue;
    }
    let bytes: Uint8Array | null = null;
    try {
      bytes = await storage.readFile(doc.safeStoragePath);
    } catch {
      bytes = doc.extractedText ? new TextEncoder().encode(doc.extractedText) : null;
    }
    if (!bytes) {
      throw new Error(`Le document « ${doc.originalName} » n'a plus de contenu lisible : supprimez-le puis réimportez-le à l'étape 1.`);
    }
    const sha256Hash = crypto.createHash('sha256').update(bytes).digest('hex');
    await db.update(sourceDocuments).set({ sha256Hash, sizeBytes: bytes.byteLength }).where(eq(sourceDocuments.id, doc.id));
    result.push({ ...doc, sha256Hash, sizeBytes: bytes.byteLength });
  }
  return result;
}
