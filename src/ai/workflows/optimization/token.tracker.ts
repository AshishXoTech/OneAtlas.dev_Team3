export interface TokenUsageRecord {
  id: string;
  orgId: string;
  projectId: string;
  operationType: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  cacheHit: boolean;
  createdAt: string;
}

export interface UsageSummary {
  totalTokens: number;
  totalCostUsd: number;
  byModel: Record<string, number>;
  byOperation: Record<string, number>;
}

export const COST_TABLE: Record<
  string,
  {
    inputPer1kTokens: number;
    outputPer1kTokens: number;
  }
> = {
  'gpt-4o': {
    inputPer1kTokens: 0.005,
    outputPer1kTokens: 0.015,
  },
  'gpt-4o-mini': {
    inputPer1kTokens: 0.00015,
    outputPer1kTokens: 0.0006,
  },
  'claude-sonnet-4-20250514': {
    inputPer1kTokens: 0.003,
    outputPer1kTokens: 0.015,
  },
  'claude-haiku-3-5-20251001': {
    inputPer1kTokens: 0.0008,
    outputPer1kTokens: 0.004,
  },
  'gemini-1.5-flash': {
    inputPer1kTokens: 0.00035,
    outputPer1kTokens: 0.00105,
  },
};

export const estimateCost = (
  model: string,
  promptTokens: number,
  completionTokens: number,
): number => {
  const pricing =
    COST_TABLE[model];

  if (!pricing) {
    return 0;
  }

  const inputCost =
    (promptTokens / 1000) *
    pricing.inputPer1kTokens;

  const outputCost =
    (completionTokens / 1000) *
    pricing.outputPer1kTokens;

  return Number(
    (inputCost + outputCost).toFixed(6),
  );
};

class TokenTracker {
  async track(
    record: Omit<
      TokenUsageRecord,
      'id' | 'createdAt'
    >,
  ): Promise<void> {
    try {
      await fetch(
        '/api/internal/ai-usage',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(record),
        },
      );
    } catch {
      return;
    }
  }

  async getUsageSummary(
    orgId: string,
    fromDate: string,
    toDate: string,
  ): Promise<UsageSummary> {
    try {
      const params =
        new URLSearchParams({
          orgId,
          from: fromDate,
          to: toDate,
        });

      const response = await fetch(
        `/api/internal/ai-usage?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch usage summary',
        );
      }

      return (await response.json()) as UsageSummary;
    } catch {
      return {
        totalTokens: 0,
        totalCostUsd: 0,
        byModel: {},
        byOperation: {},
      };
    }
  }
}

export const tokenTracker =
  new TokenTracker();

export {
  TokenTracker,
};

export default tokenTracker;