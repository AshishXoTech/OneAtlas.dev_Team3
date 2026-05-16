import OpenAI from 'openai';
import { BaseProvider } from './base.provider.js';
import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';
import { MODELS_CONFIG } from '../config/models.config.js';
import { PROVIDER_CONFIG } from '../config/provider.config.js';
import { SafeCompletionExtractor } from './safe-completion.js';

/**
 * Groq Provider — uses the OpenAI-compatible SDK pointed at Groq's inference API.
 * Groq delivers ultra-low latency inference (often 10-20x faster than OpenAI).
 *
 * KEY DESIGN DECISION:
 * Groq does NOT support OpenAI-style Structured Outputs schema enforcement.
 * We use JSON mode and deliberately do NOT call schema.parse() inside generate().
 * Instead, we always return raw content so the ValidationOrchestrator
 * owns the parse → validate → recover flow completely.
 * This is critical: if we throw here, the Recovery pipeline never gets a chance to run.
 */
export class GroqProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: PROVIDER_CONFIG.GROQ.BASE_URL,
      timeout: config.timeoutMs ?? PROVIDER_CONFIG.GROQ.TIMEOUT_MS,
      maxRetries: config.maxRetries ?? PROVIDER_CONFIG.GROQ.MAX_RETRIES,
    });
  }

  async generate<T>(request: AIRequest<T>): Promise<AIResponse<T>> {
    const model = MODELS_CONFIG.GROQ[request.modelTier || 'CAPABLE'];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
      // Groq JSON mode: instructs model to output JSON, but does NOT enforce schema shape.
      // Shape validation + recovery happens in ValidationOrchestrator.
      ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
    });

    // PRINCIPAL FIX: Use safe extractor to prevent "choices[0]" TypeErrors
    const content = SafeCompletionExtractor.extractOpenAI(completion, 'GROQ');

    // Intentionally return raw content without parsing.
    // ValidationOrchestrator calls schema.parse() and triggers recovery on failures.
    return {
      content,
      parsedOutput: undefined,
      usage: SafeCompletionExtractor.extractUsage(completion),
      model: completion.model || model,
    };
  }
}
