import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StoragePort {
  saveFile(subDir: string, fileName: string, data: Uint8Array): Promise<{ absolutePath: string; relativePath: string; sha256: string; sizeBytes: number }>;
  readFile(relativePath: string): Promise<Uint8Array>;
  deleteFile(relativePath: string): Promise<boolean>;
  exists(relativePath: string): Promise<boolean>;
}

export class LocalDiskStorage implements StoragePort {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? process.env.PRIVATE_STORAGE_DIR ?? '/data/storage';
  }

  private resolveSafePath(relativePath: string): string {
    // Évite tout risque de path traversal
    const safeRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(this.baseDir, safeRel);
    if (!fullPath.startsWith(path.resolve(this.baseDir))) {
      throw new Error(`Tentative d'accès hors du répertoire de stockage privé : ${relativePath}`);
    }
    return fullPath;
  }

  async saveFile(
    subDir: string,
    fileName: string,
    data: Uint8Array
  ): Promise<{ absolutePath: string; relativePath: string; sha256: string; sizeBytes: number }> {
    const safeSub = path.normalize(subDir).replace(/^(\.\.[\/\\])+/, '');
    const dirPath = path.resolve(this.baseDir, safeSub);
    await fs.mkdir(dirPath, { recursive: true });

    // Génère un UUID / nom sûr pour éviter les collisions et injection de chemin
    const ext = path.extname(fileName);
    const safeName = `${crypto.randomUUID()}${ext}`;
    const absolutePath = path.join(dirPath, safeName);
    const relativePath = path.join(safeSub, safeName);

    await fs.writeFile(absolutePath, data);

    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    return {
      absolutePath,
      relativePath,
      sha256,
      sizeBytes: data.byteLength,
    };
  }

  async readFile(relativePath: string): Promise<Uint8Array> {
    const fullPath = this.resolveSafePath(relativePath);
    const buf = await fs.readFile(fullPath);
    return new Uint8Array(buf);
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
