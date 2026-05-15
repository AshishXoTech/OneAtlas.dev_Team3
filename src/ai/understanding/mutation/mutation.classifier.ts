import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import { MutationResponse, MutationResponseSchema } from '../../validation/schemas/mutation.schema.js';
import { logger } from '../../shared/utils/logger.js';

import { ContextCompressor } from '../memory/context.compressor.js';

import { STANDARD_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';

export class MutationClassifier {
  constructor(private router: ModelRouter) {}

  async classify(currentSpec: AppUnderstanding, mutationPrompt: string, historyContext: string): Promise<MutationResponse> {
    const { provider, config } = this.router.getProviderForTask('LOGICAL_REASONING');
    const orchestrator = new ValidationOrchestrator(provider);
    
    // Compress the spec to save tokens
    const compressedSpec = ContextCompressor.compress(currentSpec);

    logger.info('MutationClassifier', 'CLASSIFY_START', 'Classifying mutation intent.', {
      promptLength: mutationPrompt.length,
      currentEntityCount: currentSpec.entities.length
    });

    const systemPrompt = `AI Mutation Engine. Analyze changes and output a JSON Patch payload.

### ARCHITECTURE
\`\`\`json
${JSON.stringify(compressedSpec)}
\`\`\`

### HISTORY
${historyContext}

### REQUEST
"${mutationPrompt}"

RULES:
1. Resolve pronouns using history.
2. ADD: Generate unique ID, full node in payload.
3. REMOVE: TargetId required.
4. MODIFY: TargetId + partial payload.
5. GLOBAL REWRITE: Set true if app purpose changes entirely.

JSON FORMAT:
{
  "requiresGlobalRewrite": false,
  "patches": [
    { "operation": "ADD/REMOVE/MODIFY", "targetScope": "entity/page/feature/workflow", "payload": { ... }, "reasoning": "..." }
  ]
}`;

    const result = await orchestrator.executeWithValidation({
      prompt: mutationPrompt,
      systemPrompt,
      schemaName: 'MutationClassification',
      modelTier: config.preferredTier,
      schema: MutationResponseSchema
    }, STANDARD_RETRY_CONFIG);

    if (!result.success) {
      throw new Error(`Mutation classification failed: ${result.error?.message} - ${result.error?.details}`);
    }

    logger.info('MutationClassifier', 'CLASSIFY_COMPLETE', 'Mutation successfully classified.', {
      patchCount: result.data.patches.length,
      requiresGlobalRewrite: result.data.requiresGlobalRewrite
    });

    return result.data;
  }
}
