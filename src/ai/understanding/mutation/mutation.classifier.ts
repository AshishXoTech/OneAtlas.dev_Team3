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

    const systemPrompt = `You are the AI Mutation Engine for an application synthesis platform.
Your job is to analyze the user's requested changes and output a precise JSON Patch payload to modify the existing application architecture.

### RECENT CONVERSATION HISTORY
${historyContext}

### CURRENT COMPRESSED ARCHITECTURE
\`\`\`json
${JSON.stringify(compressedSpec, null, 2)}
\`\`\`

### USER MUTATION REQUEST
"${mutationPrompt}"

CRITICAL INSTRUCTIONS:
1. Identify EXACTLY what the user wants to change, using the Conversation History to resolve pronouns (e.g. "make it require auth").
2. If the user wants to ADD something (e.g., "add billing"), output an ADD operation. Generate a unique ID (e.g., "ent_bill_1") and provide the full node in the payload. Ensure you add necessary features, workflows, and pages to support it.
3. If the user wants to REMOVE something (e.g., "remove comments"), output a REMOVE operation with the targetId.
4. If the user wants to MODIFY something (e.g., "change user email to require authentication"), output a MODIFY operation.
5. If the user wants a completely different app (e.g., "turn this into a video game instead"), set "requiresGlobalRewrite" to true and return no patches.

PAYLOAD FORMAT REQUIREMENTS:
- If targetScope is "entity", the payload MUST match the EntityNode schema (id, name, description, attributes[], relations[]).
- If targetScope is "page", payload MUST match PageNode schema.
- If targetScope is "feature", payload MUST match FeatureNode schema.
- If targetScope is "workflow", payload MUST match WorkflowNode schema.

You MUST reply with exactly this JSON structure:
{
  "requiresGlobalRewrite": false,
  "patches": [
    {
      "operation": "ADD",
      "targetScope": "entity",
      "payload": {
        "id": "ent_stripe",
        "name": "Subscription",
        "description": "Stripe subscription details",
        "attributes": [{ "name": "stripeCustomerId", "type": "string", "isRequired": true }],
        "relations": [{ "targetEntity": "ent_1", "type": "one-to-one" }]
      },
      "reasoning": "User requested Stripe integration."
    }
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
