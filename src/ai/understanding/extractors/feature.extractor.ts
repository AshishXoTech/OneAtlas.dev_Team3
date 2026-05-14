import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { CRITICAL_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';
import { z } from 'zod';

export class FeatureExtractor {
  constructor(private router: ModelRouter) {}

  /**
   * Analyzes the prompt to extract complex, implicit architectural features, entities, and pages.
   */
  async extract(promptContext: string): Promise<{ features: string[], pages: string[], entities: string[], workflows: string[] }> {
    const { provider, config } = this.router.getProviderForTask('ARCHITECTURE_DESIGN');
    const orchestrator = new ValidationOrchestrator(provider);

    // This schema natively aligns with the teammate's required contract fields.
    const schema = z.object({
      features: z.array(z.string()).describe("Specific functional capabilities (e.g. 'Stripe Payments', 'OAuth')"),
      pages: z.array(z.string()).describe("Required UI views/routes"),
      entities: z.array(z.string()).describe("Required database models/tables"),
      workflows: z.array(z.string()).describe("Key business logic flows")
    });

    // Architecture is critical — we allow full retries and LLM-based repair loops here
    const result = await orchestrator.executeWithValidation({
      prompt: promptContext,
      systemPrompt: `You are a software architecture extraction engine.

Extract the core features, UI pages, database entities, and workflows from the user's app idea.

CRITICAL FORMAT RULES — violating these will cause a system failure:
- All values MUST be flat arrays of plain strings. NO nested objects. NO objects inside arrays.
- "features": short capability names only (e.g. "user authentication", "stripe payments")
- "pages": page names only (e.g. "dashboard", "checkout", "login")
- "entities": DB table/model names only (e.g. "User", "Product", "Order")
- "workflows": short workflow names only (e.g. "user registration", "order checkout")

You MUST reply with EXACTLY this JSON structure:
{
  "features": ["string", "string"],
  "pages": ["string", "string"],
  "entities": ["string", "string"],
  "workflows": ["string", "string"]
}

Do NOT add descriptions, steps, or nested objects inside any array.`,
      schemaName: 'FeatureExtraction',
      modelTier: config.preferredTier,
      schema
    }, CRITICAL_RETRY_CONFIG);

    if (result.success) return result.data;
    
    // Safety fallback
    return { features: [], pages: [], entities: [], workflows: [] };
  }
}
