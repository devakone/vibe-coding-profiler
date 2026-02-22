/**
 * One-time backfill: populate community_profile_snapshots from existing user_profiles.
 *
 * Usage:
 *   node scripts/backfill-community-snapshots.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 * (loaded from apps/web/.env.local if present).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ELIGIBLE_MIN_COMMITS = 80;
const ANALYZER_VERSION = "backfill-v1";

// ---------------------------------------------------------------------------
// Load env from .env.local (same pattern as scripts/supabase.mjs)
// ---------------------------------------------------------------------------
function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^export\s+/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && (process.env[key] === undefined || process.env[key] === "")) {
      process.env[key] = value;
    }
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnvFile(path.join(repoRoot, "apps/web/.env.local"));
loadDotEnvFile(path.join(repoRoot, "apps/web/.env"));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Fetching user_profiles...");

const { data: profiles, error } = await supabase
  .from("user_profiles")
  .select("user_id, total_commits, total_repos, persona_id, persona_confidence, persona_score, axes_json, ai_tools_json");

if (error) {
  console.error("Failed to fetch profiles:", error.message);
  process.exit(1);
}

console.log(`Found ${profiles.length} profiles. Upserting snapshots...`);

let success = 0;
let failed = 0;

for (const p of profiles) {
  const axes = p.axes_json ?? {};
  const ai = p.ai_tools_json;

  const row = {
    user_id: p.user_id,
    snapshot_date: new Date().toISOString().split("T")[0],
    is_eligible: p.total_commits >= ELIGIBLE_MIN_COMMITS,
    total_commits: p.total_commits,
    total_repos: p.total_repos,
    persona_id: p.persona_id,
    persona_confidence: p.persona_confidence,
    persona_score: p.persona_score ?? 0,
    automation_heaviness: axes.automation_heaviness?.score ?? 0,
    guardrail_strength: axes.guardrail_strength?.score ?? 0,
    iteration_loop_intensity: axes.iteration_loop_intensity?.score ?? 0,
    planning_signal: axes.planning_signal?.score ?? 0,
    surface_area_per_change: axes.surface_area_per_change?.score ?? 0,
    shipping_rhythm: axes.shipping_rhythm?.score ?? 0,
    ai_collaboration_rate: ai?.ai_collaboration_rate ?? null,
    ai_tool_diversity: ai?.tool_diversity ?? null,
    ai_tools_detected: ai?.detected ?? null,
    source_version: ANALYZER_VERSION,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("community_profile_snapshots")
    .upsert(row, { onConflict: "user_id" });

  if (upsertError) {
    console.error(`  Failed for user ${p.user_id}: ${upsertError.message}`);
    failed++;
  } else {
    success++;
  }
}

const eligible = profiles.filter((p) => p.total_commits >= ELIGIBLE_MIN_COMMITS).length;
console.log(`Done. ${success} upserted, ${failed} failed. ${eligible} eligible (>= ${ELIGIBLE_MIN_COMMITS} commits).`);
