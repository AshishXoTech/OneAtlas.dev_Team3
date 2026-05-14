import OpenAI from 'openai';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';

/**
 * DeepSeek Provider using the OpenAI-compatible SDK.
 */
export class DeepSeekProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: PROVIDER_CONFIG.DEEPSEEK.BASE_URL,
      timeout: config.timeoutMs || PROVIDER_CONFIG.DEEPSEEK.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.DEEPSEEK.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.DEEPSEEK[request.modelTier || 'CAPABLE'];

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
        // DeepSeek supports JSON mode for structured outputs.
        ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
      });

      const content = completion.choices[0]?.message.content || '';

      return {
        content,
        parsedOutput: undefined, // Handled by ValidationOrchestrator
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: completion.model,
      };
    } catch (error) {
      console.error('[DeepSeekProvider] Generation failed:', error);
      throw error;
    }
  }
}
