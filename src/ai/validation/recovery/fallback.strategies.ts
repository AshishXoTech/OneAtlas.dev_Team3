/**
 * Advanced fallback, retry, and timeout strategies for AI operations.
 * Implements exponential backoff with jitter to prevent rate-limit thrashing.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs?: number;
  enableRecovery?: boolean; // If false, skips the expensive LLM repair pipeline
}

/**
 * Lightweight config for simple classification tasks.
 * Fails fast. No expensive recovery loop. 5s hard timeout.
 */
export const FAST_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 1, // Single attempt, degrade gracefully if it fails
  baseDelayMs: 0,
  maxDelayMs: 0,
  timeoutMs: 5000, 
  enableRecovery: false, 
};

/**
 * Standard config for medium tasks.
 * Allows 1 retry and attempts LLM recovery. 45s timeout.
 */
export const STANDARD_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  timeoutMs: 45000,
  enableRecovery: true,
};

/**
 * Heavy architectural extraction config.
 * Allows 2 retries, full LLM recovery. 45s hard timeout.
 * Required for Mistral Large.
 */
export const CRITICAL_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  timeoutMs: 45000, 
  enableRecovery: true,
};

// Alias DEFAULT to STANDARD for backwards compatibility
export const DEFAULT_RETRY_CONFIG = STANDARD_RETRY_CONFIG;

/**
 * Calculates exponential backoff delay with jitter.
 * Prevents identical retry cadences across concurrent tasks (Thundering Herd problem).
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% randomness added
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Utility to pause asynchronous execution.
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a promise with a strict timeout wrapper.
 * Ensures the pipeline doesn't hang indefinitely if the AI provider stalls.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
