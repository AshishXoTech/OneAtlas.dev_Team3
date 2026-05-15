import { z } from 'zod';
import { BaseProvider } from '../../gateway/providers/base.provider.js';
import { ResponseRecovery } from '../recovery/response.recovery.js';
import { OutputFormatter } from '../formatters/output.formatter.js';
import { calculateBackoff, delay, withTimeout, RetryConfig, DEFAULT_RETRY_CONFIG } from '../recovery/fallback.strategies.js';
import { AIRequest, AIResponse } from '../../gateway/types/gateway.types.js';
import { tracer } from '../../shared/utils/intelligence_trace.js';

export type OrchestrationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { type: 'VALIDATION_ERROR' | 'PROVIDER_ERROR' | 'RECOVERY_ERROR' | 'TIMEOUT_ERROR'; message: string; details?: any } };

export class ValidationOrchestrator {
  private provider: BaseProvider;
  private recovery: ResponseRecovery;

  constructor(provider: BaseProvider) {
    this.provider = provider;
    this.recovery = new ResponseRecovery(provider);
  }

  /**
   * Orchestrates the execution, strict validation, and auto-recovery of an AI request.
   * Ensures that either a strictly validated JSON payload is returned, or a safe typed error.
   */
  async executeWithValidation<T>(
    request: AIRequest<T>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<OrchestrationResult<T>> {
    if (!request.schema) {
      return { 
        success: false, 
        error: { type: 'VALIDATION_ERROR', message: "ValidationOrchestrator requires a Zod schema in the AIRequest." } 
      };
    }

    let attempt = 1;
    let lastError: any = null;

    while (attempt <= retryConfig.maxAttempts) {
      const attemptStart = Date.now();
      try {
        console.log(`[ValidationOrchestrator] Executing request '${request.schemaName}' (Attempt ${attempt}/${retryConfig.maxAttempts})`);
        
        // Step 1: Execute primary provider generation wrapped in a safety timeout
        const timeoutMs = retryConfig.timeoutMs || 60000;
        const response: AIResponse<T> = await withTimeout(
          this.provider.generate(request), 
          timeoutMs
        );

        if (!response.content) {
          throw new Error("Provider returned empty content.");
        }

        // Step 2: Enforce Strict Schema Validation manually to catch parsing failures natively
        try {
          const cleanedContent = OutputFormatter.format(response.content);
          const rawJson = JSON.parse(cleanedContent);
          
          let validatedOutput: T;
          if (request.extractionSchema && request.normalizer) {
            // New Architecture: Permissive Extraction -> Normalization -> Strict Validation
            const extracted = request.extractionSchema.parse(rawJson);
            const normalized = request.normalizer(extracted);
            if (!request.schema) throw new Error("Missing runtime schema.");
            validatedOutput = request.schema.parse(normalized);
          } else {
            // Legacy Architecture: Strict Validation directly
            if (!request.schema) throw new Error("Missing runtime schema.");
            validatedOutput = request.schema.parse(rawJson);
          }

          // Step 2.5: Semantic Validation (Phase 5)
          const { GraphValidator, SemanticGraphError } = await import('./graph.validator.js');
          try {
            GraphValidator.validate(validatedOutput);
          } catch (graphError) {
            if (graphError instanceof SemanticGraphError) {
              throw graphError; // Will be caught by the outer catch and sent to recovery
            }
            throw graphError; // Unexpected error
          }

          // Record successful span
          tracer.recordSpan({
            id: request.schemaName || 'unknown',
            tokensIn: response.usage.promptTokens,
            tokensOut: response.usage.completionTokens,
            latencyMs: Date.now() - attemptStart,
            success: true,
            retries: attempt - 1,
            model: response.model
          });

          return { success: true, data: validatedOutput };
        } catch (validationError) {
          
          // Circuit Breaker: Skip expensive LLM repair if recovery is disabled for this task
          if (retryConfig.enableRecovery === false) {
            console.warn(`[ValidationOrchestrator] Schema validation failed. Recovery disabled for this task. Short-circuiting.`);
            
            // Record failed span but with usage info if available
            tracer.recordSpan({
              id: request.schemaName || 'unknown',
              tokensIn: response.usage.promptTokens,
              tokensOut: response.usage.completionTokens,
              latencyMs: Date.now() - attemptStart,
              success: false,
              retries: attempt - 1,
              model: response.model
            });
            
            throw validationError;
          }

          console.warn(`[ValidationOrchestrator] Schema validation or JSON parse failed. Engaging Recovery Pipeline.`);
          
          // Step 3: Trigger Auto-Repair Pipeline if parsing/validation fails
          const recoveryResult = await this.recovery.attemptRepair(
            response.content,
            validationError instanceof Error ? validationError : new Error('Unknown parsing error'),
            request
          );

          // Record span for original attempt (which failed validation but consumed tokens)
          tracer.recordSpan({
            id: `${request.schemaName}_initial_fail`,
            tokensIn: response.usage.promptTokens,
            tokensOut: response.usage.completionTokens,
            latencyMs: Date.now() - attemptStart,
            success: false,
            retries: attempt - 1,
            model: response.model
          });

          if (recoveryResult.success && recoveryResult.data) {
            return { success: true, data: recoveryResult.data };
          } else {
            throw new Error(`Recovery system failed to repair payload: ${recoveryResult.error}`);
          }
        }

      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ValidationOrchestrator] Attempt ${attempt} failed: ${errorMessage}`);

        // Record failed attempt span
        tracer.recordSpan({
          id: request.schemaName || 'unknown',
          tokensIn: 0, // Unknown if it failed before usage data
          tokensOut: 0,
          latencyMs: Date.now() - attemptStart,
          success: false,
          retries: attempt - 1,
          model: 'error'
        });

        if (attempt < retryConfig.maxAttempts) {
          const backoff = calculateBackoff(attempt, retryConfig);
          console.log(`[ValidationOrchestrator] Throttling... Waiting ${Math.round(backoff)}ms before retry...`);
          await delay(backoff);
        }
        attempt++;
      }
    }

    // Step 4: Complete Failure State - Return safely strongly typed structured error
    const isTimeout = lastError instanceof Error && lastError.message.includes('timed out');
    return {
      success: false,
      error: {
        type: isTimeout ? 'TIMEOUT_ERROR' : 'RECOVERY_ERROR',
        message: `Request failed catastrophically after ${retryConfig.maxAttempts} attempts.`,
        details: lastError instanceof Error ? lastError.message : String(lastError)
      }
    };
  }
}
