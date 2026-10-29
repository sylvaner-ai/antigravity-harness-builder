import { NextRequest } from 'next/server';
import { AuthService, UserSession } from './auth-service';

export async function requireAuthUser(req: NextRequest): Promise<UserSession> {
  const sessionId = req.cookies.get('ahb_session')?.value;
  if (!sessionId) {
    throw new Error('Authentification requise.');
  }

  const auth = new AuthService();
  const session = await auth.validateSession(sessionId);
  if (!session) {
    throw new Error('Session expirée ou invalide. Veuillez vous reconnecter.');
  }

  return session;
}
