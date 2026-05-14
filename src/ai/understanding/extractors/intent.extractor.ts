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
      systemPrompt: `You are an app classification engine. Extract the primary name/title of the software application the user wants to build.

IMPORTANT: You MUST reply with this EXACT JSON format — nothing else:
{"primaryIntent": "App Name Here"}

The value must be a plain string of 3-7 words. Do NOT nest objects. Do NOT add extra keys.`,
      schemaName: 'IntentExtraction',
      modelTier: config.preferredTier,
      schema: IntentSchema
    }, FAST_RETRY_CONFIG);

    if (result.success) return result.data.primaryIntent;
    return "Custom Application";
  }
}
