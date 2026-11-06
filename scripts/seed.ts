import { getDb, users, eccSyncs, eccComponents } from '../src/db';
import { AuthService } from '../src/modules/auth';
import { eq } from 'drizzle-orm';

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
