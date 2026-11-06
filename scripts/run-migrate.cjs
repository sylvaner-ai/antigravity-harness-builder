const fs = require('node:fs');
const path = require('node:path');

const compiled = path.resolve(__dirname, '../dist/migrate.cjs');
if (fs.existsSync(compiled)) {
  require(compiled);
} else {
  const { execSync } = require('node:child_process');
  execSync('npx tsx src/db/migrate.ts', { stdio: 'inherit' });
}
