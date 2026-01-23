import { describe, expect, it, vi } from "vitest";
import { withRetry, isRetryableError } from "../platforms/retry";
import { RateLimitExceededError, TokenExpiredError } from "../platforms/errors";

describe("withRetry", () => {
  it("returns result on first successful call", async () => {
    const operation = vi.fn().mockResolvedValue("success");

    const result = await withRetry(operation);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success after retries");

    const result = await withRetry(operation, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result).toBe("success after retries");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws after max retries exhausted", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(operation, { maxRetries: 2, initialDelayMs: 10 })
    ).rejects.toThrow("always fails");

    expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("calls onRetry callback for each retry", async () => {
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("first error"))
      .mockRejectedValueOnce(new Error("second error"))
      .mockResolvedValue("done");

    await withRetry(operation, {
      maxRetries: 3,
      initialDelayMs: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, expect.any(Number));
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, expect.any(Number));
  });

  it("applies exponential backoff", async () => {
    const delays: number[] = [];
    const onRetry = vi.fn((_err, _attempt, delay) => delays.push(delay));
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("1"))
      .mockRejectedValueOnce(new Error("2"))
      .mockRejectedValueOnce(new Error("3"))
      .mockResolvedValue("done");

    await withRetry(operation, {
      maxRetries: 4,
      initialDelayMs: 100,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      jitterMs: 0, // disable jitter for predictable testing
      onRetry,
    });

    // First retry: 100ms, Second: 200ms, Third: 400ms
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);
  });

  it("respects maxDelayMs cap", async () => {
    const delays: number[] = [];
    const onRetry = vi.fn((_err, _attempt, delay) => delays.push(delay));
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("1"))
      .mockRejectedValueOnce(new Error("2"))
      .mockRejectedValueOnce(new Error("3"))
      .mockRejectedValueOnce(new Error("4"))
      .mockResolvedValue("done");

    await withRetry(operation, {
      maxRetries: 5,
      initialDelayMs: 500,
      backoffMultiplier: 3,
      maxDelayMs: 1000,
      jitterMs: 0,
      onRetry,
    });

    // Delays would be 500, 1500, 4500... but capped at 1000
    expect(delays[0]).toBe(500);
    expect(delays[1]).toBe(1000); // capped from 1500
    expect(delays[2]).toBe(1000); // capped from 4500
    expect(delays[3]).toBe(1000);
  });

  it("does not retry non-retryable errors by default", async () => {
    const tokenError = new TokenExpiredError("github");
    const operation = vi.fn().mockRejectedValue(tokenError);

    await expect(withRetry(operation, { maxRetries: 3, initialDelayMs: 10 })).rejects.toThrow(
      tokenError
    );

    // TokenExpiredError is not retryable, so only called once
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries rate limit errors", async () => {
    const rateLimitError = new RateLimitExceededError("gitlab", 1000);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue("success");

    const result = await withRetry(operation, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("isRetryableError", () => {
  it("returns true for rate limit errors", () => {
    const error = new RateLimitExceededError("github");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for token expired errors", () => {
    const error = new TokenExpiredError("gitlab");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns true for generic network errors", () => {
    const error = new Error("ECONNRESET");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for timeout errors", () => {
    const error = new Error("ETIMEDOUT");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for auth errors", () => {
    const error = new Error("Invalid credentials");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns true for 5xx status code errors", () => {
    const error = new Error("API error (502): Bad Gateway");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for 4xx status code errors (except rate limit)", () => {
    const error = new Error("API error (400): Bad Request");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isRetryableError("string error")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});
