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
    const { config } = this.router.getProviderForTask('FEATURE_EXTRACTION');
    const orchestrator = new ValidationOrchestrator(this.router, 'FEATURE_EXTRACTION');

    const result = await orchestrator.executeWithValidation({
      prompt: promptContext,
      systemPrompt: `SYSTEM: Senior AI Runtime Systems Engineer.
TASK: Extract an authoritative Intent Graph from the user's software description.

GRAPH CONSTRAINTS:
1. ENTITIES: Every data model must have a unique ID (e.g., "ent_user"), PascalCase name, and non-empty attributes.
2. RELATIONS: targetEntity MUST refer to an existing Entity ID or name.
3. PAGES: routes MUST be unique and start with "/". requiredEntities MUST refer to existing Entity IDs.
4. WORKFLOWS: steps MUST be an ordered array of strings. triggerType MUST be one of: USER_ACTION, SYSTEM_EVENT, SCHEDULED.

OUTPUT FORMAT:
Return a STRICT JSON object matching this structure:
{
  "features": [{ "id": "feat_auth", "name": "Authentication", "description": "User login/signup" }],
  "pages": [{ "id": "p_home", "name": "Home", "route": "/home", "description": "Dashboard", "requiredEntities": ["ent_user"], "layoutTemplate": "dashboard" }],
  "entities": [{ "id": "ent_user", "name": "User", "description": "System user", "attributes": [{"name":"email","type":"string","isRequired":true}], "relations": [{"targetEntity":"ent_org","type":"many-to-one"}] }],
  "workflows": [{ "id": "wf_submit", "name": "Onboarding", "description": "New user flow", "triggerType": "USER_ACTION", "executionMode": "SYNC", "steps": ["Validate email", "Create account"] }]
}`,
      schemaName: 'FeatureExtraction',
      modelTier: config.preferredTier,
      schema: FeatureSchema
    }, CRITICAL_RETRY_CONFIG);

    if (result.success) return result.data;
    
    return { features: [], pages: [], entities: [], workflows: [] };
  }
}
