import { LLMGatewayPort, LLMResponse, StructuredLLMRequest } from './types';

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
      throw new Error('Aucun handler mock configuré pour le MockLLMAdapter.');
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
}
