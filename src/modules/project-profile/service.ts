import { eq } from 'drizzle-orm';
import { AppDatabase, getDb, projectProfiles } from '../../db';
import { LLMGatewayPort } from '../llm-gateway';
import { ProjectProfile, ProjectProfileSchema } from './schema';
import { AntigravitySurface } from '../antigravity-adapter/schema';
import { computeSha256 } from '../package-exporter/exporter';
import { AuditExtractionOptions, extractProfileFromAuditReport } from './audit-extractor';

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
   - 'deduced' : interprétation technique de ta part (tu DOIS obligatoirement fournir un champ 'confidence': 'high' | 'medium' | 'low' et une justification 'rationale').
   - 'hypothesis' : choix provisoire proposé à valider par l'utilisateur.
   - 'missing_or_contradictory' : information manquante ou contradiction constatée.
2. Identifie explicitement toutes les incertitudes, contradictions ou informations manquantes dans le tableau 'uncertainties'.
3. Ne simplifie pas et n'invente rien silencieusement.
4. Réponds STRICTEMENT en JSON conforme à la structure suivante (sans texte superflu) :

{
  "projectId": "${input.projectId}",
  "projectName": "${input.projectName}",
  "projectDescription": "Synthèse globale du projet et de ses objectifs en 2-3 phrases.",
  "targetSurface": "${input.targetSurface}",
  "profileVersion": 1,
  "domainAndObjective": {
    "id": "dom-01",
    "value": "Description précise du domaine métier et des objectifs.",
    "epistemicStatus": "explicit",
    "sourceRefs": [{"documentId": "spec-doc", "documentName": "Cahier des charges", "location": "Section Contexte"}]
  },
  "personasAndRoles": [
    {
      "id": "role-1",
      "value": "Nom du Rôle / Persona : responsabilités clés et permissions",
      "epistemicStatus": "explicit",
      "sourceRefs": [{"documentId": "spec-doc", "documentName": "Cahier des charges"}]
    }
  ],
  "features": [
    {
      "id": "FEAT-01",
      "title": "Titre du Module / Fonctionnalité",
      "description": "Description fonctionnelle détaillée.",
      "priority": "P0",
      "businessRules": ["Règle de gestion 1", "Règle de gestion 2"],
      "acceptanceCriteria": ["Critère d'acceptation 1", "Critère d'acceptation 2"],
      "epistemicStatus": "explicit",
      "sourceRefs": [{"documentId": "spec-doc", "documentName": "Cahier des charges"}]
    }
  ],
  "techStack": {
    "languages": ["TypeScript", "SQL"],
    "frameworks": ["Next.js", "React", "Tailwind CSS"],
    "databases": ["PostgreSQL"],
    "infrastructureAndDeployment": ["Docker"],
    "testingTools": ["Vitest"],
    "epistemicStatus": "explicit",
    "sourceRefs": [{"documentId": "spec-doc", "documentName": "Cahier des charges"}]
  },
  "architectureConstraints": [
    {
      "id": "arch-1",
      "value": "Contrainte d'architecture (ex: monolithe modulaire, API REST)",
      "epistemicStatus": "explicit"
    }
  ],
  "securityAndCompliance": [
    {
      "id": "sec-1",
      "value": "Exigence de sécurité et conformité (ex: RBAC, chiffrement)",
      "epistemicStatus": "explicit"
    }
  ],
  "qualityAndTestingStrategy": [
    {
      "id": "qa-1",
      "value": "Exigence de test ou qualité",
      "epistemicStatus": "explicit"
    }
  ],
  "designSystem": {
    "brandIdentity": "Nom ou ambiance visuelle du Design System",
    "colorTokens": {
      "primary": "#...",
      "canvas": "#...",
      "ink": "#..."
    },
    "typography": {
      "fontFamilies": {
        "body": "Inter, sans-serif",
        "display": "Inter, sans-serif"
      },
      "scaleNotes": "Notes d'échelle typographique"
    },
    "spacingAndLayout": "Grille et espacements",
    "componentGuidelines": ["Directive de composants"],
    "uxAndAccessibilityRules": ["Directive d'accessibilité"],
    "epistemicStatus": "explicit"
  },
  "uncertainties": [
    {
      "id": "unc-1",
      "category": "missing_information",
      "topic": "Sujet de l'incertitude",
      "statement": "Description détaillée de l'information manquante ou de la contradiction",
      "impact": "medium",
      "proposedFallback": "Proposition de solution ou d'arbitrage par défaut",
      "requiresHumanDecision": true
    }
  ],
  "supplementaryNotes": {}
}`;

    const userPrompt = `Voici les documents du projet "${input.projectName}" (ID: ${input.projectId}, Surface Antigravity ciblée: ${input.targetSurface}) :

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

    // Calcul de la version incrémentale pour garantir que la nouvelle extraction devient la version active
    const existingProfiles = await this.db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, input.projectId));
    const nextVersion = existingProfiles.length + 1;

    // Sauvegarde en base de données comme DRAFT_EXTRACTED
    await this.db.insert(projectProfiles).values({
      projectId: input.projectId,
      version: nextVersion,
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
      .orderBy(projectProfiles.createdAt);

    const latest = records[records.length - 1];
    return latest ? latest.profileData : null;
  }

  /**
   * Ingère directement un rapport d'audit pour créer ou mettre à jour le profil
   * du projet en mode mise à niveau.
   */
  async ingestAuditReport(options: AuditExtractionOptions): Promise<ProjectProfile> {
    const profile = extractProfileFromAuditReport(options);
    const validated = ProjectProfileSchema.parse(profile);
    const profileSha256 = computeSha256(JSON.stringify(validated));

    const existingProfiles = await this.db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, options.projectId));
    const nextVersion = existingProfiles.length + 1;

    await this.db.insert(projectProfiles).values({
      projectId: options.projectId,
      version: nextVersion,
      status: 'DRAFT_EXTRACTED',
      profileData: validated,
      userNotes: { source: 'antigravity-audit.json' },
      profileSha256,
    });

    return validated;
  }
}
