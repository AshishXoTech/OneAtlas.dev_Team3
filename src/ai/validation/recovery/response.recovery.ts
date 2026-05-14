import { z } from 'zod';
import { BaseProvider } from '../../gateway/providers/base.provider.js';
import { AIRequest, AIResponse } from '../../gateway/types/gateway.types.js';

export class ResponseRecovery {
  private provider: BaseProvider;

  constructor(provider: BaseProvider) {
    this.provider = provider;
  }

  /**
   * Triggers a recovery pipeline utilizing a fast, cheap AI model to auto-repair
   * malformed JSON outputs based on the exact Zod validation error.
   */
  async attemptRepair<T>(
    malformedContent: string,
    validationError: Error | z.ZodError,
    schema: z.ZodSchema<T>,
    schemaName: string = 'repaired_response'
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    console.log(`[ResponseRecovery] Triggering repair pipeline for schema: ${schemaName}`);

    const systemPrompt = `You are a strict, highly accurate JSON structural repair engine.
Your ONLY job is to take a malformed or invalid JSON payload and output a perfectly repaired JSON object that strictly adheres to the requested schema.
Do NOT hallucinate new data. Preserve the intent of the original data. 
Do NOT output markdown. Return raw JSON only.`;

    const errorMessage = validationError instanceof z.ZodError 
      ? JSON.stringify(validationError.issues, null, 2) 
      : validationError.message;

    const userPrompt = `
Malformed Payload:
${malformedContent}

Validation/Parsing Errors:
${errorMessage}

Please repair the payload so it passes validation.`;

    const request: AIRequest<T> = {
      prompt: userPrompt,
      systemPrompt,
      modelTier: 'FAST', // Strongly enforcing FAST tier for recovery (e.g. gpt-4o-mini)
      temperature: 0.1, // Highly deterministic to prevent further errors
      schema,
      schemaName
    };

    try {
      // The secondary request to the FAST model
      const response: AIResponse<T> = await this.provider.generate(request);

      if (!response.content) {
        return { success: false, error: "Repair provider returned empty content." };
      }

      // Parse and validate the repaired content through the schema directly.
      // We cannot rely on response.parsedOutput because non-OpenAI providers 
      // (e.g. GroqProvider) intentionally return parsedOutput: undefined.
      try {
        const repairedJson = JSON.parse(response.content);
        const validated = schema.parse(repairedJson);
        console.log(`[ResponseRecovery] Successfully repaired and validated JSON for: ${schemaName}`);
        return { success: true, data: validated };
      } catch (parseError) {
        return { success: false, error: `Repaired content still failed validation: ${parseError instanceof Error ? parseError.message : String(parseError)}` };
      }
    } catch (error) {
      console.error(`[ResponseRecovery] JSON repair critically failed.`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
