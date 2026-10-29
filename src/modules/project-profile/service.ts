import { eq } from 'drizzle-orm';
import { AppDatabase, getDb, projectProfiles } from '../../db';
import { LLMGatewayPort } from '../llm-gateway';
import { ProjectProfile, ProjectProfileSchema } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';
import { computeSha256 } from '../package-exporter/exporter';

export interface ProfileExtractionInput {
  projectId: string;
  projectName: string;
  targetSurface: AntigravitySurface;
  specDocumentText: string;
  designSystemDocumentText: string;
  supplementaryNotes?: Record<string, string>;
  images?: Array<{ mimeType: string; data: Uint8Array }>;
}

export class ProjectProfileService {
  private readonly db: AppDatabase;
  private readonly llm: LLMGatewayPort;

  constructor(db: AppDatabase = getDb(), llm: LLMGatewayPort) {
    this.db = db;
    this.llm = llm;
  }

  /**
   * Analyse les documents sources à l'aide du LLM pour extraire un profil de projet fortement structuré (§3.3 & §7 FR-03).
   * Chaque champ est obligatoirement classifié (explicit, deduced avec confiance, hypothesis, missing_or_contradictory).
   */
  async extractProfileFromDocuments(input: ProfileExtractionInput): Promise<ProjectProfile> {
    const systemPrompt = `Tu es un architecte logiciel senior et expert en cadrage technique.
Ta mission est d'analyser le cahier des charges et le design system d'un projet pour produire un profil de projet structuré et normalisé.
Tu dois respecter SCRUPULEUSEMENT les règles suivantes (§3.3 du cahier des charges) :
1. Catégorise chaque information :
   - 'explicit' : information clairement écrite dans les documents fournis.
   - 'deduced' : interprétation technique de ta part (tu DOIS obligatoirement fournir un champ 'confidence': 'high' | 'medium' | 'low').
   - 'hypothesis' : choix provisoire proposé à valider par l'utilisateur.
   - 'missing_or_contradictory' : information manquante ou contradiction constatée.
2. Identifie explicitement toutes les incertitudes, contradictions ou informations manquantes dans le tableau 'uncertainties'.
3. Ne simplifie pas et n'invente rien silencieusement.
4. Réponds STRICTEMENT en JSON conforme au schéma demandé.`;

    const userPrompt = `Voici les documents du projet "${input.projectName}" (Surface Antigravity ciblée: ${input.targetSurface}) :

--- DEBUT CAHIER DES CHARGES ---
${input.specDocumentText}
--- FIN CAHIER DES CHARGES ---

--- DEBUT DESIGN SYSTEM ---
${input.designSystemDocumentText}
--- FIN DESIGN SYSTEM ---

Notes complémentaires fournies par l'utilisateur :
${JSON.stringify(input.supplementaryNotes ?? {}, null, 2)}

Produis le profil complet en JSON conforme au schéma.`;

    const llmRes = await this.llm.generateStructured({
      systemPrompt,
      userPrompt,
      schema: ProjectProfileSchema,
      modelTier: 'fast',
      images: input.images,
    });

    const profileData = llmRes.data;
    const profileSha256 = computeSha256(JSON.stringify(profileData));

    // Sauvegarde en base de données comme DRAFT_EXTRACTED
    await this.db.insert(projectProfiles).values({
      projectId: input.projectId,
      version: 1,
      status: 'DRAFT_EXTRACTED',
      profileData,
      userNotes: input.supplementaryNotes ?? {},
      profileSha256,
    });

    return profileData;
  }

  /**
   * Permet à l'utilisateur d'éditer et de confirmer le profil extrait avant toute composition de harnais (§3.3 & §11.1).
   */
  async confirmUserProfile(
    projectId: string,
    confirmedProfile: ProjectProfile,
    userNotes?: Record<string, string>
  ): Promise<ProjectProfile> {
    const validated = ProjectProfileSchema.parse(confirmedProfile);
    const profileSha256 = computeSha256(JSON.stringify(validated));

    // Incrémente la version du profil
    const existingProfiles = await this.db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId));
    const nextVersion = existingProfiles.length + 1;

    await this.db.insert(projectProfiles).values({
      projectId,
      version: nextVersion,
      status: 'USER_CONFIRMED',
      profileData: validated,
      userNotes: userNotes ?? {},
      profileSha256,
      confirmedAt: new Date(),
    });

    return validated;
  }

  async getLatestProfile(projectId: string): Promise<ProjectProfile | null> {
    const records = await this.db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .orderBy(projectProfiles.version);

    const latest = records[records.length - 1];
    return latest ? latest.profileData : null;
  }
}
