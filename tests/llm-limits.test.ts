import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import { GeminiLLMAdapter } from '../src/modules/llm-gateway/gemini-adapter';
import { estimateTokens, readLlmLimits } from '../src/modules/llm-gateway/limits';

const schema = z.object({ ok: z.boolean() });

function adapterWithClient(generate: () => Promise<unknown>) {
  const adapter = new GeminiLLMAdapter('cle-de-test');
  const calls = { count: 0 };
  (adapter as unknown as { client: unknown }).client = {
    models: {
      generateContent: () => {
        calls.count++;
        return generate();
      },
    },
  };
  return { adapter, calls };
}

describe('plafonds LLM', () => {
  const saved = {
    calls: process.env.MAX_LLM_CALLS_PER_GENERATION,
    tokens: process.env.MAX_LLM_TOKENS_PER_GENERATION,
  };
  afterEach(() => {
    for (const [key, value] of [
      ['MAX_LLM_CALLS_PER_GENERATION', saved.calls],
      ['MAX_LLM_TOKENS_PER_GENERATION', saved.tokens],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('lit les plafonds avec des valeurs par défaut sûres', () => {
    expect(readLlmLimits({} as NodeJS.ProcessEnv)).toEqual({ maxCalls: 12, maxInputTokens: 250_000 });
    expect(
      readLlmLimits({ MAX_LLM_CALLS_PER_GENERATION: '3', MAX_LLM_TOKENS_PER_GENERATION: '1000' } as unknown as NodeJS.ProcessEnv)
    ).toEqual({ maxCalls: 3, maxInputTokens: 1000 });
    expect(
      readLlmLimits({ MAX_LLM_CALLS_PER_GENERATION: 'abc', MAX_LLM_TOKENS_PER_GENERATION: '-5' } as unknown as NodeJS.ProcessEnv)
    ).toEqual({ maxCalls: 12, maxInputTokens: 250_000 });
  });

  it('refuse un texte trop volumineux avant tout appel', async () => {
    process.env.MAX_LLM_TOKENS_PER_GENERATION = '10';
    const { adapter, calls } = adapterWithClient(async () => ({ text: '{"ok":true}' }));
    const prompt = 'x'.repeat(1000);
    expect(estimateTokens(prompt)).toBeGreaterThan(10);
    await expect(adapter.generateStructured({ systemPrompt: 's', userPrompt: prompt, schema })).rejects.toThrow(
      /trop volumineux/
    );
    expect(calls.count).toBe(0);
  });

  it("s'arrête au plafond d'appels, repli compris", async () => {
    process.env.MAX_LLM_CALLS_PER_GENERATION = '2';
    const { adapter, calls } = adapterWithClient(async () => {
      throw new Error('panne non transitoire');
    });
    await expect(adapter.generateStructured({ systemPrompt: 's', userPrompt: 'u', schema })).rejects.toThrow(
      /Plafond de 2 appels/
    );
    expect(calls.count).toBe(2);
  });

  it('ne gêne pas une génération normale', async () => {
    const { adapter, calls } = adapterWithClient(async () => ({ text: '{"ok":true}' }));
    const res = await adapter.generateStructured({ systemPrompt: 's', userPrompt: 'u', schema });
    expect(res.data).toEqual({ ok: true });
    expect(calls.count).toBe(1);
  });
});
