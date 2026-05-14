import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';

/**
 * Claude Provider using the official @anthropic-ai/sdk.
 */
export class ClaudeProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs || PROVIDER_CONFIG.ANTHROPIC.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.ANTHROPIC.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.ANTHROPIC[request.modelTier || 'CAPABLE'];

    // Claude 3 handles JSON best when instructed in the prompt.
    // Note: Anthropic does not yet have a native 'json_mode' or 'response_format: json'
    // in the same way OpenAI does, so we rely on prompt engineering + ValidationOrchestrator.
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: request.prompt }
    ];

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 4096,
        system: request.systemPrompt,
        messages,
        temperature: request.temperature ?? 0.2,
      });

      // Anthropic response content is an array of blocks
      const contentBlock = response.content[0];
      const content = contentBlock && 'text' in contentBlock ? contentBlock.text : '';

      return {
        content,
        parsedOutput: undefined, // Handled by ValidationOrchestrator
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      console.error('[ClaudeProvider] Generation failed:', error);
      throw error;
    }
  }
}
