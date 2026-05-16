import type { AppUnderstanding } from '../shared/types/app-understanding.types.js';
import { logger } from '../shared/utils/logger.js';

import {
  pipelineExecutor,
} from './pipeline/pipeline.executor.js';

import {
  stateStore,
} from './state/state.store.js';

import {
  cacheService,
} from './optimization/cache.service.js';

import {
  retryService,
  withRetry,
} from './optimization/retry.service.js';

import {
  tokenTracker,
} from './optimization/token.tracker.js';

export {
  pipelineExecutor,
};

export {
  stateStore,
};

export {
  cacheService,
};

export {
  retryService,
  withRetry,
};

export {
  tokenTracker,
};

export async function runGenerationPipeline(
  understanding: AppUnderstanding,
  projectId: string,
  orgId: string,
): Promise<{ runId: string }> {
  const rawPrompt =
    understanding.metadata?.rawPrompt ?? '';

  const runId =
    await stateStore.init(
      projectId,
      orgId,
      rawPrompt,
    );

  void pipelineExecutor
    .execute(
      runId,
      understanding,
      projectId,
      orgId,
    )
    .catch((error: unknown) => {
      logger.error('Workflow', 'PIPELINE_FAILED', `Pipeline failed for run ${runId}`, { error: error instanceof Error ? error.message : String(error) });
    });

  return {
    runId,
  };
}
