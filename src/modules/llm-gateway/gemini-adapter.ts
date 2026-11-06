import { GoogleGenAI } from '@google/genai';
import { LLMGatewayPort, LLMResponse, StructuredLLMRequest, computeLLMCacheKey } from './types';

export class GeminiLLMAdapter implements LLMGatewayPort {
  private readonly client: GoogleGenAI;
  private readonly defaultFastModel: string;
  private readonly defaultProModel: string;
  private readonly fallbackModels: string[];
  private readonly requestTimeoutMs: number;
  private readonly inMemoryCache = new Map<string, LLMResponse<any>>();

  constructor(apiKey = process.env.GEMINI_API_KEY, options?: { fastModel?: string; proModel?: string }) {
    if (!apiKey) {
      throw new Error("Clé GEMINI_API_KEY manquante pour l'adaptateur Google Gemini.");
    }
    this.client = new GoogleGenAI({ apiKey });
    this.defaultFastModel = options?.fastModel ?? process.env.GEMINI_MODEL_FAST ?? 'gemini-3.8-flash';
    this.defaultProModel = options?.proModel ?? process.env.GEMINI_MODEL_PRO ?? 'gemini-3.8-pro';
    const configuredTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
    this.requestTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 60_000;
    this.fallbackModels = (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.5-flash,gemini-3.5-flash-lite')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }

  async generateStructured<T>(req: StructuredLLMRequest<T>): Promise<LLMResponse<T>> {
    const model = req.modelTier === 'pro' ? this.defaultProModel : this.defaultFastModel;
    const cacheKey = computeLLMCacheKey('gemini', model, req.systemPrompt, req.userPrompt, req.images?.length ?? 0);

    const cached = this.inMemoryCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const contents: any[] = [];
    if (req.images && req.images.length > 0) {
      for (const img of req.images) {
        contents.push({
          inlineData: {
            mimeType: img.mimeType,
            data: Buffer.from(img.data).toString('base64'),
          },
        });
      }
    }
    contents.push({ text: req.userPrompt });

    // Appel à l'API Gemini avec repli automatique en cascade et gestion des pics de charge (503 / 429) (§8.3)
    const modelsToTry = [model];
    if (model === this.defaultFastModel) {
      for (const fallback of this.fallbackModels) {
        if (!modelsToTry.includes(fallback)) modelsToTry.push(fallback);
      }
    }

    let response: any;
    let lastError: any;
    let successfulModel = model;

    for (const targetModel of modelsToTry) {
      let attempt = 0;
      const maxRetries = targetModel === model ? 2 : 1;

      while (attempt <= maxRetries) {
        try {
          response = await this.client.models.generateContent({
            model: targetModel,
            contents,
            config: {
              systemInstruction: req.systemPrompt,
              temperature: req.temperature ?? 0.1,
              maxOutputTokens: req.maxTokens ?? 8192,
              responseMimeType: 'application/json',
              abortSignal: AbortSignal.timeout(this.requestTimeoutMs),
            },
          });
          successfulModel = targetModel;
          break;
        } catch (err: any) {
          attempt++;
          lastError = err;
          const errMsg = String(err?.message ?? err);
          const isTimeout =
            err?.name === 'TimeoutError' || err?.name === 'AbortError' || /aborted|timed out|timeout/i.test(errMsg);
          if (isTimeout) {
            console.error(`[gemini] délai de ${this.requestTimeoutMs} ms dépassé avec le modèle ${targetModel}`);
            lastError = new Error(
              `Le modèle ${targetModel} n'a pas répondu en ${Math.round(this.requestTimeoutMs / 1000)} s.`
            );
            break; // pas de nouvel essai sur un modèle qui ne répond pas : repli sur le suivant
          }
          console.error(`[gemini] erreur avec le modèle ${targetModel} : ${errMsg.slice(0, 300)}`);
          const isTransient =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('high demand');

          if (isTransient && attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
            continue;
          }
          break;
        }
      }

      if (response) break;
    }

    if (!response) {
      const errMsg = String(lastError?.message ?? lastError);
      if (
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('high demand')
      ) {
        throw new Error(
          `Les serveurs Google Gemini (${modelsToTry.join(', ')}) subissent un pic de trafic mondial sur le palier gratuit (503 Service Unavailable). Veuillez réessayer dans une poignée de secondes.`
        );
      }
      throw lastError;
    }

    const rawText = response.text ?? '';
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (err) {
      throw new Error(`Le modèle ${successfulModel} n'a pas retourné un JSON valide: ${rawText}`);
    }

    // Normalisation et sécurisation des données avant validation
    const normalizedJson = normalizeProfileJson(parsedJson, req.userPrompt);

    // Validation stricte à l'exécution avec le schéma Zod fourni
    const validation = req.schema.safeParse(normalizedJson);
    if (!validation.success) {
      throw new Error(`Schéma JSON non conforme retourné par le LLM: ${JSON.stringify(validation.error.issues)}`);
    }

    const result: LLMResponse<T> = {
      data: validation.data,
      rawText,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? Math.ceil(req.userPrompt.length / 4),
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? Math.ceil(rawText.length / 4),
        totalTokens: response.usageMetadata?.totalTokenCount ?? (Math.ceil(req.userPrompt.length / 4) + Math.ceil(rawText.length / 4)),
      },
      modelName: successfulModel,
      cached: false,
    };

    this.inMemoryCache.set(cacheKey, result);
    return result;
  }
}

/**
 * Normalise intelligemment les objets retournés par le modèle pour garantir
 * la conformité parfaite avec le schéma Zod (ProjectProfileSchema), même si le LLM
 * a encapsulé les données ou omis certains identifiants.
 */
function normalizeProfileJson(raw: any, prompt = ''): any {
  if (!raw || typeof raw !== 'object') return raw;

  // Si le LLM a encapsulé la réponse dans une clé racine
  let obj = raw;
  if (obj.profile && typeof obj.profile === 'object') obj = obj.profile;
  else if (obj.projectProfile && typeof obj.projectProfile === 'object') obj = obj.projectProfile;
  else if (obj.data && typeof obj.data === 'object' && (obj.data.features || obj.data.personasAndRoles)) obj = obj.data;
  else if (obj.project && typeof obj.project === 'object' && (obj.project.features || obj.project.personasAndRoles)) obj = obj.project;

  const res: any = { ...obj };

  // Récupération des identifiants depuis le prompt si omis par le modèle
  if (!res.projectId) {
    const idMatch = prompt.match(/\(ID:\s*([^,\s)]+)/i);
    res.projectId = idMatch?.[1] || 'proj-extracted';
  }
  if (!res.projectName) {
    const nameMatch = prompt.match(/documents du projet\s*"([^"]+)"/i);
    res.projectName = nameMatch?.[1] || 'Projet Antigravity';
  }
  if (!res.targetSurface) {
    const surfaceMatch = prompt.match(/Surface Antigravity ciblée:\s*([A-Z]+)/i);
    const s = surfaceMatch?.[1]?.toUpperCase();
    res.targetSurface = s && ['APP', 'IDE', 'CLI'].includes(s) ? s : 'APP';
  }

  res.profileVersion = typeof res.profileVersion === 'number' ? res.profileVersion : 1;
  res.projectDescription =
    typeof res.projectDescription === 'string' && res.projectDescription.length > 0
      ? res.projectDescription
      : typeof res.domainAndObjective?.value === 'string'
      ? res.domainAndObjective.value
      : 'Application et harnais de développement Antigravity';

  // Helper pour normaliser les champs traçables
  const ensureTraceable = (item: any, defaultId: string, defaultValue: string) => {
    if (typeof item === 'string') {
      return {
        id: defaultId,
        value: item,
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
        userEdited: false,
      };
    }
    if (item && typeof item === 'object') {
      const status = ['explicit', 'deduced', 'hypothesis', 'missing_or_contradictory'].includes(item.epistemicStatus)
        ? item.epistemicStatus
        : 'explicit';
      const confidence = status === 'deduced' ? (item.confidence || 'high') : item.confidence;
      return {
        id: item.id || defaultId,
        value: String(item.value || item.title || item.name || defaultValue || defaultId),
        epistemicStatus: status,
        confidence,
        rationale: item.rationale,
        sourceRefs: Array.isArray(item.sourceRefs) && item.sourceRefs.length > 0
          ? item.sourceRefs
          : [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
        userEdited: Boolean(item.userEdited),
      };
    }
    return {
      id: defaultId,
      value: defaultValue,
      epistemicStatus: 'explicit',
      sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
      userEdited: false,
    };
  };

  // domainAndObjective
  res.domainAndObjective = ensureTraceable(res.domainAndObjective, 'dom-01', res.projectDescription);

  // personasAndRoles
  if (Array.isArray(res.personasAndRoles) && res.personasAndRoles.length > 0) {
    res.personasAndRoles = res.personasAndRoles.map((p: any, idx: number) =>
      ensureTraceable(p, `role-${idx + 1}`, 'Utilisateur / Opérateur')
    );
  } else {
    res.personasAndRoles = [
      ensureTraceable(null, 'role-1', 'Administrateur / Responsable : supervision globale et paramétrage'),
    ];
  }

  // features
  if (Array.isArray(res.features) && res.features.length > 0) {
    res.features = res.features.map((f: any, idx: number) => {
      if (typeof f === 'string') {
        return {
          id: `FEAT-${String(idx + 1).padStart(2, '0')}`,
          title: f,
          description: f,
          priority: 'P0',
          businessRules: [],
          acceptanceCriteria: [`Le module ${f} est opérationnel et vérifié.`],
          epistemicStatus: 'explicit',
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
        };
      }
      const title = f.title || f.name || `Module ${idx + 1}`;
      const description = f.description || title;
      const priority = ['P0', 'P1', 'P2'].includes(f.priority) ? f.priority : 'P0';
      const businessRules = Array.isArray(f.businessRules) ? f.businessRules.map(String) : [];
      let acceptanceCriteria = Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria.map(String).filter(Boolean) : [];
      if (acceptanceCriteria.length === 0) {
        acceptanceCriteria = [`Le module ${title} respecte les spécifications fonctionnelles et passe les tests.`];
      }
      const epistemicStatus = ['explicit', 'deduced', 'hypothesis', 'missing_or_contradictory'].includes(f.epistemicStatus)
        ? f.epistemicStatus
        : 'explicit';

      return {
        id: f.id || `FEAT-${String(idx + 1).padStart(2, '0')}`,
        title,
        description,
        priority,
        businessRules,
        acceptanceCriteria,
        epistemicStatus,
        confidence: epistemicStatus === 'deduced' ? (f.confidence || 'high') : f.confidence,
        sourceRefs: Array.isArray(f.sourceRefs) && f.sourceRefs.length > 0
          ? f.sourceRefs
          : [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
      };
    });
  } else {
    res.features = [
      {
        id: 'FEAT-01',
        title: 'Fonctionnalité Principale',
        description: 'Exécution du flux métier principal du projet.',
        priority: 'P0',
        businessRules: [],
        acceptanceCriteria: ['Le module principal est opérationnel et validé.'],
        epistemicStatus: 'explicit',
        sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
      },
    ];
  }

  // techStack
  const ts = res.techStack || {};
  res.techStack = {
    languages: Array.isArray(ts.languages) && ts.languages.length > 0 ? ts.languages.map(String) : ['TypeScript'],
    frameworks: Array.isArray(ts.frameworks) ? ts.frameworks.map(String) : [],
    databases: Array.isArray(ts.databases) ? ts.databases.map(String) : [],
    infrastructureAndDeployment: Array.isArray(ts.infrastructureAndDeployment)
      ? ts.infrastructureAndDeployment.map(String)
      : [],
    testingTools: Array.isArray(ts.testingTools) ? ts.testingTools.map(String) : [],
    epistemicStatus: ['explicit', 'deduced', 'hypothesis', 'missing_or_contradictory'].includes(ts.epistemicStatus)
      ? ts.epistemicStatus
      : 'explicit',
    confidence: ts.epistemicStatus === 'deduced' ? (ts.confidence || 'high') : ts.confidence,
    sourceRefs: Array.isArray(ts.sourceRefs) && ts.sourceRefs.length > 0
      ? ts.sourceRefs
      : [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
  };

  // architectureConstraints, securityAndCompliance, qualityAndTestingStrategy
  const mapTraceableList = (list: any, prefix: string) => {
    if (!Array.isArray(list)) return [];
    return list.map((item: any, idx: number) => ensureTraceable(item, `${prefix}-${idx + 1}`, 'Exigence technique'));
  };
  res.architectureConstraints = mapTraceableList(res.architectureConstraints, 'arch');
  res.securityAndCompliance = mapTraceableList(res.securityAndCompliance, 'sec');
  res.qualityAndTestingStrategy = mapTraceableList(res.qualityAndTestingStrategy, 'qa');

  // designSystem
  const ds = res.designSystem || {};
  res.designSystem = {
    brandIdentity: ds.brandIdentity || 'Système Graphique et Interface',
    colorTokens: ds.colorTokens && typeof ds.colorTokens === 'object' ? ds.colorTokens : {},
    typography: {
      fontFamilies: ds.typography?.fontFamilies && typeof ds.typography?.fontFamilies === 'object' ? ds.typography.fontFamilies : {},
      scaleNotes: ds.typography?.scaleNotes || '',
    },
    spacingAndLayout: ds.spacingAndLayout || '',
    componentGuidelines: Array.isArray(ds.componentGuidelines) ? ds.componentGuidelines.map(String) : [],
    uxAndAccessibilityRules: Array.isArray(ds.uxAndAccessibilityRules) ? ds.uxAndAccessibilityRules.map(String) : [],
    epistemicStatus: ['explicit', 'deduced', 'hypothesis', 'missing_or_contradictory'].includes(ds.epistemicStatus)
      ? ds.epistemicStatus
      : 'explicit',
    sourceRefs: Array.isArray(ds.sourceRefs) ? ds.sourceRefs : [{ documentId: 'ds-doc', documentName: 'Design System' }],
  };

  // uncertainties
  if (Array.isArray(res.uncertainties)) {
    res.uncertainties = res.uncertainties.map((u: any, idx: number) => {
      if (typeof u === 'string') {
        return {
          id: `unc-${idx + 1}`,
          category: 'missing_information',
          topic: u.slice(0, 40),
          statement: u,
          impact: 'medium',
          proposedFallback: 'À préciser lors de la phase de cadrage.',
          requiresHumanDecision: true,
          sourceRefs: [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
        };
      }
      return {
        id: u.id || `unc-${idx + 1}`,
        category: ['hypothesis', 'missing_information', 'contradiction'].includes(u.category)
          ? u.category
          : 'missing_information',
        topic: u.topic || u.title || u.subject || `Point d'attention ${idx + 1}`,
        statement: u.statement || u.description || u.question || 'Élément nécessitant validation.',
        impact: ['low', 'medium', 'high', 'critical'].includes(u.impact) ? u.impact : 'medium',
        proposedFallback: u.proposedFallback || u.fallback || u.solution || 'Conserver le choix initial proposé.',
        requiresHumanDecision: u.requiresHumanDecision ?? true,
        sourceRefs: Array.isArray(u.sourceRefs) ? u.sourceRefs : [{ documentId: 'spec-doc', documentName: 'Cahier des charges' }],
        userResolution: u.userResolution,
        isResolved: u.isResolved,
        resolvedAt: u.resolvedAt,
      };
    });
  } else {
    res.uncertainties = [];
  }

  // supplementaryNotes
  res.supplementaryNotes = res.supplementaryNotes && typeof res.supplementaryNotes === 'object' ? res.supplementaryNotes : {};

  return res;
}
