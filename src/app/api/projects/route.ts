import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, projects } from '../../../db';
import { requireAuthUser } from '../../../modules/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const db = getDb();

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') as 'ACTIVE' | 'ARCHIVED' | null;
    const surfaceFilter = url.searchParams.get('surface') as 'APP' | 'IDE' | 'CLI' | null;

    const conditions = [eq(projects.userId, user.userId)];
    if (statusFilter) conditions.push(eq(projects.status, statusFilter));
    if (surfaceFilter) conditions.push(eq(projects.targetSurface, surfaceFilter));

    const list = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ projects: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const db = getDb();
    const body = await req.json();

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Le nom du projet est obligatoire.' }, { status: 400 });
    }

    const description = body.description?.trim() ?? '';
    const targetSurface = (['APP', 'IDE', 'CLI'].includes(body.targetSurface) ? body.targetSurface : 'IDE') as 'APP' | 'IDE' | 'CLI';

    const [created] = await db
      .insert(projects)
      .values({
        userId: user.userId,
        name,
        description,
        targetSurface,
        status: 'ACTIVE',
      })
      .returning();

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la création.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
