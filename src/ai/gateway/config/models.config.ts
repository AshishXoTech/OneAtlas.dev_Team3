/**
 * Central AI model registry for OneAtlas.dev
 *
 * Philosophy:
 * - FAST       → low latency / cheap inference
 * - CAPABLE    → balanced reasoning + generation
 * - REASONING  → deep planning / architecture / workflows
 *
 * Used by:
 * - AI Gateway
 * - Model Router
 * - Cost Optimizer
 * - Retry/Fallback Orchestrator
 */

export const MODELS_CONFIG = {
  OPENAI: {
    FAST: 'gpt-5.4-mini',
    CAPABLE: 'gpt-5.5',
    REASONING: 'gpt-5.5'
  },

  ANTHROPIC: {
    FAST: 'claude-haiku-4-5',
    CAPABLE: 'claude-sonnet-4-6',
    REASONING: 'claude-opus-4-7'
  },

  GEMINI: {
    FAST: 'gemini-2.5-flash',
    CAPABLE: 'gemini-2.5-pro',
    REASONING: 'gemini-2.5-pro'
  },

  GROQ: {
    FAST: 'meta-llama/llama-4-scout-17b-16e-instruct',
    CAPABLE: 'llama-3.3-70b-versatile',
    REASONING: 'openai/gpt-oss-120b'
  },

  MISTRAL: {
    FAST: 'mistral-small-latest',
    CAPABLE: 'mistral-large-latest',
    REASONING: 'mistral-large-latest'
  },

  DEEPSEEK: {
    FAST: 'deepseek-v4-flash',
    CAPABLE: 'deepseek-v4-flash',
    REASONING: 'deepseek-v4-pro'
  },

  OPENROUTER: {
    FAST: 'deepseek/deepseek-chat-v3-0324',
    CAPABLE: 'google/gemma-4-31b-it:free',
    REASONING: 'deepseek/deepseek-v4-flash:free'
  }
} as const;

export type ProviderName = keyof typeof MODELS_CONFIG;

export type ModelTier =
  | 'FAST'
  | 'CAPABLE'
  | 'REASONING';

export interface ModelCapabilities {
  supportsVision?: boolean;
  supportsStructuredOutputs?: boolean;
  supportsToolCalling?: boolean;
  supportsReasoning?: boolean;
  maxContextWindow?: number;
}

/**
 * Optional future extension:
 * per-model metadata registry
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'gpt-5.5': {
    supportsVision: true,
    supportsStructuredOutputs: true,
    supportsToolCalling: true,
    supportsReasoning: true,
    maxContextWindow: 1_000_000
  },

  'claude-sonnet-4-6': {
    supportsVision: true,
    supportsStructuredOutputs: true,
    supportsToolCalling: true,
    supportsReasoning: true,
    maxContextWindow: 1_000_000
  },

  'gemini-2.5-pro': {
    supportsVision: true,
    supportsStructuredOutputs: true,
    supportsToolCalling: true,
    supportsReasoning: true,
    maxContextWindow: 1_000_000
  }
};