import type { AppUnderstanding } from '../../shared/types/app-understanding.types.js';

import type {
  GenerationResult,
} from '../../shared/types/generation.types.js';

export type PipelineStage =
  | 'queued'
  | 'understanding'
  | 'entity_schema_gen'
  | 'prisma_schema_gen'
  | 'page_generation'
  | 'api_generation'
  | 'component_generation'
  | 'layout_generation'
  | 'packaging'
  | 'deployment_handoff'
  | 'completed'
  | 'failed';

export interface StageResult {
  stage: PipelineStage;
  status:
    | 'pending'
    | 'running'
    | 'done'
    | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  filesGenerated?: number;
}

export interface GenerationRunState {
  runId: string;
  projectId: string;
  orgId: string;
  rawPrompt: string;
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed';
  currentStage: PipelineStage;
  stages: StageResult[];
  understanding?: AppUnderstanding;
  result?: GenerationResult;
  totalTokensUsed: number;
  totalCostUsd: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'queued',
  'understanding',
  'entity_schema_gen',
  'prisma_schema_gen',
  'page_generation',
  'api_generation',
  'component_generation',
  'layout_generation',
  'packaging',
  'deployment_handoff',
  'completed',
  'failed',
];

export const createInitialStages = (): StageResult[] => {
  return PIPELINE_STAGES.map(
    (stage) => ({
      stage,
      status: 'pending',
    }),
  );
};
