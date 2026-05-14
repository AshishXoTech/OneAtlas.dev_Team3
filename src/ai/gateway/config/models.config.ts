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
    FAST: 'llama-3.1-8b-instant',
    CAPABLE: 'llama-3.3-70b-versatile',
    REASONING: 'llama-3.3-70b-versatile'
  },
  DEEPSEEK: {
    FAST: 'deepseek-chat',
    CAPABLE: 'deepseek-chat',
    REASONING: 'deepseek-coder'
  },
  OPENROUTER: {
    FAST: 'google/gemini-2.0-flash-001',
    CAPABLE: 'anthropic/claude-3.5-sonnet',
    REASONING: 'openai/gpt-4o-2024-11-20'
  }
} as const;

export type ProviderName = keyof typeof MODELS_CONFIG;
export type ModelTier = 'FAST' | 'CAPABLE' | 'REASONING';
