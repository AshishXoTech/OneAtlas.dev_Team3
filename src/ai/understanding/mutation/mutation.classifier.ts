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
    const { config } = this.router.getProviderForTask('MUTATION_CLASSIFICATION');
    const orchestrator = new ValidationOrchestrator(this.router, 'MUTATION_CLASSIFICATION');
    
    // Compress the spec to save tokens
    const compressedSpec = ContextCompressor.compress(currentSpec);

    logger.info('MutationClassifier', 'CLASSIFY_START', 'Classifying mutation intent.', {
      promptLength: mutationPrompt.length,
      currentEntityCount: currentSpec.entities.length
    });


    const topologySummary = currentSpec.entities.length > 0 
      ? currentSpec.entities.map(e => {
          const relations = (e.relations || []).map(r => r.targetEntity).join(', ') || 'none';
          return `- ${e.id} (${e.name}) -> [${relations}]`;
        }).join('\n')
      : 'Graph is empty.';

    const systemPrompt = `You are a Principal Runtime Intelligence Engineer specializing in Graph Mutation. 
Your goal is to generate semantic patches that fulfill user intent while maximizing graph preservation.

### REWRITE ESCALATION PROTOCOL
1. PREFER PATCHES: For additive subsystems (e.g., "Add billing", "Add notifications", "Add dashboard"), use "ADD" patches. Do NOT rewrite.
2. BLAST RADIUS: Analyze the impact. If >80% of existing entities/pages are preserved, use patches.
3. MANDATORY REWRITE: Only use requiresGlobalRewrite: true if:
   - App domain fundamentally shifts (e.g., CRM -> Video Game).
   - Current topology is completely incompatible with the new intent.
   - The user explicitly says "scrap it all" or "start over".

### MANDATORY RUNTIME CONTRACTS
Each "ADD" payload MUST contain these exact fields:
- Page: { "id": string, "name": string, "route": "/lowercase-route", "description": string, "requiredEntities": string[], "layoutTemplate": string }
- Entity: { "id": string, "name": "PascalCaseName", "description": string, "attributes": [{ "name": string, "type": string, "isRequired": boolean }], "relations": [{ "targetEntity": string, "type": string }] }
- Workflow: { "id": string, "name": string, "description": string, "triggerType": "USER_ACTION"|"SYSTEM_EVENT"|"SCHEDULED", "executionMode": "SYNC"|"ASYNC", "steps": string[] }

### CRITICAL INVARIANTS
1. MISSING ROUTES: Every Page MUST have a "route" field starting with "/". Failure to include "route" will crash the runtime.
2. CYCLICAL DEPENDENCIES: The graph must remain a DAG. DO NOT create cycles.
   - NO BI-DIRECTIONAL RELATIONS: If A relates to B, B MUST NOT relate back to A. This is a fatal runtime error.
   - RELATIONSHIP DIRECTIONALITY STANDARD:
     * CORE ENTITIES (e.g., Lead, User, Account) are stable roots.
     * SUBSYSTEMS (e.g., Subscription, Notification, AuditLog) should point TO Core Entities.
     * Core Entities should NEVER be modified to point BACK to Subsystems.
     * Example: ent_subscription -> ent_lead [VALID]. ent_lead -> ent_subscription [INVALID CYCLE].
3. ID PREFIXES: Use page_, ent_, wf_, feat_ prefixes for all new IDs.

### CURRENT GRAPH STATE
\`\`\`json
${JSON.stringify(compressedSpec)}
\`\`\`

### TOPOLOGY ANALYSIS
${topologySummary}

### INSTRUCTIONS
1. BLAST RADIUS ANALYSIS: Determine how many existing nodes must change vs how many are stable.
2. SUBSYSTEM ISOLATION: Can this be added as a modular, additive subsystem (like Stripe)? If yes, use patches.
3. PRESERVATION PLAN: Identify exactly which entities, routes, and workflows remain intact.
4. SEQUENCE PLANNING: Plan additive patches (ADD) and surgical modifications (MODIFY).
5. INVARIANT CHECK:
   - Verify no cycles are created (A -> B -> A is FORBIDDEN).
   - Check that NO bi-directional relationship pairs are emitted across ALL patches.
   - Ensure all routes start with "/".

JSON OUTPUT FORMAT:
{
  "requiresGlobalRewrite": boolean,
  "blastRadiusScore": number (0-1),
  "preservationReasoning": "Detailed explanation of what remains STABLE",
  "patches": [
    { 
      "operation": "ADD"|"REMOVE"|"MODIFY", 
      "targetScope": "entity"|"page"|"feature"|"workflow", 
      "targetId": string, 
      "payload": object, 
      "reasoning": "Detailed reasoning including: 1. Goal. 2. BLAST RADIUS analysis. 3. RELATIONSHIP HIERARCHY PROOF (Explain why new relations only point from Consumer to Core, preventing cycles)." 
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
