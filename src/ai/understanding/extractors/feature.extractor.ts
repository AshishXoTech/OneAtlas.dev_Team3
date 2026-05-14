import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { CRITICAL_RETRY_CONFIG } from '../../validation/recovery/fallback.strategies.js';
import { z } from 'zod';

export interface ExtractedEntity {
  name: string;
  fields: string[];
  relations: string[];
}

export interface FeatureExtractionResult {
  features: string[];
  pages: string[];
  entities: ExtractedEntity[];
  workflows: string[];
}

export class FeatureExtractor {
  constructor(private router: ModelRouter) {}

  /**
   * Analyzes the prompt to extract complex architectural features, entities with fields, and pages.
   */
  async extract(promptContext: string): Promise<FeatureExtractionResult> {
    const { provider, config } = this.router.getProviderForTask('ARCHITECTURE_DESIGN');
    const orchestrator = new ValidationOrchestrator(provider);

    const schema = z.object({
      features: z.array(z.string()).describe("Specific functional capabilities"),
      pages: z.array(z.string()).describe("Required UI views/routes"),
      entities: z.array(z.object({
        name: z.string().describe("PascalCase name of the model"),
        fields: z.array(z.string()).describe("List of data fields (e.g. ['email', 'price'])"),
        relations: z.array(z.string()).describe("List of related model names")
      })).describe("Database models and their structure"),
      workflows: z.array(z.string()).describe("Key business logic flows")
    });

    const result = await orchestrator.executeWithValidation({
      prompt: promptContext,
      systemPrompt: `You are a software architecture extraction engine.

Extract the core features, UI pages, database entities (with fields and relations), and workflows from the user's app idea.

CRITICAL FORMAT RULES:
- "features": capability names (e.g. "user authentication")
- "pages": route names (e.g. "dashboard")
- "entities": provide the name, a list of suggested fields, and names of related entities.
- "workflows": business flows (e.g. "order checkout")

You MUST reply with EXACTLY this JSON structure:
{
  "features": ["string"],
  "pages": ["string"],
  "entities": [
    { "name": "User", "fields": ["email", "fullName"], "relations": ["Post"] }
  ],
  "workflows": ["string"]
}`,
      schemaName: 'FeatureExtraction',
      modelTier: config.preferredTier,
      schema
    }, CRITICAL_RETRY_CONFIG);

    if (result.success) return result.data;
    
    return { features: [], pages: [], entities: [], workflows: [] };
  }
}
