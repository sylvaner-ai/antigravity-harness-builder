import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../modules/auth';
import { clientIp, loginThrottle } from '../../../../modules/auth/login-throttle';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
    }

    const ip = clientIp(req.headers);
    const retryAfter = loginThrottle.retryAfterSeconds(String(email), ip);
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: `Trop de tentatives échouées. Réessayez dans ${Math.ceil(retryAfter / 60)} minute(s).` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const auth = new AuthService();
    let session;
    try {
      session = await auth.login(email, password);
    } catch (err) {
      loginThrottle.recordFailure(String(email), ip);
      throw err;
    }
    loginThrottle.recordSuccess(String(email));

    const isSecure = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const res = NextResponse.json({ success: true, user: { email: session.email, role: session.role } });
    res.cookies.set('ahb_session', session.sessionId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Échec de la connexion.';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
