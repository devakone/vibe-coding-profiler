/**
 * LLM API Key Encryption Utilities
 *
 * Uses a separate encryption key from GitHub tokens for defense in depth.
 */

import { encryptString, decryptString, maskApiKey } from "@vibe-coding-profiler/core";

const LLM_KEY_ENV = "LLM_KEY_ENCRYPTION_SECRET";

function getEncryptionKey(): string {
  const key = process.env[LLM_KEY_ENV];
  if (!key) {
    throw new Error(`Missing ${LLM_KEY_ENV} environment variable`);
  }
  return key;
}

/**
 * Encrypt an LLM API key for storage.
 */
export function encryptLLMKey(plaintext: string): string {
  return encryptString(plaintext, getEncryptionKey());
}

/**
 * Decrypt an LLM API key from storage.
 */
export function decryptLLMKey(ciphertext: string): string {
  return decryptString(ciphertext, getEncryptionKey());
}

/**
 * Mask an API key for display (show prefix + last 4 chars).
 * Re-exported from @vibe-coding-profiler/core for convenience.
 */
export { maskApiKey };

/**
 * Check if LLM key encryption is configured.
 * Returns false if the encryption secret is not set.
 */
export function isLLMKeyEncryptionConfigured(): boolean {
  return Boolean(process.env[LLM_KEY_ENV]);
}
