import type { PlatformType } from "./types";

/**
 * Base error class for platform-specific errors
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly platform: PlatformType,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

/**
 * Error thrown when a platform access token has expired
 */
export class TokenExpiredError extends PlatformError {
  constructor(platform: PlatformType) {
    super(
      `${platform} access token has expired. Please reconnect your account.`,
      platform,
      401
    );
    this.name = "TokenExpiredError";
  }
}

/**
 * Error thrown when platform rate limit is exceeded
 */
export class RateLimitExceededError extends PlatformError {
  constructor(
    platform: PlatformType,
    public readonly retryAfterMs?: number
  ) {
    super(`${platform} API rate limit exceeded.`, platform, 429);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Error thrown when repository is not found or inaccessible
 */
export class RepoNotFoundError extends PlatformError {
  constructor(platform: PlatformType, repoName?: string) {
    const detail = repoName ? ` (${repoName})` : "";
    super(
      `Repository not found${detail} or you may not have access.`,
      platform,
      404
    );
    this.name = "RepoNotFoundError";
  }
}

/**
 * Type guard to check if an error is a TokenExpiredError
 */
export function isTokenExpiredError(error: unknown): error is TokenExpiredError {
  if (error instanceof TokenExpiredError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("401") ||
      message.includes("unauthorized") ||
      message.includes("token expired") ||
      message.includes("bad credentials")
    );
  }
  return false;
}

/**
 * Type guard to check if an error is a RateLimitExceededError
 */
export function isRateLimitError(error: unknown): error is RateLimitExceededError {
  if (error instanceof RateLimitExceededError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("too many requests")
    );
  }
  return false;
}

/**
 * Type guard to check if an error is retryable (5xx, network errors, rate limits)
 */
export function isRetryableError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return /\b(50[0-4]|network|timeout|econnreset|enotfound|etimedout)\b/i.test(message);
}

/**
 * User-friendly error messages by error type and platform
 */
export const PLATFORM_ERROR_MESSAGES = {
  TOKEN_EXPIRED: {
    github: "Your GitHub access has expired. Please reconnect your account.",
    gitlab: "Your GitLab access has expired. Please reconnect your account.",
    bitbucket: "Your Bitbucket access has expired. Please reconnect your account.",
  },
  RATE_LIMITED: {
    github: "GitHub API rate limit reached. Analysis will retry automatically.",
    gitlab: "GitLab API rate limit reached. Analysis will retry automatically.",
    bitbucket: "Bitbucket API rate limit reached. Analysis will retry automatically.",
  },
  REPO_NOT_FOUND: {
    github: "Repository not found or you may not have access.",
    gitlab: "Project not found or you may not have access.",
    bitbucket: "Repository not found or you may not have access.",
  },
  NETWORK_ERROR: "Network error occurred. Please check your connection and try again.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
} as const;

/**
 * Get a user-friendly error message
 */
export function getPlatformErrorMessage(
  errorType: keyof typeof PLATFORM_ERROR_MESSAGES,
  platform?: PlatformType
): string {
  const messages = PLATFORM_ERROR_MESSAGES[errorType];
  if (typeof messages === "string") return messages;
  if (platform && platform in messages) {
    return messages[platform as keyof typeof messages];
  }
  return PLATFORM_ERROR_MESSAGES.UNKNOWN;
}
