import crypto from 'node:crypto';

import type {
  GenerationResult,
} from '../../shared/types/generation.types.js';

import type {
  GenerationRunState,
  PipelineStage,
  StageResult,
} from './generation.state.js';

import {
  createInitialStages,
} from './generation.state.js';

const REDIS_TTL_SECONDS = 7200;

class StateStore {
  private readonly redisUrl: string;

  private readonly redisToken: string;

  constructor() {
    this.redisUrl =
      process.env.UPSTASH_REDIS_REST_URL ?? '';

    this.redisToken =
      process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  }

  private getBaseUrl(): string {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }

  private buildKey(
    runId: string,
  ): string {
    return `gen:run:${runId}`;
  }

  private async writeRedis(
    key: string,
    value: unknown,
  ): Promise<void> {
    if (!this.redisUrl || !this.redisToken) {
      console.warn(`[StateStore] Redis unconfigured. Skipping write for key: ${key}`);
      return;
    }

    await fetch(
      `${this.redisUrl}/set/${key}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(value),
          ex: REDIS_TTL_SECONDS,
        }),
      },
    );
  }

  async init(
    projectId: string,
    orgId: string,
    rawPrompt: string,
  ): Promise<string> {
    const runId =
      crypto.randomUUID();

    const state: GenerationRunState = {
      runId,
      projectId,
      orgId,
      rawPrompt,
      status: 'pending',
      currentStage: 'queued',
      stages: createInitialStages(),
      totalTokensUsed: 0,
      totalCostUsd: 0,
      startedAt:
        new Date().toISOString(),
    };

    await this.writeRedis(
      this.buildKey(runId),
      state,
    );

    await fetch(
      `${this.getBaseUrl()}/api/internal/generation-runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(state),
      },
    );

    return runId;
  }

  async update(
    runId: string,
    patch: Partial<GenerationRunState>,
  ): Promise<void> {
    const current =
      await this.get(runId);

    if (!current) {
      return;
    }

    const updated = {
      ...current,
      ...patch,
    };

    await this.writeRedis(
      this.buildKey(runId),
      updated,
    );

    await fetch(
      `${this.getBaseUrl()}/api/internal/generation-runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(updated),
      },
    );
  }

  async updateStage(
    runId: string,
    stage: PipelineStage,
    result: Partial<StageResult>,
  ): Promise<void> {
    const current =
      await this.get(runId);

    if (!current) {
      return;
    }

    const stages =
      current.stages.map((entry) => {
        if (entry.stage !== stage) {
          return entry;
        }

        return {
          ...entry,
          ...result,
        };
      });

    await this.update(runId, {
      stages,
      currentStage: stage,
    });
  }

  async get(
    runId: string,
  ): Promise<GenerationRunState | null> {
    try {
      const response = await fetch(
        `${this.redisUrl}/get/${this.buildKey(
          runId,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
          },
        },
      );

      const payload =
        (await response.json()) as {
          result?: string | null;
        };

      if (payload.result) {
        return JSON.parse(
          payload.result,
        ) as GenerationRunState;
      }
    } catch {
      return null;
    }

    return null;
  }

  async markCompleted(
    runId: string,
    result: GenerationResult,
  ): Promise<void> {
    await this.update(runId, {
      status: 'completed',
      currentStage: 'completed',
      completedAt:
        new Date().toISOString(),
      result: {
        ...result,
        files: [],
      },
    });
  }

  async markFailed(
    runId: string,
    stage: PipelineStage,
    error: string,
  ): Promise<void> {
    await this.update(runId, {
      status: 'failed',
      currentStage: stage,
      error,
      completedAt:
        new Date().toISOString(),
    });
  }
}

export const stateStore =
  new StateStore();

export {
  StateStore,
};

export default stateStore;