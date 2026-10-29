import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDbPool } from './index';

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');
  await migrate(db, { migrationsFolder });
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      console.log('Database migrations applied successfully.');
      await closeDbPool();
    })
    .catch(async (err) => {
      console.error('Migration failed:', err);
      await closeDbPool();
      process.exit(1);
    });
}
