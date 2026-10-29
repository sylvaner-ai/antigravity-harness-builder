import { LLMGatewayPort, LLMResponse, StructuredLLMRequest } from './types';
import { extractHeuristicProjectProfile } from '../project-profile/heuristic-extractor';
import { AntigravitySurface } from '../antigravity-adapter/schema';

export class MockLLMAdapter implements LLMGatewayPort {
  private customHandler?: (req: StructuredLLMRequest<any>) => any;
  public callCount = 0;

  constructor(customHandler?: (req: StructuredLLMRequest<any>) => any) {
    this.customHandler = customHandler;
  }

  setHandler(handler: (req: StructuredLLMRequest<any>) => any) {
    this.customHandler = handler;
  }

  async generateStructured<T>(req: StructuredLLMRequest<T>): Promise<LLMResponse<T>> {
    this.callCount += 1;

    let generatedData: any;
    if (this.customHandler) {
      generatedData = this.customHandler(req);
    } else {
      // Analyse heuristique et intelligente des documents lorsque aucun handler de test n'est fourni
      generatedData = this.extractSmartDefaultMock(req);
    }

    const validation = req.schema.safeParse(generatedData);
    if (!validation.success) {
      throw new Error(`Données mock non conformes au schéma Zod: ${JSON.stringify(validation.error.issues)}`);
    }

    const rawText = JSON.stringify(validation.data);
    return {
      data: validation.data,
      rawText,
      usage: {
        promptTokens: Math.ceil(req.userPrompt.length / 4),
        completionTokens: Math.ceil(rawText.length / 4),
        totalTokens: Math.ceil(req.userPrompt.length / 4) + Math.ceil(rawText.length / 4),
      },
      modelName: req.modelTier === 'pro' ? 'mock-pro' : 'mock-fast',
      cached: false,
    };
  }

  private extractSmartDefaultMock(req: StructuredLLMRequest<any>): any {
    const prompt = req.userPrompt || '';

    // Détection de l'ID du projet
    const idMatch = prompt.match(/\(ID:\s*([^,\s)]+)/i);
    const projectId = idMatch?.[1] ?? 'proj-auto-extracted';

    // Détection du nom du projet
    const nameMatch = prompt.match(/documents du projet\s*"([^"]+)"/i);
    const projectName = nameMatch?.[1] ?? 'Projet Antigravity';

    // Détection de la surface cible
    let targetSurface: AntigravitySurface = 'APP';
    const surfaceMatch = prompt.match(/Surface Antigravity ciblée:\s*([A-Z]+)/i);
    const matchedSurface = surfaceMatch?.[1]?.toUpperCase();
    if (matchedSurface && ['APP', 'IDE', 'CLI'].includes(matchedSurface)) {
      targetSurface = matchedSurface as AntigravitySurface;
    }

    // Extraction du cahier des charges
    const specStartTag = '--- DEBUT CAHIER DES CHARGES ---';
    const specEndTag = '--- FIN CAHIER DES CHARGES ---';
    let specText = '';
    const specStartIndex = prompt.indexOf(specStartTag);
    const specEndIndex = prompt.indexOf(specEndTag);
    if (specStartIndex !== -1 && specEndIndex !== -1) {
      specText = prompt.substring(specStartIndex + specStartTag.length, specEndIndex).trim();
    } else {
      specText = prompt;
    }

    // Extraction du design system
    const dsStartTag = '--- DEBUT DESIGN SYSTEM ---';
    const dsEndTag = '--- FIN DESIGN SYSTEM ---';
    let designSystemText = '';
    const dsStartIndex = prompt.indexOf(dsStartTag);
    const dsEndIndex = prompt.indexOf(dsEndTag);
    if (dsStartIndex !== -1 && dsEndIndex !== -1) {
      designSystemText = prompt.substring(dsStartIndex + dsStartTag.length, dsEndIndex).trim();
    }

    // Extraction des notes complémentaires
    let notes: Record<string, string> = {};
    const notesTag = 'Notes complémentaires fournies par l\'utilisateur :';
    const notesIndex = prompt.indexOf(notesTag);
    if (notesIndex !== -1) {
      const jsonCandidate = prompt.substring(notesIndex + notesTag.length).trim();
      try {
        const braceStart = jsonCandidate.indexOf('{');
        const braceEnd = jsonCandidate.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd !== -1) {
          notes = JSON.parse(jsonCandidate.substring(braceStart, braceEnd + 1));
        }
      } catch {
        notes = {};
      }
    }

    return extractHeuristicProjectProfile({
      projectId,
      projectName,
      targetSurface,
      specText,
      designSystemText,
      supplementaryNotes: notes,
    });
  }
}
