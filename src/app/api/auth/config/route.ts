import { NextResponse } from 'next/server';
import { isRegistrationAllowed } from '../../../../modules/auth/registration';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ registrationAllowed: isRegistrationAllowed() });
}
