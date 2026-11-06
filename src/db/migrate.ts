import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDbPool } from './index';

export async function runMigrations(): Promise<{ applied: boolean; count: number }> {
  const db = getDb();
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');

  let beforeCount = 0;
  try {
    const res = await db.execute(sql`SELECT count(*)::int as count FROM drizzle.__drizzle_migrations`);
    beforeCount = (res.rows[0] as { count: number })?.count ?? 0;
  } catch {
    beforeCount = 0;
  }

  await migrate(db, { migrationsFolder });

  let afterCount = 0;
  try {
    const res = await db.execute(sql`SELECT count(*)::int as count FROM drizzle.__drizzle_migrations`);
    afterCount = (res.rows[0] as { count: number })?.count ?? 0;
  } catch {
    afterCount = 0;
  }

  const diff = afterCount - beforeCount;
  return { applied: diff > 0, count: diff };
}

if (require.main === module) {
  runMigrations()
    .then(async (result) => {
      if (result.applied) {
        console.log(`Database migrations applied successfully (${result.count} new migration(s) applied).`);
      } else {
        console.log('Database schema is already up to date (no migrations needed).');
      }
      await closeDbPool();
    })
    .catch(async (err) => {
      console.error('Migration failed:', err);
      await closeDbPool();
      process.exit(1);
    });
}
