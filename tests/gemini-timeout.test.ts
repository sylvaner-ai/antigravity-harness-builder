import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import { GeminiLLMAdapter } from '../src/modules/llm-gateway/gemini-adapter';

function fakeClient(behaviour: (model: string, signal?: AbortSignal) => Promise<unknown>) {
  return {
    models: {
      generateContent: (args: { model: string; config?: { abortSignal?: AbortSignal } }) =>
        behaviour(args.model, args.config?.abortSignal),
    },
  };
}

const neverAnswers = (_model: string, signal?: AbortSignal) =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })));
  });

describe('GeminiLLMAdapter : délai maximal', () => {
  const original = process.env.GEMINI_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_TIMEOUT_MS;
    else process.env.GEMINI_TIMEOUT_MS = original;
  });

  it("échoue avec un message clair si aucun modèle ne répond", async () => {
    process.env.GEMINI_TIMEOUT_MS = '40';
    const adapter = new GeminiLLMAdapter('cle-de-test');
    (adapter as unknown as { client: unknown }).client = fakeClient(neverAnswers);
    await expect(
      adapter.generateStructured({ systemPrompt: 's', userPrompt: 'u', schema: z.object({ ok: z.boolean() }) })
    ).rejects.toThrow(/n'a pas répondu/);
  });

  it('bascule sur le modèle suivant après un délai dépassé', async () => {
    process.env.GEMINI_TIMEOUT_MS = '40';
    const adapter = new GeminiLLMAdapter('cle-de-test');
    (adapter as unknown as { client: unknown }).client = fakeClient((model, signal) =>
      model === 'gemini-3.8-flash' ? neverAnswers(model, signal) : Promise.resolve({ text: '{"ok":true}' })
    );
    const res = await adapter.generateStructured({
      systemPrompt: 's',
      userPrompt: 'u',
      schema: z.object({ ok: z.boolean() }),
    });
    expect(res.data).toEqual({ ok: true });
    expect(res.modelName).toBe('gemini-3.5-flash');
  });
});
