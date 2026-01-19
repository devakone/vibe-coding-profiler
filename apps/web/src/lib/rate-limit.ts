/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting with bypass for development and admin users.
 */

import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RateLimitRpcLike = {
  rpc: (
    fn: string,
    args: {
      p_user_id: string;
      p_action: string;
      p_window_seconds: number;
      p_max_count: number;
    }
  ) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Check if we're in development mode (localhost)
 */
function isDevelopment(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

/**
 * Check if a user is an admin (using service client to bypass RLS)
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  const service = createSupabaseServiceClient();
  const { data } = await service
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return (data as { is_admin?: boolean } | null)?.is_admin === true;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "rate_limited" | "error" };

/**
 * Check rate limit for a user action.
 *
 * Bypasses rate limiting for:
 * - Development mode (localhost)
 * - Admin users
 *
 * @param userId - The user ID to check
 * @param action - The action name (e.g., "analysis_start")
 * @param windowSeconds - Time window in seconds
 * @param maxCount - Maximum allowed actions in the window
 */
export async function checkRateLimit(params: {
  userId: string;
  action: string;
  windowSeconds: number;
  maxCount: number;
}): Promise<RateLimitResult> {
  const { userId, action, windowSeconds, maxCount } = params;

  // Bypass 1: Development mode
  if (isDevelopment()) {
    return { allowed: true };
  }

  // Bypass 2: Admin users
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return { allowed: true };
  }

  // Normal rate limiting via database RPC
  const service = createSupabaseServiceClient();
  const { data: allowedData, error: rateLimitError } = await (
    service as unknown as RateLimitRpcLike
  ).rpc("consume_user_action_rate_limit", {
    p_user_id: userId,
    p_action: action,
    p_window_seconds: windowSeconds,
    p_max_count: maxCount,
  });

  if (rateLimitError) {
    console.error("Rate limit RPC error:", rateLimitError);
    return { allowed: false, reason: "error" };
  }

  if (allowedData !== true && allowedData !== false) {
    return { allowed: false, reason: "error" };
  }

  if (allowedData === false) {
    return { allowed: false, reason: "rate_limited" };
  }

  return { allowed: true };
}
