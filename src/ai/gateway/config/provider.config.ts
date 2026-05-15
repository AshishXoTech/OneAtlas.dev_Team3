/**
 * Configuration for API endpoints, timeouts, and specific provider rules.
 */

export const PROVIDER_CONFIG = {
  OPENAI: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  },
  ANTHROPIC: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  },
  GEMINI: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  },
  // Groq has ultra-low latency — 15s timeout is generous enough
  GROQ: {
    BASE_URL: 'https://api.groq.com/openai/v1',
    TIMEOUT_MS: 15000,
    MAX_RETRIES: 3,
  },
  DEEPSEEK: {
    BASE_URL: 'https://api.deepseek.com',
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  },
  OPENROUTER: {
    BASE_URL: 'https://openrouter.ai/api/v1',
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  },
  MISTRAL: {
    BASE_URL: 'https://api.mistral.ai/v1',
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  }
} as const;
