/**
 * Community stats eligibility and thresholds.
 * See docs/prd/platform/prd-community-stats.md for specification.
 */

/** Minimum total_commits for a profile to be included in community aggregates. */
export const COMMUNITY_ELIGIBLE_MIN_COMMITS = 80;

/** Minimum eligible profiles before the community page is shown at all. */
export const COMMUNITY_GLOBAL_THRESHOLD = 10;

/** Minimum profiles in a breakdown bucket before that row is published. */
export const COMMUNITY_BUCKET_THRESHOLD = 25;

export function isEligibleForCommunityStats(totalCommits: number): boolean {
  return totalCommits >= COMMUNITY_ELIGIBLE_MIN_COMMITS;
}
