import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';
import { SafeCompletionExtractor } from './safe-completion.js';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs || PROVIDER_CONFIG.OPENAI.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.OPENAI.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.OPENAI[request.modelTier || 'CAPABLE'];
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    const completionParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    };

    // If a Zod schema is provided, use OpenAI's native Structured Outputs
    if (request.schema) {
      completionParams.response_format = zodResponseFormat(
        request.schema,
        request.schemaName || 'structured_response',
      );
    }

    try {
      const completion = await this.client.chat.completions.create(completionParams);
      
      // PRINCIPAL FIX: Use safe extractor to prevent "choices[0]" TypeErrors
      const content = SafeCompletionExtractor.extractOpenAI(completion, 'OPENAI');
      
      let parsedOutput: T | undefined;
      
      if (request.schema && content) {
        try {
          parsedOutput = request.schema.parse(JSON.parse(content));
        } catch (parseErr) {
          // If native parsing fails, we still return content so Orchestrator can recover
          console.warn('[OpenAIProvider] Native parse failed, relying on Orchestrator recovery.');
        }
      }

      return {
        content,
        parsedOutput,
        usage: SafeCompletionExtractor.extractUsage(completion),
        model: completion.model || model,
      };
    } catch (error) {
      // In production, integrate this with the ResponseRecovery or a Logger.
      console.error('[OpenAIProvider] Generation failed:', error);
      throw error;
    }
  }
}
