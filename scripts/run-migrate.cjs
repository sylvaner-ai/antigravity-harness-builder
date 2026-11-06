const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const compiledPath = path.resolve(__dirname, '../dist/migrate.cjs');
if (fs.existsSync(compiledPath)) {
  const result = spawnSync(process.execPath, [compiledPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
} else {
  const result = spawnSync('npx', ['tsx', 'src/db/migrate.ts'], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
