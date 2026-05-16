import OpenAI from 'openai';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';
import { SafeCompletionExtractor } from './safe-completion.js';

/**
 * OpenRouter Provider — uses the OpenAI-compatible SDK to access 100+ models.
 */
export class OpenRouterProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: PROVIDER_CONFIG.OPENROUTER.BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://oneatlas.dev', // Required by OpenRouter
        'X-Title': 'OneAtlas.dev',            // Required by OpenRouter
      },
      timeout: config.timeoutMs || PROVIDER_CONFIG.OPENROUTER.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.OPENROUTER.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.OPENROUTER[request.modelTier || 'CAPABLE'];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens,
        ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
      });

      // PRINCIPAL FIX: Use safe extractor to prevent "choices[0]" TypeErrors
      const content = SafeCompletionExtractor.extractOpenAI(completion, 'OPENROUTER');

      return {
        content,
        parsedOutput: undefined,
        usage: SafeCompletionExtractor.extractUsage(completion),
        model: completion.model || model,
      };
    } catch (error) {
      console.error('[OpenRouterProvider] Generation failed:', error);
      throw error;
    }
  }
}
