import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, users, projects } from '../src/db';
import { AuthService } from '../src/modules/auth/auth-service';
import { eq } from 'drizzle-orm';

describe('Jalon 5 — Authentification & Isolation Stricte Multi-Utilisateurs (§14 Phase D)', () => {
  let auth: AuthService;
  const db = getDb();

  beforeAll(async () => {
    auth = new AuthService(db);
    // Nettoyage des utilisateurs de test
    await db.delete(users).where(eq(users.email, 'alice@example.com'));
    await db.delete(users).where(eq(users.email, 'bob@example.com'));
    await db.delete(users).where(eq(users.email, 'admin@example.com'));
  });

  it('1. Inscription et hachage sécurisé scrypt du mot de passe', async () => {
    const sessionAlice = await auth.register('alice@example.com', 'SuperPassword123!', 'USER');
    expect(sessionAlice.email).toBe('alice@example.com');
    expect(sessionAlice.sessionId).toBeDefined();

    // Vérifie que le mot de passe n'est pas stocké en clair
    const [aliceDb] = await db.select().from(users).where(eq(users.email, 'alice@example.com'));
    expect(aliceDb).toBeDefined();
    expect(aliceDb.passwordHash).not.toContain('SuperPassword123!');
    expect(aliceDb.passwordHash).toContain(':'); // salt:key
  });

  it('2. Connexion avec mot de passe valide et rejet des mauvais identifiants', async () => {
    const session = await auth.login('alice@example.com', 'SuperPassword123!');
    expect(session.email).toBe('alice@example.com');

    await expect(auth.login('alice@example.com', 'WrongPassword')).rejects.toThrow('Identifiants incorrects.');
    await expect(auth.login('inconnu@example.com', 'SuperPassword123!')).rejects.toThrow('Identifiants incorrects.');
  });

  it('3. Isolation multi-utilisateurs : Bob ne peut pas accéder au projet d Alice', async () => {
    const sessionAlice = await auth.login('alice@example.com', 'SuperPassword123!');
    const sessionBob = await auth.register('bob@example.com', 'SuperPasswordBob456!', 'USER');

    // Alice crée un projet confidentiel
    const [projectAlice] = await db
      .insert(projects)
      .values({
        userId: sessionAlice.userId,
        name: 'Projet Secret Alice',
        targetSurface: 'IDE',
      })
      .returning();

    // Alice a accès à son propre projet
    await expect(auth.assertProjectOwnership(projectAlice.id, sessionAlice.userId)).resolves.not.toThrow();

    // Bob tente d'accéder au projet d'Alice -> BLOQUÉ IMMÉDIATEMENT
    await expect(auth.assertProjectOwnership(projectAlice.id, sessionBob.userId)).rejects.toThrow(
      'Accès refusé'
    );
  });

  it('4. Rôle ADMIN : Un administrateur dispose du droit de supervision', async () => {
    const sessionAdmin = await auth.register('admin@example.com', 'AdminPassword999!', 'ADMIN');
    const [projectAlice] = await db.select().from(projects).where(eq(projects.name, 'Projet Secret Alice'));

    // L'administrateur peut superviser le projet
    await expect(auth.assertProjectOwnership(projectAlice.id, sessionAdmin.userId)).resolves.not.toThrow();
  });

  it('5. Révocation de session lors de la déconnexion', async () => {
    const session = await auth.login('alice@example.com', 'SuperPassword123!');
    expect(await auth.validateSession(session.sessionId)).not.toBeNull();

    await auth.logout(session.sessionId);
    expect(await auth.validateSession(session.sessionId)).toBeNull();
  });
});
