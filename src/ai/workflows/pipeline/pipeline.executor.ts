import type { AppUnderstanding } from '../../shared/types/app-understanding.types.js';

import type {
  GenerationResult,
} from '../../shared/types/generation.types.js';

import type {
  GenerationRunState,
} from '../state/generation.state.js';

import {
  PIPELINE_STEPS,
  type PipelineContext,
} from './generation.pipeline.js';

import {
  stateStore,
} from '../state/state.store.js';

import {
  retryService,
} from '../optimization/retry.service.js';

class PipelineExecutor {
  async execute(
    runId: string,
    understanding: AppUnderstanding,
    projectId: string,
    orgId: string,
  ): Promise<GenerationResult> {
    let context: PipelineContext = {
      runId,
      projectId,
      orgId,
      rawPrompt:
        understanding.metadata?.rawPrompt ?? '',
      understanding,
      generatedFiles: [],
    };

    for (const step of PIPELINE_STEPS) {
      const startedAt = Date.now();

      await stateStore.updateStage(
        runId,
        step.stage,
        {
          status: 'running',
          startedAt:
            new Date().toISOString(),
        },
      );

      try {
        if (
          step.shouldSkip?.(context)
        ) {
          await stateStore.updateStage(
            runId,
            step.stage,
            {
              status: 'done',
              completedAt:
                new Date().toISOString(),
            },
          );

          continue;
        }

        context =
          await retryService.withRetry(
            async () => {
              return step.run(context);
            },
          );

        const completedAt =
          new Date().toISOString();

        const durationMs =
          Date.now() - startedAt;

        await stateStore.updateStage(
          runId,
          step.stage,
          {
            status: 'done',
            completedAt,
            durationMs,
            filesGenerated:
              context.generatedFiles
                ?.length ?? 0,
          },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown pipeline error';

        await stateStore.markFailed(
          runId,
          step.stage,
          message,
        );

        throw error;
      }
    }

    if (!context.result) {
      throw new Error(
        'Pipeline completed without result',
      );
    }

    await stateStore.markCompleted(
      runId,
      context.result,
    );

    return context.result;
  }

  async getStatus(
    runId: string,
  ): Promise<GenerationRunState | null> {
    return stateStore.get(runId);
  }
}

export const pipelineExecutor =
  new PipelineExecutor();

export {
  PipelineExecutor,
};

export default pipelineExecutor;
