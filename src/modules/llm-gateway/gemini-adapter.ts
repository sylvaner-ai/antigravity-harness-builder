import { GoogleGenAI } from '@google/genai';
import { LLMGatewayPort, LLMResponse, StructuredLLMRequest, computeLLMCacheKey } from './types';

export class GeminiLLMAdapter implements LLMGatewayPort {
  private readonly client: GoogleGenAI;
  private readonly defaultFastModel: string;
  private readonly defaultProModel: string;
  private readonly inMemoryCache = new Map<string, LLMResponse<any>>();

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) {
      throw new Error("Clé GEMINI_API_KEY manquante pour l'adaptateur Google Gemini.");
    }
    this.client = new GoogleGenAI({ apiKey });
    this.defaultFastModel = process.env.GEMINI_MODEL_FAST ?? 'gemini-2.5-flash';
    this.defaultProModel = process.env.GEMINI_MODEL_PRO ?? 'gemini-2.5-pro';
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

    // Appel à l'API Gemini
    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: req.systemPrompt,
        temperature: req.temperature ?? 0.1,
        maxOutputTokens: req.maxTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text ?? '';
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (err) {
      throw new Error(`Le modèle ${model} n'a pas retourné un JSON valide: ${rawText}`);
    }

    // Validation stricte à l'exécution avec le schéma Zod fourni
    const validation = req.schema.safeParse(parsedJson);
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
      modelName: model,
      cached: false,
    };

    this.inMemoryCache.set(cacheKey, result);
    return result;
  }
}
