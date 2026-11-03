import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/modules/auth';
import {
  SELFTEST_NONCE_PATTERN,
  buildSelfTestPack,
  randomNonce,
  renderSelfTestGuide,
  renderSelfTestScript,
} from '@/modules/selftest/pack';

/**
 * Auto-test Antigravity : `GET /api/selftest?file=script|guide[&nonce=ABC123]`.
 * Le jeton doit être identique pour le script et le guide d'une même série : le passer explicitement aux deux appels.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuthUser(req);
    const params = req.nextUrl.searchParams;
    const file = params.get('file') ?? 'script';
    const nonce = params.get('nonce') ?? randomNonce();
    if (!SELFTEST_NONCE_PATTERN.test(nonce)) {
      return NextResponse.json({ error: 'Le jeton doit comporter 6 caractères parmi A-Z et 0-9.' }, { status: 400 });
    }
    if (file !== 'script' && file !== 'guide') {
      return NextResponse.json({ error: 'Paramètre file attendu : script ou guide.' }, { status: 400 });
    }
    const pack = buildSelfTestPack(nonce);
    const isScript = file === 'script';
    return new NextResponse(isScript ? renderSelfTestScript(pack) : renderSelfTestGuide(pack), {
      headers: {
        'Content-Type': isScript ? 'text/x-shellscript; charset=utf-8' : 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${isScript ? 'selftest.sh' : 'AUTO_TEST_GUIDE.md'}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
