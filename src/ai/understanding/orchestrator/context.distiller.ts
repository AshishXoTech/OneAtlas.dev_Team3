import { ModelRouter } from '../../gateway/router/model.router.js';
import { logger } from '../../shared/utils/logger.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { z } from 'zod';

const DistilledContextSchema = z.object({
  summary: z.string().describe("Highly compressed architectural summary of the original prompt"),
  keyEntities: z.array(z.string()).describe("List of core entities identified"),
  primaryGoal: z.string().describe("The main purpose of the application")
});

export class ContextDistiller {
  constructor(private router: ModelRouter) {}

  /**
   * Distills a long, verbose prompt into a dense architectural summary.
   * This allows processing very large prompts without hitting token limits or 
   * overwhelming the main extraction logic.
   */
  async distill(longPrompt: string): Promise<string> {
    const orchestrator = new ValidationOrchestrator(this.router, 'LONG_CONTEXT_ANALYSIS');

    logger.info('ContextDistiller', 'DISTILL_START', 'Distilling long prompt context.', {
      originalLength: longPrompt.length
    });

    const systemPrompt = `You are a Principal Software Architect. 
Your task is to compress a long, verbose application description into a dense, structural summary.
Focus ONLY on:
1. Core entities and their relationships.
2. Primary functional workflows.
3. High-level application category.
Remove all fluff, conversational filler, and redundant details.`;

    const result = await orchestrator.executeWithValidation({
      prompt: longPrompt,
      systemPrompt,
      schemaName: 'ContextDistillation',
      modelTier: 'FAST', // Use cheapest/fastest model for distillation
      schema: DistilledContextSchema
    });

    if (!result.success) {
      logger.warn('ContextDistiller', 'DISTILL_FAILED', 'Failed to distill context. Falling back to truncation.');
      return longPrompt.slice(0, 4000);
    }

    const { summary, keyEntities, primaryGoal } = result.data;
    const distilled = `PRIMARY GOAL: ${primaryGoal}\nCORE ENTITIES: ${keyEntities.join(', ')}\nARCHITECTURAL SUMMARY: ${summary}`;

    logger.info('ContextDistiller', 'DISTILL_COMPLETE', 'Context distilled successfully.', {
      distilledLength: distilled.length,
      compressionRatio: (distilled.length / longPrompt.length).toFixed(2)
    });

    return distilled;
  }
}
