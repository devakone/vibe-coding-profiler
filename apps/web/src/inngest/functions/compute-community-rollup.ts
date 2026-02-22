import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import {
  computeCommunityRollup,
  type CommunitySnapshot,
} from "@vibe-coding-profiler/core";

const ROLLUP_VERSION = "community-v1";

/**
 * Scheduled function: recompute community stats rollup every hour.
 *
 * Reads all eligible snapshots from community_profile_snapshots,
 * computes the aggregate payload, and upserts into community_rollups.
 */
export const computeCommunityRollupFn = inngest.createFunction(
  { id: "compute-community-rollup", retries: 3 },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Fetch all eligible snapshots
    const snapshots = await step.run("fetch-snapshots", async () => {
      const { data, error } = await supabase
        .from("community_profile_snapshots")
        .select(
          "user_id, total_commits, total_repos, persona_id, persona_confidence, " +
          "automation_heaviness, guardrail_strength, iteration_loop_intensity, " +
          "planning_signal, surface_area_per_change, shipping_rhythm, " +
          "ai_collaboration_rate, ai_tool_diversity, ai_tools_detected"
        )
        .eq("is_eligible", true);

      if (error) {
        throw new Error(`Failed to fetch snapshots: ${error.message}`);
      }

      return (data ?? []) as unknown as CommunitySnapshot[];
    });

    // Step 2: Compute rollup and store
    await step.run("compute-and-store", async () => {
      const payload = computeCommunityRollup(snapshots);
      const asOfDate = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("community_rollups").insert({
        window: "30d",
        as_of_date: asOfDate,
        payload_json: payload,
        eligible_profiles: snapshots.length,
        source_version: ROLLUP_VERSION,
        generated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to store rollup: ${error.message}`);
      }

      console.log(
        `Community rollup computed: ${snapshots.length} eligible profiles, suppressed=${payload.suppressed}`
      );

      return { eligible: snapshots.length, suppressed: payload.suppressed };
    });
  }
);
