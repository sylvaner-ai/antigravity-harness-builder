/**
 * Génère le script et le guide de l'auto-test Antigravity.
 * Usage : npx tsx scripts/selftest-pack.mts [dossier-de-sortie] [jeton]
 *   → <sortie>/selftest.sh et <sortie>/AUTO_TEST_GUIDE.md (à garder hors du projet testé)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSelfTestPack, randomNonce, renderSelfTestGuide, renderSelfTestScript } from '../src/modules/selftest/pack';

const out = process.argv[2] ?? 'selftest-out';
const pack = buildSelfTestPack(process.argv[3] ?? randomNonce());
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/selftest.sh`, renderSelfTestScript(pack), { mode: 0o755 });
writeFileSync(`${out}/AUTO_TEST_GUIDE.md`, renderSelfTestGuide(pack));
console.log(`Série ${pack.nonce} : ${out}/selftest.sh et ${out}/AUTO_TEST_GUIDE.md`);
