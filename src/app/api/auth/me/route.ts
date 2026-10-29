import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../modules/auth';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('ahb_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  const auth = new AuthService();
  const session = await auth.validateSession(sessionId);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  });
}
