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
    primaryProvider: 'GROQ',       // Groq's speed makes it ideal for repair retries
    fallbackProviders: ['OPENAI'],
    preferredTier: 'FAST',
  },
  INTENT_EXTRACTION: {
    primaryProvider: 'GROQ',       // Lightweight task — Groq wins on latency
    fallbackProviders: ['OPENAI'],
    preferredTier: 'FAST',
  },
  ARCHITECTURE_DESIGN: {
    primaryProvider: 'OPENAI',     // Deep reasoning still benefits from GPT-4o
    fallbackProviders: ['GROQ'],
    preferredTier: 'CAPABLE',
  },
  // Direct Groq routing slot for any task that explicitly needs it
  GROQ_FAST: {
    primaryProvider: 'GROQ',
    fallbackProviders: ['OPENAI'],
    preferredTier: 'FAST',
  },
  DEFAULT: {
    primaryProvider: 'OPENAI',
    fallbackProviders: ['GROQ'],
    preferredTier: 'CAPABLE',
  }
};
