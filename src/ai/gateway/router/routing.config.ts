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
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },
  INTENT_EXTRACTION: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },
  ARCHITECTURE_DESIGN: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'CAPABLE',
  },
  GROQ_FAST: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'FAST',
  },
  DEFAULT: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENROUTER'],
    preferredTier: 'CAPABLE',
  }
};
