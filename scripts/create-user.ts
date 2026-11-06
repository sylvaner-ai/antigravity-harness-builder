/**
 * Administration des comptes (usage interne, les inscriptions publiques sont fermées).
 *
 *   node dist/create-user.cjs <email> [--role ADMIN|USER]   crée un compte
 *   node dist/create-user.cjs <email> --reset               réinitialise le mot de passe
 *
 * Le mot de passe est saisi de façon masquée (ou fourni par AHB_NEW_PASSWORD en mode non interactif).
 * Il n'est jamais affiché ni passé en argument.
 */
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { eq } from 'drizzle-orm';
import { getDb, closeDbPool, users } from '../src/db';
import { AuthService } from '../src/modules/auth/auth-service';

const MIN_PASSWORD_LENGTH = 12;

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, _enc, cb) {
        if (!muted) process.stdout.write(chunk);
        cb();
      },
    });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.AHB_NEW_PASSWORD;
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) {
    throw new Error('Terminal non interactif : fournissez AHB_NEW_PASSWORD ou utilisez docker exec -it.');
  }
  const first = await askHidden('Mot de passe : ');
  const second = await askHidden('Confirmer le mot de passe : ');
  if (first !== second) throw new Error('Les deux saisies sont différentes.');
  return first;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));
  const reset = args.includes('--reset');
  const roleIndex = args.indexOf('--role');
  const role = roleIndex >= 0 ? args[roleIndex + 1] : 'USER';
  if (!email) throw new Error('Usage : create-user <email> [--role ADMIN|USER] [--reset]');
  if (role !== 'ADMIN' && role !== 'USER') throw new Error('Le rôle doit être ADMIN ou USER.');

  const password = await readPassword();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
  }

  const db = getDb();
  const auth = new AuthService(db);
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, normalized));

  if (reset) {
    await auth.setPassword(normalized, password);
    console.log(`Mot de passe réinitialisé pour ${normalized} ; toutes ses sessions ont été révoquées.`);
  } else {
    if (existing) throw new Error(`Le compte ${normalized} existe déjà (utilisez --reset pour changer son mot de passe).`);
    await auth.register(normalized, password, role);
    console.log(`Compte ${normalized} créé avec le rôle ${role}.`);
  }
}

main()
  .then(async () => {
    await closeDbPool();
  })
  .catch(async (err) => {
    console.error('Erreur :', err instanceof Error ? err.message : err);
    await closeDbPool();
    process.exit(1);
  });
