import OpenAI from 'openai';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';
import { SafeCompletionExtractor } from './safe-completion.js';

/**
 * Mistral Provider using the OpenAI-compatible SDK.
 */
export class MistralProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error("MistralProvider requires an API key.");
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: PROVIDER_CONFIG.MISTRAL.BASE_URL,
      timeout: config.timeoutMs || PROVIDER_CONFIG.MISTRAL.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.MISTRAL.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.MISTRAL[request.modelTier || 'CAPABLE'];

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
        // Mistral supports response_format: { type: 'json_object' } for structured JSON
        ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
      });

      // PRINCIPAL FIX: Use safe extractor to prevent "choices[0]" TypeErrors
      const content = SafeCompletionExtractor.extractOpenAI(completion, 'MISTRAL');

      return {
        content,
        parsedOutput: undefined,
        usage: SafeCompletionExtractor.extractUsage(completion),
        model: completion.model || model,
      };
    } catch (error) {
      console.error('[MistralProvider] Generation failed:', error);
      throw error;
    }
  }
}
