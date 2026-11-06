/**
 * Plafonds de consommation Gemini par génération (protection du quota et du budget).
 *  - MAX_LLM_CALLS_PER_GENERATION : nombre maximal d'appels à l'API (essais et replis compris), défaut 12.
 *  - MAX_LLM_TOKENS_PER_GENERATION : taille maximale estimée du texte envoyé, en jetons, défaut 250 000.
 */
export interface LlmLimits {
  maxCalls: number;
  maxInputTokens: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readLlmLimits(env: NodeJS.ProcessEnv = process.env): LlmLimits {
  return {
    maxCalls: positiveInt(env.MAX_LLM_CALLS_PER_GENERATION, 12),
    maxInputTokens: positiveInt(env.MAX_LLM_TOKENS_PER_GENERATION, 250_000),
  };
}

/** Estimation prudente : environ 1 jeton pour 3,5 caractères. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
