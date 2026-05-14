import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { FAST_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';
import { AppCategory } from '../detector/apptype.detector.js';
import { resolveCategory } from '../normalizer/category.normalizer.js';
import { z } from 'zod';

export class AppTypeExtractor {
  constructor(private router: ModelRouter) {}

  /**
   * AI-based fallback for application type classification when deterministic heuristics fail.
   * 
   * Optimization strategy:
   * 1. Use a permissive schema (accept any string) to avoid Zod enum failures
   * 2. Run the result through resolveCategory() for deterministic alias mapping
   * 3. FAST_RETRY_CONFIG: single attempt, no recovery, 5s timeout
   * 4. Graceful degradation to "other" on any failure
   */
  async extract(prompt: string): Promise<AppCategory> {
    const { provider, config } = this.router.getProviderForTask('INTENT_EXTRACTION');
    const orchestrator = new ValidationOrchestrator(provider);

    // Permissive schema — accepts any string the model returns.
    // We normalize it ourselves via resolveCategory() instead of forcing Zod enum validation.
    const schema = z.object({
      category: z.string().describe("The single best category for this application. Examples: dashboard, e-commerce, social, productivity, internal-tool, crm, marketplace, saas")
    });

    const result = await orchestrator.executeWithValidation({
      prompt,
      systemPrompt: `Classify this software idea into ONE category. Reply with ONLY this JSON:
{"category": "category_name"}

Choose the most fitting category from: dashboard, e-commerce, social, productivity, internal-tool, crm, marketplace, analytics, saas, admin, other.
Pick ONE. Return ONLY the JSON object.`,
      schemaName: 'AppCategoryExtraction',
      modelTier: config.preferredTier,
      schema
    }, FAST_RETRY_CONFIG);

    if (result.success) {
      // Deterministic alias resolution — maps any AI output to a valid AppCategory
      return resolveCategory(result.data.category);
    }
    return 'other';
  }
}
