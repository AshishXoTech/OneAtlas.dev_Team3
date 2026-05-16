import { ProviderName, ModelTier } from '../config/models.config.js';

export interface RouteConfig {
  primaryProvider: ProviderName;
  fallbackProviders: ProviderName[];
  preferredTier: ModelTier;
}

/**
 * Maps task complexities or categories to optimal routing paths.
 * FAST: cheap, fast models (e.g., recovery, intent extraction)
 * CAPABLE: medium complexity (e.g., app architecture design, schema inference)
 * REASONING: highly complex logic (future use)
 */
export const ROUTING_CONFIG: Record<string, RouteConfig> = {
  RECOVERY: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'FAST',
  },

  INTENT_EXTRACTION: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },

  FEATURE_EXTRACTION: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'CAPABLE',
  },

  MUTATION_CLASSIFICATION: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },

  GRAPH_MUTATION: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'CAPABLE',
  },

  WORKFLOW_EXTRACTION: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'REASONING',
  },

  LONG_CONTEXT_ANALYSIS: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'REASONING',
  },

  NORMALIZATION_REPAIR: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },

  DEFAULT: {
    primaryProvider: 'OPENROUTER',
    fallbackProviders: ['GROQ'],
    preferredTier: 'CAPABLE',
  }
};
