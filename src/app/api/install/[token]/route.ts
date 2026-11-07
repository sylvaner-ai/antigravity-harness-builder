import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { buildInstallZip, loadInstallFiles, resolveInstallLink } from '@/modules/package-exporter/install-link';

/**
 * Téléchargement public du paquet d'installation par l'agent Antigravity.
 * Pas de session : le jeton aléatoire (256 bits), limité à 24 h, tient lieu d'autorisation.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const generationId = await resolveInstallLink(db, token);
  if (!generationId) {
    return NextResponse.json(
      { error: 'Lien invalide ou expiré : copiez à nouveau le prompt depuis Antigravity Harness Builder.' },
      { status: 404 }
    );
  }
  const zip = buildInstallZip(await loadInstallFiles(db, generationId));
  return new NextResponse(Buffer.from(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="harness.zip"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
