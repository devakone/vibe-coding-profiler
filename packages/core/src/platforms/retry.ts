import { isRateLimitError, isRetryableError, RateLimitExceededError } from "./errors";

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Random jitter in milliseconds to add to delay (default: 500) */
  jitterMs?: number;
  /** Callback invoked before each retry attempt */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 500,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for a given retry attempt with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterMs: number
): number {
  // Exponential backoff
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  // Add random jitter
  const jitter = Math.random() * jitterMs;
  // Cap at maxDelayMs
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Extract retry-after delay from a rate limit error if available
 */
function getRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof RateLimitExceededError) {
    return error.retryAfterMs;
  }
  return undefined;
}

/**
 * Execute an operation with automatic retry on retryable errors.
 *
 * Uses exponential backoff with jitter for delay between retries.
 * Respects retry-after headers from rate limit errors.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchCommitsFromAPI(),
 *   { maxRetries: 3, initialDelayMs: 2000 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    jitterMs = DEFAULT_OPTIONS.jitterMs,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryableError(error) && !isRateLimitError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay, respecting retry-after if present
      const retryAfterMs = getRetryAfterMs(error);
      const calculatedDelay = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitterMs
      );
      const delay = retryAfterMs
        ? Math.min(retryAfterMs, maxDelayMs)
        : calculatedDelay;

      // Notify about retry
      if (onRetry) {
        onRetry(lastError, attempt + 1, delay);
      }

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error("Retry failed");
}

/**
 * Create a retry wrapper with pre-configured options
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T> => {
    return withRetry(operation, { ...defaultOptions, ...options });
  };
}
