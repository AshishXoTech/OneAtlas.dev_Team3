/**
 * Base error class for all AI Gateway related failures.
 */
export class AIError extends Error {
  constructor(public module: string, public event: string, message: string, public meta?: any) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Thrown when a provider (OpenAI, Gemini, etc.) fails to respond or returns an error.
 */
export class ProviderError extends AIError {
  constructor(module: string, message: string, meta?: any) {
    super(module, 'PROVIDER_FAILURE', message, meta);
    this.name = 'ProviderError';
  }
}

/**
 * Thrown when a request times out before the provider can respond.
 */
export class TimeoutError extends AIError {
  constructor(module: string, message: string) {
    super(module, 'TIMEOUT', message);
    this.name = 'TimeoutError';
  }
}
