/**
 * Configuration and constants for AI models across different providers.
 */

export const MODELS_CONFIG = {
  OPENAI: {
    FAST: 'gpt-4o-mini',
    CAPABLE: 'gpt-4o',
    REASONING: 'o1-preview'
  },
  ANTHROPIC: {
    FAST: 'claude-3-haiku-20240307',
    CAPABLE: 'claude-3-5-sonnet-20240620',
    REASONING: 'claude-3-opus-20240229'
  },
  GEMINI: {
    FAST: 'gemini-1.5-flash',
    CAPABLE: 'gemini-1.5-pro',
    REASONING: 'gemini-1.5-pro'
  },
  // Groq: ultra-low-latency inference via OpenAI-compatible API
  // Update model string if Groq rejects it — see https://console.groq.com/docs/models
  GROQ: {
    FAST: 'openai/gpt-oss-120b',
    CAPABLE: 'openai/gpt-oss-120b',
    REASONING: 'openai/gpt-oss-120b'
  }
} as const;

export type ProviderName = keyof typeof MODELS_CONFIG;
export type ModelTier = 'FAST' | 'CAPABLE' | 'REASONING';
