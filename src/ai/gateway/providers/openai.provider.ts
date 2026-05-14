import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';

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
      
      const choice = completion.choices[0];
      const content = choice.message.content || '';
      
      let parsedOutput: T | undefined;
      
      if (request.schema && content) {
        // The API strictly adheres to the schema in structured output mode,
        // but parsing it through Zod provides strong runtime typing and validation guarantees.
        parsedOutput = request.schema.parse(JSON.parse(content));
      }

      return {
        content,
        parsedOutput,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: completion.model,
      };
    } catch (error) {
      // In production, integrate this with the ResponseRecovery or a Logger.
      console.error('[OpenAIProvider] Generation failed:', error);
      throw error;
    }
  }
}
