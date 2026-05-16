import { z } from 'zod';
import { ResponseRecovery } from '../recovery/response.recovery.js';
import { OutputFormatter } from '../formatters/output.formatter.js';
import { calculateBackoff, delay, withTimeout, DEFAULT_RETRY_CONFIG } from '../recovery/fallback.strategies.js';
import type { RetryConfig } from '../recovery/fallback.strategies.js';
import type { AppUnderstanding, EntityNode } from '../../shared/types/app-understanding.types.js';
import type { AIRequest, AIResponse } from '../../gateway/types/gateway.types.js';
import { logger } from '../../shared/utils/logger.js';
import { tracer } from '../../shared/utils/intelligence_trace.js';
import { ModelRouter } from '../../gateway/router/model.router.js';

export type OrchestrationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { type: 'VALIDATION_ERROR' | 'PROVIDER_ERROR' | 'RECOVERY_ERROR' | 'TIMEOUT_ERROR'; message: string; details?: any } };

export class ValidationOrchestrator {
  private recovery: ResponseRecovery;

  constructor(
    private router: ModelRouter,
    private taskType: string = 'DEFAULT'
  ) {
    this.recovery = new ResponseRecovery(router);
  }

  /**
   * Orchestrates the execution, strict validation, and auto-recovery of an AI request.
   * Now with adaptive cross-provider failover and health tracking.
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
      
      // Adaptive Routing: Resolve healthy provider for this attempt
      const { provider, name: providerName } = this.router.getProviderForTask(this.taskType, attempt - 1);
      
      try {
        logger.info('ValidationOrchestrator', 'EXECUTION_START', `Executing request '${request.schemaName}' on ${providerName} (Attempt ${attempt}/${retryConfig.maxAttempts})`);
        
        // Step 1: Execute primary provider generation
        const timeoutMs = retryConfig.timeoutMs || 60000;
        const response: AIResponse<T> = await withTimeout(
          provider.generate(request), 
          timeoutMs
        );

        if (!response.content || response.content.trim().length < 5) {
          // PRINCIPAL FIX: Detect "Semantic Null" responses
          throw new Error("PROVIDER_ANOMALY: Empty or trivial content returned.");
        }

        // Step 2: Enforce Strict Schema Validation
        try {
          const cleanedContent = OutputFormatter.format(response.content);
          const rawJson = JSON.parse(cleanedContent);
          
          let validatedOutput: T;
          if (request.extractionSchema && request.normalizer) {
            // New Architecture: Permissive Extraction -> Normalization -> Strict Validation
            const extracted = request.extractionSchema.parse(rawJson);
            const normalized = request.normalizer(extracted);
            validatedOutput = request.schema.parse(normalized);
          } else {
            // Legacy Architecture: Strict Validation directly
            validatedOutput = request.schema.parse(rawJson);
          }

          // Step 2.5: Semantic Validation (Graph Invariants)
          const { GraphValidator, SemanticGraphError } = await import('./graph.validator.js');
          try {
            GraphValidator.validate(validatedOutput);
          } catch (graphError) {
            if (graphError instanceof SemanticGraphError) {
              throw graphError; // Sent to recovery
            }
            throw graphError; 
          }

          // SUCCESS: Record health and telemetry
          this.router.recordSuccess(providerName);
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
          lastError = validationError;
          
          if (retryConfig.enableRecovery === false) {
            logger.warn('ValidationOrchestrator', 'VALIDATION_FAILED_RECOVERY_DISABLED', `Schema validation failed on ${providerName}. Recovery disabled. Failover to next candidate.`);
            
            tracer.recordSpan({
              id: request.schemaName || 'unknown',
              tokensIn: response.usage.promptTokens,
              tokensOut: response.usage.completionTokens,
              latencyMs: Date.now() - attemptStart,
              success: false,
              retries: attempt - 1,
              model: response.model
            });
            
            attempt++;
            continue;
          }

          logger.warn('ValidationOrchestrator', 'RECOVERY_ENGAGED', `Validation failed on ${providerName}. Engaging Recovery Pipeline.`);
          
          // Step 3: Trigger Auto-Repair Pipeline
          const recoveryResult = await this.recovery.attemptRepair(
            response.content,
            validationError instanceof Error ? validationError : new Error('Unknown parsing error'),
            request
          );

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
            this.router.recordSuccess(providerName);
            return { success: true, data: recoveryResult.data };
          } else {
            logger.warn('ValidationOrchestrator', 'RECOVERY_FAILED', `Recovery failed on ${providerName}.`);
            attempt++;
            continue;
          }
        }
      } catch (error) {
        lastError = error;
        // FAIL: Record failure to trigger failover
        this.router.recordFailure(providerName, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('ValidationOrchestrator', 'ATTEMPT_FAILED', `Attempt ${attempt} failed on ${providerName}: ${errorMessage}`);

        tracer.recordSpan({
          id: request.schemaName || 'unknown',
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: Date.now() - attemptStart,
          success: false,
          retries: attempt - 1,
          model: providerName
        });

        if (attempt < retryConfig.maxAttempts) {
          const waitMs = calculateBackoff(attempt, retryConfig);
          logger.info('ValidationOrchestrator', 'THROTTLING', `Throttling... Waiting ${waitMs}ms before failover...`);
          await delay(waitMs);
          attempt++;
        } else {
          break;
        }
      }
    }

    const isTimeout = lastError instanceof Error && lastError.message.includes('timed out');
    return { 
      success: false, 
      error: { 
        type: isTimeout ? 'TIMEOUT_ERROR' : 'PROVIDER_ERROR', 
        message: `Max attempts reached for ${request.schemaName}.`,
        details: lastError instanceof Error ? lastError.message : String(lastError)
      } 
    };
  }
}
