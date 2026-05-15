import { z } from 'zod';
import { ModelTier } from '../config/models.config.js';

export interface ProviderConfig {
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AIRequest<T = any, E = any> {
  prompt: string;
  systemPrompt?: string;
  modelTier?: ModelTier;
  temperature?: number;
  maxTokens?: number;
  schema?: z.ZodSchema<T>;
  extractionSchema?: z.ZodSchema<E>;
  normalizer?: (extracted: E) => any;
  schemaName?: string;
  schemaDescription?: string;
}

export interface AIResponse<T = any> {
  content: string;
  parsedOutput?: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}
