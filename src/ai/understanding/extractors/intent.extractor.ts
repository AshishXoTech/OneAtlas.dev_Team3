import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { FAST_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';
import { IntentSchema } from '../../validation/schemas/intent.schema.js';

export class IntentExtractor {
  constructor(private router: ModelRouter) {}

  /**
   * Extracts the concise, overarching primary intent of the user.
   * Useful for generating the App Name and defining global application scope.
   */
  async extract(prompt: string): Promise<string> {
    const { provider, config } = this.router.getProviderForTask('INTENT_EXTRACTION');
    const orchestrator = new ValidationOrchestrator(provider);

    // Intent is lightweight metadata. Fail fast and fallback cleanly if needed.
    const result = await orchestrator.executeWithValidation({
      prompt,
      systemPrompt: `App classification engine. Extract the primary name/title of the software application.
Reply ONLY with EXACT JSON: {"primaryIntent": "App Name Here"} (3-7 words).`,
      schemaName: 'IntentExtraction',
      modelTier: config.preferredTier,
      schema: IntentSchema
    }, FAST_RETRY_CONFIG);

    if (result.success) return result.data.primaryIntent;
    return "Custom Application";
  }
}
