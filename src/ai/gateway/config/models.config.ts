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
    CAPABLE: 'claude-3-5-sonnet-20241022',
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
    FAST: 'llama-3.3-70b-versatile',
    CAPABLE: 'openai/gpt-oss-120b',
    REASONING: 'openai/gpt-oss-120b'
  },
  DEEPSEEK: {
    FAST: 'deepseek-v4-flash',
    CAPABLE: 'deepseek-v4-pro',
    REASONING: 'deepseek-v4-pro'
  },
  OPENROUTER: {
    FAST: 'google/gemini-2.0-flash-001',
    CAPABLE: 'anthropic/claude-haiku-4.5',
    REASONING: 'openai/gpt-oss-120b:free'
  }
} as const;

export type ProviderName = keyof typeof MODELS_CONFIG;
export type ModelTier = 'FAST' | 'CAPABLE' | 'REASONING';
