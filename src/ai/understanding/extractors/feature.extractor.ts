import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { CRITICAL_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';
import { FeatureSchema, FeatureArchitecture } from '../../validation/schemas/feature.schema.js';

export class FeatureExtractor {
  constructor(private router: ModelRouter) {}

  /**
   * Analyzes the prompt to extract complex architectural features, entities with fields, and pages.
   */
  async extract(promptContext: string): Promise<FeatureArchitecture> {
    const { provider, config } = this.router.getProviderForTask('ARCHITECTURE_DESIGN');
    const orchestrator = new ValidationOrchestrator(provider);

    const result = await orchestrator.executeWithValidation({
      prompt: promptContext,
      systemPrompt: `You are a software architecture extraction engine.

Extract the core features, UI pages, database entities (with attributes and relations), and workflows from the user's app idea.

CRITICAL FORMAT RULES:
- "features": capabilities with id, name, and description.
- "pages": routes with id, name, route, description, requiredEntities, and layoutTemplate.
- "entities": detailed data models with id, name, description, attributes (name, type, isRequired), and relations (targetEntity, type).
- "workflows": business flows with id, name, description, triggerType (USER_ACTION, SYSTEM_EVENT, SCHEDULED), executionMode (SYNC, ASYNC), and a steps array.

You MUST reply with EXACTLY this JSON structure:
{
  "features": [
    { "id": "feat_1", "name": "User Authentication", "description": "Handles login and registration" }
  ],
  "pages": [
    { "id": "page_1", "name": "Dashboard", "route": "/dashboard", "description": "Main user view", "requiredEntities": ["ent_1"], "layoutTemplate": "dashboard" }
  ],
  "entities": [
    { 
      "id": "ent_1", 
      "name": "User", 
      "description": "System user",
      "attributes": [{ "name": "email", "type": "string", "isRequired": true }],
      "relations": [{ "targetEntity": "ent_2", "type": "one-to-many" }]
    }
  ],
  "workflows": [
    { 
      "id": "wf_1", 
      "name": "Order Checkout", 
      "description": "Processes payment and creates order",
      "triggerType": "USER_ACTION",
      "executionMode": "SYNC",
      "steps": ["Validate Cart", "Process Stripe Payment", "Create Order Record", "Dispatch Email Event"]
    }
  ]
}`,
      schemaName: 'FeatureExtraction',
      modelTier: config.preferredTier,
      schema: FeatureSchema
    }, CRITICAL_RETRY_CONFIG);

    if (result.success) return result.data;
    
    return { features: [], pages: [], entities: [], workflows: [] };
  }
}
