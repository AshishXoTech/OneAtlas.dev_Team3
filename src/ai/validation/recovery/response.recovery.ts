import { z } from 'zod';
import { BaseProvider } from '../../gateway/providers/base.provider.js';
import { OutputFormatter } from '../formatters/output.formatter.js';
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
  async attemptRepair<T, E>(
    malformedContent: string,
    validationError: Error | z.ZodError,
    request: AIRequest<T, E>
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    const schemaName = request.schemaName || 'repaired_response';
    console.log(`[ResponseRecovery] Triggering repair pipeline for schema: ${schemaName}`);

    const systemPrompt = `You are a strict, highly accurate JSON structural repair engine.
Your job is to fix the exact validation or semantic errors in the provided JSON payload.
You MUST return the FULL repaired JSON payload. Do NOT just return a partial patch.
Do NOT hallucinate new data. Preserve the intent of the original data, but modify relations or fields as needed to satisfy the schema or remove cyclical logic. 
Do NOT output markdown. Return raw JSON only.`;

    let errorMessage = '';
    let repairInstructions = '';

    if (validationError.name === 'SemanticGraphError') {
      errorMessage = validationError.message;
      repairInstructions = `A semantic graph error was detected (e.g. a cyclical dependency or dangling relation).
Please modify the 'relations' arrays in the relevant entities to break the cycle or fix the missing reference, and output the FULL repaired JSON object.`;
    } else if (validationError instanceof z.ZodError) {
      const paths = validationError.issues.map(i => i.path.join('.')).join(', ');
      errorMessage = JSON.stringify(validationError.issues, null, 2);
      repairInstructions = `Zod Schema Validation failed at paths: [${paths}].
Please repair the payload at these specific paths so it passes validation, and output the FULL repaired JSON object.`;
    } else {
      errorMessage = validationError.message;
      repairInstructions = `An unknown parsing error occurred. Please repair the JSON to ensure it is valid and strictly adheres to the schema. Output the FULL JSON object.`;
    }

    const userPrompt = `
Malformed Payload:
${malformedContent}

Validation/Parsing Errors:
${errorMessage}

INSTRUCTIONS:
${repairInstructions}`;

    // The secondary request to the FAST model
    const repairRequest: AIRequest<any> = {
      prompt: userPrompt,
      systemPrompt,
      modelTier: 'FAST', // Strongly enforcing FAST tier for recovery
      temperature: 0.1, // Highly deterministic
      schema: request.extractionSchema || request.schema,
      schemaName
    };

    try {
      const response = await this.provider.generate(repairRequest);

      if (!response.content) {
        return { success: false, error: "Repair provider returned empty content." };
      }

      try {
        const cleanedContent = OutputFormatter.format(response.content);
        const repairedJson = JSON.parse(cleanedContent);
        
        let validatedOutput: T;
        if (request.extractionSchema && request.normalizer) {
          const extracted = request.extractionSchema.parse(repairedJson);
          const normalized = request.normalizer(extracted);
          if (!request.schema) throw new Error("Missing runtime schema.");
          validatedOutput = request.schema.parse(normalized);
        } else {
          if (!request.schema) throw new Error("Missing runtime schema.");
          validatedOutput = request.schema.parse(repairedJson);
        }

        console.log(`[ResponseRecovery] Successfully repaired and validated JSON for: ${schemaName}`);
        return { success: true, data: validatedOutput };
      } catch (parseError) {
        return { success: false, error: `Repaired content still failed validation: ${parseError instanceof Error ? parseError.message : String(parseError)}` };
      }
    } catch (error) {
      console.error(`[ResponseRecovery] JSON repair critically failed.`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
