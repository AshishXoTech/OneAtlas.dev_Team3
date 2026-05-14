import { ProviderConfig, AIRequest, AIResponse } from '../types/gateway.types.js';

/**
 * Abstract Base Provider defining the standard contract for all AI providers.
 * All providers (OpenAI, Claude, Gemini) must implement this.
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Generates text or structured output based on the provided request.
   */
  abstract generate<T>(request: AIRequest<T>): Promise<AIResponse<T>>;
}
