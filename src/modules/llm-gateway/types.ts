import { z } from 'zod';
import crypto from 'node:crypto';

export interface StructuredLLMRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T, any>;
  modelTier?: 'fast' | 'pro';
  temperature?: number;
  maxTokens?: number;
  images?: Array<{ mimeType: string; data: Uint8Array }>;
}

export interface LLMResponse<T> {
  data: T;
  rawText: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelName: string;
  cached: boolean;
}

export interface LLMGatewayPort {
  generateStructured<T>(req: StructuredLLMRequest<T>): Promise<LLMResponse<T>>;
}

/**
 * Calcul d'empreinte de cache déterministe pour éviter les requêtes LLM redondantes (§15.3).
 */
export function computeLLMCacheKey(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imagesCount: number
): string {
  const hash = crypto.createHash('sha256');
  hash.update(provider);
  hash.update(':');
  hash.update(model);
  hash.update(':');
  hash.update(systemPrompt);
  hash.update(':');
  hash.update(userPrompt);
  hash.update(`:img=${imagesCount}`);
  return hash.digest('hex');
}
