import { track } from "@plausible-analytics/tracker";

/**
 * Track a custom event in Plausible Analytics.
 *
 * @param eventName - Name of the event (e.g., "signup", "analyze_repo")
 * @param props - Optional custom properties to attach to the event
 * @param options - Optional tracking options (interactive, revenue)
 */
export function trackEvent(
  eventName: string,
  props?: Record<string, string>,
  options?: {
    interactive?: boolean;
    revenue?: { amount: number; currency: string };
  }
) {
  // Only track if domain is configured
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    return;
  }

  track(eventName, {
    props,
    interactive: options?.interactive,
    revenue: options?.revenue,
  });
}

/**
 * Pre-defined event names for type safety and consistency.
 */
export const AnalyticsEvents = {
  // Auth events
  SIGN_IN: "sign_in",
  SIGN_OUT: "sign_out",

  // Repo events
  REPO_CONNECT: "repo_connect",
  REPO_DISCONNECT: "repo_disconnect",
  REPO_ANALYZE: "repo_analyze",
  REPO_REANALYZE: "repo_reanalyze",

  // Profile events
  PROFILE_VIEW: "profile_view",
  PROFILE_SHARE: "profile_share",
  PROFILE_DOWNLOAD_IMAGE: "profile_download_image",

  // Analysis events
  ANALYSIS_VIEW: "analysis_view",
  ANALYSIS_SHARE: "analysis_share",

  // Settings events
  PUBLIC_PROFILE_ENABLED: "public_profile_enabled",
  PUBLIC_PROFILE_DISABLED: "public_profile_disabled",
  LLM_KEY_ADDED: "llm_key_added",
  LLM_KEY_REMOVED: "llm_key_removed",
  LLM_OPT_IN_ENABLED: "llm_opt_in_enabled",
  LLM_OPT_IN_DISABLED: "llm_opt_in_disabled",
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
