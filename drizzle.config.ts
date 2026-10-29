import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://ahb_user:ahb_dev_password_2026@localhost:5433/ahb_db',
  },
});
