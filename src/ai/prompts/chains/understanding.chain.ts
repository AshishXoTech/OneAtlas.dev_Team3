import { ChainRunner, ChainStep } from './chain.runner.js';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { AIRequest } from '../../gateway/types/gateway.types.js';
import { AppUnderstandingSchema, AppUnderstanding } from '../../validation/schemas/app-understanding.schema.js';
import { UNDERSTANDING_SYSTEM_PROMPT } from '../system/understanding.system.js';

/**
 * Builds and executes the orchestrated multi-step chain for App Understanding.
 */
export class UnderstandingChain {
  private runner: ChainRunner;
  private router: ModelRouter;

  constructor(router: ModelRouter) {
    this.router = router;
    this.runner = new ChainRunner(router);
  }

  /**
   * Executes the full pipeline: Route -> Generate -> Validate -> Recover -> Return
   */
  async run(userPrompt: string): Promise<AppUnderstanding> {
    
    const steps: ChainStep<any>[] = [
      {
        name: 'architecture_extraction',
        taskType: 'ARCHITECTURE_DESIGN',
        execute: async (router, ctx) => {
          // 1. Dynamic Routing: Get the best provider/model for Architecture Design
          const { provider, config } = router.getProviderForTask('ARCHITECTURE_DESIGN');
          
          // 2. Wrap provider in our iron-clad Validation Reliability Pipeline
          const orchestrator = new ValidationOrchestrator(provider);

          const request: AIRequest<AppUnderstanding> = {
            prompt: ctx.userPrompt,
            systemPrompt: UNDERSTANDING_SYSTEM_PROMPT,
            modelTier: config.preferredTier, // e.g., 'CAPABLE' (GPT-4o)
            schema: AppUnderstandingSchema,
            schemaName: 'AppUnderstanding'
          };

          // 3. Execute with retries, recovery, and strict validation
          const result = await orchestrator.executeWithValidation(request);
          if (!result.success) {
            throw new Error(`Orchestration failed: ${result.error.message}`);
          }
          
          return result.data;
        }
      }
      // Future Architecture: We can easily append steps here for 'intent_extraction', 'normalization', etc.
    ];

    // Execute the orchestrated steps
    const finalContext = await this.runner.executeChain<{ architecture_extraction: AppUnderstanding }>(steps, { userPrompt });
    
    // Return strongly-typed outcome
    return finalContext.architecture_extraction;
  }
}
