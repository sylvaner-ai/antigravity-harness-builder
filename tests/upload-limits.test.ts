import { describe, it, expect } from 'vitest';
import { checkUploadLimits, readUploadLimits } from '../src/modules/documents/upload-limits';

describe('plafonds d\'envoi de documents', () => {
  const limits = { maxFileBytes: 2 * 1024 * 1024, maxProjectFiles: 3 };

  it('lit les valeurs par défaut (20 Mo, 15 fichiers) et les réglages', () => {
    expect(readUploadLimits({} as NodeJS.ProcessEnv)).toEqual({ maxFileBytes: 20 * 1024 * 1024, maxProjectFiles: 15 });
    expect(
      readUploadLimits({ MAX_FILE_SIZE_MB: '5', MAX_PROJECT_FILES: '4' } as unknown as NodeJS.ProcessEnv)
    ).toEqual({ maxFileBytes: 5 * 1024 * 1024, maxProjectFiles: 4 });
    expect(readUploadLimits({ MAX_FILE_SIZE_MB: '0', MAX_PROJECT_FILES: 'x' } as unknown as NodeJS.ProcessEnv).maxProjectFiles).toBe(15);
  });

  it('accepte un fichier dans les limites', () => {
    expect(checkUploadLimits(1024, 2, limits)).toBeNull();
  });

  it('refuse un fichier trop gros (413)', () => {
    expect(checkUploadLimits(3 * 1024 * 1024, 0, limits)?.status).toBe(413);
  });

  it('refuse un ajout au-delà du nombre de documents (400)', () => {
    expect(checkUploadLimits(1024, 3, limits)?.status).toBe(400);
  });
});
