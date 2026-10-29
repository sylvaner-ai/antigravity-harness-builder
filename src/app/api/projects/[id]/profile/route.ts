import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { AuthService, requireAuthUser } from '@/modules/auth';
import { ProjectProfileService } from '@/modules/project-profile/service';
import { MockLLMAdapter } from '@/modules/llm-gateway/mock-adapter';
import { ProjectProfile } from '@/modules/project-profile/schema';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const db = getDb();
    const service = new ProjectProfileService(db, new MockLLMAdapter());
    const latest = await service.getLatestProfile(projectId);

    return NextResponse.json({ profile: latest });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser(req);
    const auth = new AuthService();
    await auth.assertProjectOwnership(projectId, user.userId);

    const body = await req.json();
    const confirmedProfile = body.profile as ProjectProfile;
    const userNotes = body.userNotes as Record<string, string> | undefined;

    if (!confirmedProfile) {
      return NextResponse.json({ error: 'Données de profil manquantes.' }, { status: 400 });
    }

    const db = getDb();
    const service = new ProjectProfileService(db, new MockLLMAdapter());
    const saved = await service.confirmUserProfile(projectId, confirmedProfile, userNotes);

    return NextResponse.json({ profile: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de validation du profil.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
