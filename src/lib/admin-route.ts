import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '../modules/auth';
import { sanitizeErrorMessage } from './sanitize-error';

/** Exécute une action d'administration : 401 sans session, 403 sans rôle ADMIN, 400 avec un message lisible sinon. */
export async function adminAction(req: NextRequest, action: () => Promise<unknown>, options: { readOnly?: boolean } = {}) {
  let user;
  try {
    user = await requireAuthUser(req);
  } catch {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }
  if (!options.readOnly && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Action réservée aux administrateurs.' }, { status: 403 });
  }
  try {
    return NextResponse.json(await action());
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err).message }, { status: 400 });
  }
}
