import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../modules/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Email valide et mot de passe d au moins 8 caractères requis.' },
        { status: 400 }
      );
    }

    const auth = new AuthService();
    const session = await auth.register(email, password);

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
    const msg = err instanceof Error ? err.message : 'Échec de l inscription.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
