import { getDb, users, projects, sourceDocuments, eccSyncs, eccComponents } from '../src/db';
import { AuthService } from '../src/modules/auth';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';

async function seed() {
  const db = getDb();
  const auth = new AuthService(db);

  console.log('--- SEEDING INITIAL ADMIN ---');
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? '';
  if (!adminEmail) {
    throw new Error('INITIAL_ADMIN_EMAIL est requis (aucun compte administrateur par défaut).');
  }
  let [admin] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (!admin) {
    if (adminPassword.length < 12) {
      throw new Error('INITIAL_ADMIN_PASSWORD est requis (12 caractères minimum) pour créer le compte administrateur.');
    }
    const session = await auth.register(adminEmail, adminPassword, 'ADMIN');
    const [created] = await db.select().from(users).where(eq(users.id, session.userId));
    admin = created!;
    console.log('Admin user created:', admin.email, admin.id);
  } else {
    console.log('Admin user already exists:', admin.email, admin.id);
  }

  console.log('--- RESTORING FELICICAR PROJECT ---');
  const felicicarId = 'bb06ac75-6548-47b0-a5cc-79c9a061e165';
  let [felicicarProj] = await db.select().from(projects).where(eq(projects.id, felicicarId));
  if (!felicicarProj) {
    const [p] = await db
      .insert(projects)
      .values({
        id: felicicarId,
        userId: admin.id,
        name: 'Portail de gestion Felicicar',
        targetSurface: 'APP',
        status: 'ACTIVE',
      })
      .returning();
    felicicarProj = p!;
    console.log('Project restored:', felicicarProj.name);
  } else {
    await db.update(projects).set({ userId: admin.id }).where(eq(projects.id, felicicarId));
    console.log('Project already exists, owner updated to admin.');
  }

  // Restore source documents
  const specText = await fs.readFile('/tmp/felicicar_spec.txt', 'utf8').catch(() => '');
  const dsText = await fs.readFile('/tmp/felicicar_design.txt', 'utf8').catch(() => '');

  const existingDocs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, felicicarId));
  if (existingDocs.length === 0 && specText) {
    await db.insert(sourceDocuments).values([
      {
        id: '58121b3b-adeb-47c0-ab0c-aaee52e3a697',
        projectId: felicicarId,
        role: 'SPECIFICATION',
        originalName: 'specifications-location-moyenne-duree.md',
        safeStoragePath: '/data/storage/bb06ac75-6548-47b0-a5cc-79c9a061e165/fd09855c-efee-4633-b0ea-61eb177d671f.md',
        mimeType: 'text/markdown',
        sizeBytes: Buffer.byteLength(specText),
        sha256Hash: 'dummy-sha-spec',
        extractionStatus: 'COMPLETED',
        extractedText: specText,
      },
      {
        id: '7fd3e6eb-832c-44c0-80cf-e70156efa499',
        projectId: felicicarId,
        role: 'DESIGN_SYSTEM',
        originalName: 'DESIGN.md',
        safeStoragePath: '/data/storage/bb06ac75-6548-47b0-a5cc-79c9a061e165/b3953423-0890-4196-93ee-4b23de824b27.md',
        mimeType: 'text/markdown',
        sizeBytes: Buffer.byteLength(dsText),
        sha256Hash: 'dummy-sha-ds',
        extractionStatus: 'COMPLETED',
        extractedText: dsText,
      },
    ]);
    console.log('Restored 2 source documents for Felicicar.');
  } else {
    console.log('Source documents already present count:', existingDocs.length);
  }

  console.log('--- VERIFYING ECC CATALOG ---');
  const [activeSync] = await db.select().from(eccSyncs).where(eq(eccSyncs.isActiveCatalog, true));
  if (activeSync) {
    const compCount = await db.select().from(eccComponents).where(eq(eccComponents.eccSyncId, activeSync.id));
    console.log('Active ECC Catalog:', activeSync.versionTag, 'Components:', compCount.length);
  } else {
    console.log('Warning: No active ECC catalog found, will trigger sync.');
  }

  console.log('Seeding finished successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
