import crypto from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { zipSync, strToU8, Zippable } from 'fflate';
import { AppDatabase, generatedArtifacts, installLinks } from '../../db';
import { filesForProjectInstall } from './install-files';

/** Durée de validité d'un lien d'installation. */
export const INSTALL_LINK_TTL_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export interface InstallFile {
  relativePath: string;
  content: string;
  sha256: string;
}

/** Fichiers installés dans le projet pour une génération (même jeu que celui décrit par le prompt). */
export async function loadInstallFiles(db: AppDatabase, generationId: string): Promise<InstallFile[]> {
  const artifacts = await db
    .select({ relativePath: generatedArtifacts.relativePath, content: generatedArtifacts.content })
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.generationId, generationId));
  return filesForProjectInstall(artifacts.filter((a) => a.relativePath && a.content))
    .map((f) => ({ ...f, sha256: crypto.createHash('sha256').update(f.content).digest('hex') }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/** Crée un lien de téléchargement à usage limité dans le temps ; renvoie le jeton en clair (jamais stocké). */
export async function createInstallLink(
  db: AppDatabase,
  generationId: string,
  now: Date = new Date()
): Promise<{ token: string; expiresAt: Date }> {
  await db.delete(installLinks).where(lt(installLinks.expiresAt, now)); // ménage des liens expirés
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + INSTALL_LINK_TTL_MS);
  await db.insert(installLinks).values({ generationId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

/** Résout un jeton valide et non expiré vers sa génération. */
export async function resolveInstallLink(db: AppDatabase, token: string, now: Date = new Date()): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [link] = await db
    .select({ generationId: installLinks.generationId })
    .from(installLinks)
    .where(and(eq(installLinks.tokenHash, hashToken(token)), gt(installLinks.expiresAt, now)))
    .limit(1);
  return link?.generationId ?? null;
}

/** Archive d'installation : les fichiers à leur chemin relatif exact, sans dossier racine. */
export function buildInstallZip(files: readonly InstallFile[]): Uint8Array {
  const entries: Zippable = {};
  for (const f of files) entries[f.relativePath] = [strToU8(f.content), { mtime: new Date('2026-01-01T00:00:00Z') }];
  return zipSync(entries, { level: 9 });
}

/** Origine publique de l'application, derrière le proxy de Coolify (en-têtes X-Forwarded-*). */
export function publicOrigin(headers: Headers, fallbackOrigin: string): string {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return host ? `${proto || 'https'}://${host}` : fallbackOrigin;
}
