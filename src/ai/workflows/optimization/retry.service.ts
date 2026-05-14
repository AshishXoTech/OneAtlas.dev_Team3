export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitter: true,
};

const RETRYABLE_STATUS_CODES = [
  429,
  500,
  503,
];

const NON_RETRYABLE_STATUS_CODES = [
  400,
  401,
  403,
  404,
];

const RETRYABLE_MESSAGES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'timeout',
  'network',
];

const NON_RETRYABLE_MESSAGES = [
  'zod',
  'validation',
  'context length',
];

const getErrorMessage = (
  error: unknown,
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const getStatusCode = (
  error: unknown,
): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error
  ) {
    const status = Reflect.get(
      error,
      'status',
    );

    if (typeof status === 'number') {
      return status;
    }
  }

  return null;
};

export const isRetryableError = (
  error: unknown,
): boolean => {
  const message =
    getErrorMessage(error).toLowerCase();

  const statusCode =
    getStatusCode(error);

  if (
    statusCode !== null &&
    NON_RETRYABLE_STATUS_CODES.includes(
      statusCode,
    )
  ) {
    return false;
  }

  if (
    statusCode !== null &&
    RETRYABLE_STATUS_CODES.includes(
      statusCode,
    )
  ) {
    return true;
  }

  if (
    NON_RETRYABLE_MESSAGES.some(
      (entry) => message.includes(entry),
    )
  ) {
    return false;
  }

  return RETRYABLE_MESSAGES.some(
    (entry) => message.includes(entry),
  );
};

export const sleep = async (
  ms: number,
): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const buildDelay = (
  attempt: number,
  config: RetryConfig,
): number => {
  const exponentialDelay =
    config.baseDelayMs * 2 ** attempt;

  const jitterValue = config.jitter
    ? Math.floor(Math.random() * 200)
    : 0;

  return Math.min(
    exponentialDelay + jitterValue,
    config.maxDelayMs,
  );
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> => {
  const finalConfig: RetryConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (
    let attempt = 0;
    attempt < finalConfig.maxAttempts;
    attempt += 1
  ) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry =
        isRetryableError(error);

      const isLastAttempt =
        attempt ===
        finalConfig.maxAttempts - 1;

      if (
        !shouldRetry ||
        isLastAttempt
      ) {
        throw error;
      }

      const delay = buildDelay(
        attempt,
        finalConfig,
      );

      await sleep(delay);
    }
  }

  throw lastError;
};

export const retryService = {
  withRetry,
  sleep,
  isRetryableError,
};

export default retryService;