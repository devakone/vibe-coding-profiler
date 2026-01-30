/**
 * Username validation and normalization utilities.
 *
 * Rules mirror the CHECK constraint in public.users.username:
 * - 3-39 characters
 * - Lowercase alphanumeric and single hyphens
 * - Must start and end with alphanumeric
 * - No consecutive hyphens
 */

const USERNAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 39;

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsername(input: string): UsernameValidationResult {
  if (!input) {
    return { valid: false, error: "Username is required" };
  }

  const normalized = input.toLowerCase().trim();

  if (normalized.length < MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${MIN_LENGTH} characters` };
  }

  if (normalized.length > MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${MAX_LENGTH} characters` };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: "Username can only contain lowercase letters, numbers, and single hyphens (must start and end with a letter or number)",
    };
  }

  if (normalized.includes("--")) {
    return { valid: false, error: "Username cannot contain consecutive hyphens" };
  }

  return { valid: true };
}

export function normalizeUsername(input: string): string {
  return input.toLowerCase().trim();
}
