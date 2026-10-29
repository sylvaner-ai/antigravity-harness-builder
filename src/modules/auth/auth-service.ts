import crypto from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { AppDatabase, getDb, users, sessions, projects } from '../../db';

export interface UserSession {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  sessionId: string;
}

export class AuthService {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = getDb()) {
    this.db = db;
  }

  /**
   * Hachage sécurisé de mot de passe par scrypt (salt 16 octets, clé 64 octets).
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Vérification du mot de passe en temps constant.
   */
  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  /**
   * Inscription d'un nouvel utilisateur local (§10 Écran 1).
   */
  async register(email: string, password: string, role: 'USER' | 'ADMIN' = 'USER'): Promise<UserSession> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0) {
      throw new Error('Un compte existe déjà avec cette adresse email.');
    }

    const passwordHash = this.hashPassword(password);
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        role,
      })
      .returning();

    if (!newUser) {
      throw new Error("Échec de la création de l'utilisateur.");
    }

    return this.createSession(newUser.id);
  }

  /**
   * Connexion avec vérification des identifiants (§10 Écran 1).
   */
  async login(email: string, password: string): Promise<UserSession> {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await this.db.select().from(users).where(eq(users.email, normalizedEmail));
    if (!user) {
      throw new Error('Identifiants incorrects.');
    }

    const isValid = this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Identifiants incorrects.');
    }

    return this.createSession(user.id);
  }

  /**
   * Crée une session opaque de 30 jours dans la table `sessions`.
   */
  async createSession(userId: string): Promise<UserSession> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
    });

    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('Utilisateur introuvable pour la session.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };
  }

  /**
   * Valide une session active à partir de son token de cookie.
   */
  async validateSession(sessionId: string): Promise<UserSession | null> {
    if (!sessionId) return null;

    const [record] = await this.db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email,
        role: users.role,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));

    if (!record) return null;

    return {
      userId: record.userId,
      email: record.email,
      role: record.role,
      sessionId: record.sessionId,
    };
  }

  /**
   * Révocation d'une session (déconnexion).
   */
  async logout(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /**
   * Contrôle d'isolation stricte multi-utilisateurs (§14 Phase D) :
   * L'utilisateur connecté doit obligatoirement être propriétaire du projet,
   * sauf si son rôle est ADMIN.
   */
  async assertProjectOwnership(projectId: string, userId: string): Promise<void> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error('Projet introuvable.');
    }

    if (project.userId !== userId) {
      const [user] = await this.db.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Accès refusé : vous n êtes pas autorisé à accéder à ce projet.');
      }
    }
  }
}
