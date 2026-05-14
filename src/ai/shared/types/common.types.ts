/**
 * Common shared types for the AI Understanding Layer.
 * Includes confidence scoring interfaces and orchestration metadata.
 */

export interface ConfidenceScore {
  score: number; // 0.0 – 1.0
  method: 'heuristic' | 'ai' | 'fallback';
  reliable: boolean; // score > CONFIDENCE_THRESHOLD
}

export const CONFIDENCE_THRESHOLD = 0.65;

export interface PipelineMetrics {
  sessionId?: string;
  latencyMs: number;
  retryCount: number;
  recoveryAttempted: boolean;
  confidence: ConfidenceScore;
  providerUsed: string;
  modelTierUsed: string;
}
