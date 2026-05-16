import { z } from 'zod';
import { OutputFormatter } from '../formatters/output.formatter.js';
import type { AIRequest } from '../../gateway/types/gateway.types.js';
import { tracer } from '../../shared/utils/intelligence_trace.js';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * ResponseRecovery — adaptive repair pipeline.
 * Uses the ModelRouter to find healthy recovery models (FAST tier).
 */
export class ResponseRecovery {
  constructor(private router: ModelRouter) {}

  async attemptRepair<T, E>(
    malformedContent: string,
    validationError: Error | z.ZodError,
    request: AIRequest<T, E>
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    const schemaName = request.schemaName || 'repaired_response';
    
    // Use the router to get a healthy recovery provider
    const { provider, name: providerName } = this.router.getProviderForTask('RECOVERY');
    
    logger.info('ResponseRecovery', 'REPAIR_START', `Triggering repair pipeline for ${schemaName} on ${providerName}`);

    const systemPrompt = `Strict JSON repair engine. Fix validation/semantic errors. 
Return FULL repaired JSON payload only. No markdown. No hallucinations.`;

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

    const repairRequest: AIRequest<any> = {
      prompt: userPrompt,
      systemPrompt,
      modelTier: 'FAST', 
      temperature: 0.1, 
      schema: request.extractionSchema || request.schema,
      schemaName
    };

    try {
      const repairStart = Date.now();
      const response = await provider.generate(repairRequest);

      tracer.recordSpan({
        id: `${schemaName}_repair`,
        tokensIn: response.usage.promptTokens,
        tokensOut: response.usage.completionTokens,
        latencyMs: Date.now() - repairStart,
        success: !!response.content,
        retries: 0,
        model: response.model
      });

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

        logger.info('ResponseRecovery', 'REPAIR_SUCCESS', `Successfully repaired JSON for: ${schemaName}`);
        return { success: true, data: validatedOutput };
      } catch (parseError) {
        this.router.recordFailure(providerName, parseError);
        return { success: false, error: `Repaired content still failed validation: ${parseError instanceof Error ? parseError.message : String(parseError)}` };
      }
    } catch (error) {
      this.router.recordFailure(providerName, error);
      logger.error('ResponseRecovery', 'REPAIR_CRITICAL_FAILURE', `JSON repair critically failed for ${schemaName}`, { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
