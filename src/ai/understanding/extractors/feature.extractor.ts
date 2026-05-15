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
      systemPrompt: `Software architecture engine. Extract core features, UI pages, database entities, and workflows.

RULES:
- Features: id, name, description.
- Pages: id, name, route, description, requiredEntities, layoutTemplate.
- Entities: id, name, description, attributes (name, type, isRequired), relations (targetEntity, type).
- Workflows: id, name, description, triggerType (USER_ACTION/SYSTEM_EVENT/SCHEDULED), executionMode (SYNC/ASYNC), steps[].

JSON FORMAT:
{
  "features": [{ "id": "feat_1", "name": "Auth", "description": "Login/Reg" }],
  "pages": [{ "id": "p1", "name": "Home", "route": "/", "description": "Landing", "requiredEntities": [], "layoutTemplate": "hero" }],
  "entities": [{ "id": "e1", "name": "User", "description": "System user", "attributes": [{"name":"email","type":"string","isRequired":true}], "relations": [] }],
  "workflows": [{ "id": "w1", "name": "Submit", "description": "Form", "triggerType": "USER_ACTION", "executionMode": "SYNC", "steps": ["Step 1"] }]
}`,
      schemaName: 'FeatureExtraction',
      modelTier: config.preferredTier,
      schema: FeatureSchema
    }, CRITICAL_RETRY_CONFIG);

    if (result.success) return result.data;
    
    return { features: [], pages: [], entities: [], workflows: [] };
  }
}
