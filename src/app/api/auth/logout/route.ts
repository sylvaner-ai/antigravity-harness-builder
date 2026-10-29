import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../modules/auth';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('ahb_session')?.value;
  if (sessionId) {
    const auth = new AuthService();
    await auth.logout(sessionId);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete('ahb_session');
  return res;
}
