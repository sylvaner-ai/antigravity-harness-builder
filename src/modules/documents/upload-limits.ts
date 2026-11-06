/**
 * Plafonds d'envoi de documents (protection du disque et de la mémoire).
 *  - MAX_FILE_SIZE_MB : taille maximale d'un fichier, défaut 20 Mo.
 *  - MAX_PROJECT_FILES : nombre maximal de documents par projet, défaut 15.
 */
export interface UploadLimits {
  maxFileBytes: number;
  maxProjectFiles: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readUploadLimits(env: NodeJS.ProcessEnv = process.env): UploadLimits {
  return {
    maxFileBytes: positiveInt(env.MAX_FILE_SIZE_MB, 20) * 1024 * 1024,
    maxProjectFiles: positiveInt(env.MAX_PROJECT_FILES, 15),
  };
}

/** Retourne un message d'erreur si le fichier dépasse un plafond, sinon null. */
export function checkUploadLimits(
  fileSizeBytes: number,
  existingFilesCount: number,
  limits: UploadLimits = readUploadLimits()
): { status: number; error: string } | null {
  if (fileSizeBytes > limits.maxFileBytes) {
    return {
      status: 413,
      error: `Fichier trop volumineux (${(fileSizeBytes / 1024 / 1024).toFixed(1)} Mo ; maximum ${Math.round(limits.maxFileBytes / 1024 / 1024)} Mo).`,
    };
  }
  if (existingFilesCount >= limits.maxProjectFiles) {
    return {
      status: 400,
      error: `Ce projet contient déjà ${existingFilesCount} documents (maximum ${limits.maxProjectFiles}). Supprimez-en avant d'en ajouter.`,
    };
  }
  return null;
}
