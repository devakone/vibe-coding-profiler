import type { VibeAxes, AIToolMetrics } from "@vibed/core";

/**
 * Public profile visibility settings.
 * Stored as JSONB in public.users.public_profile_settings.
 */
export interface PublicProfileSettings {
  profile_enabled: boolean;
  show_persona: boolean;
  show_tagline: boolean;
  show_confidence: boolean;
  show_axes_chart: boolean;
  show_style_descriptor: boolean;
  show_total_repos: boolean;
  show_total_commits: boolean;
  show_narrative: boolean;
  show_insight_cards: boolean;
  show_repo_breakdown: boolean;
  show_repo_names: boolean;
  show_peak_time: boolean;
  show_shipping_rhythm: boolean;
  show_near_miss_personas: boolean;
  show_avatar: boolean;
  show_ai_tools: boolean;
}

export const DEFAULT_PUBLIC_PROFILE_SETTINGS: PublicProfileSettings = {
  profile_enabled: false,
  show_persona: true,
  show_tagline: true,
  show_confidence: true,
  show_axes_chart: true,
  show_style_descriptor: true,
  show_total_repos: true,
  show_total_commits: true,
  show_narrative: false,
  show_insight_cards: false,
  show_repo_breakdown: false,
  show_repo_names: false,
  show_peak_time: false,
  show_shipping_rhythm: false,
  show_near_miss_personas: false,
  show_avatar: true,
  show_ai_tools: true,
};

/**
 * Data shape returned by the public profile API for the unified VCP page.
 */
export interface PublicProfileData {
  username: string;
  avatar_url: string | null;
  persona_name: string;
  persona_id: string;
  persona_tagline: string | null;
  persona_confidence: string | null;
  persona_score: number;
  total_repos: number | null;
  total_commits: number | null;
  axes: VibeAxes | null;
  clarity: number | null;
  narrative: string | null;
  insight_cards: unknown[] | null;
  repo_breakdown: RepoPersonaSummary[] | null;
  ai_tools: AIToolMetrics | null;
  settings: PublicProfileSettings;
}

/**
 * Summary of a single repo's persona for the public repo breakdown.
 */
export interface RepoPersonaSummary {
  repo_name: string;
  repo_slug: string;
  persona_name: string;
  persona_id: string;
  persona_tagline: string | null;
  commit_count: number;
}

/**
 * Data shape for a per-repo public VCP page.
 */
export interface PublicRepoProfileData {
  username: string;
  repo_name: string;
  repo_slug: string;
  persona_name: string;
  persona_id: string;
  persona_tagline: string | null;
  persona_confidence: string;
  persona_score: number;
  axes: VibeAxes | null;
  cards: unknown[] | null;
  evidence: unknown | null;
}
