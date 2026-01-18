"use server";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  analyzePersonaCoverage,
  detectVibePersona,
  type VibeAxes,
  type PersonaCoverageResult,
} from "@vibed/core";

interface RunCoverageAnalysisResult {
  success: boolean;
  error?: string;
  report?: PersonaCoverageResult & { id: string; createdAt: string };
}

interface RealUserFallback {
  userId: string;
  username: string;
  totalCommits: number;
  totalRepos: number;
  axes: { A: number; B: number; C: number; D: number; E: number; F: number };
  suggestion?: string;
}

export async function runCoverageAnalysis(
  stepSize: number = 20,
  notes?: string
): Promise<RunCoverageAnalysisResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return { success: false, error: "Admin access required" };
  }

  // Run the coverage analysis
  const coverage = analyzePersonaCoverage(stepSize, 20);

  // Get real user fallbacks - users with substantial data who hit fallback
  const realUserFallbacks = await getRealUserFallbacks();

  // Use service role to insert the report
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { success: false, error: "Missing Supabase credentials" };
  }

  const adminSupabase = createClient(url, serviceKey);

  const { data: report, error } = await adminSupabase
    .from("persona_coverage_reports")
    .insert({
      total_combinations: coverage.totalCombinations,
      fallback_count: coverage.fallbackCount,
      fallback_percentage: coverage.fallbackPercentage,
      persona_counts: coverage.personaCounts,
      sample_fallbacks: coverage.sampleFallbacks,
      real_user_fallbacks: realUserFallbacks,
      step_size: stepSize,
      created_by: user.id,
      notes: notes || null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    report: {
      ...coverage,
      id: report.id,
      createdAt: report.created_at,
    },
  };
}

async function getRealUserFallbacks(): Promise<RealUserFallback[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  const supabase = createClient(url, serviceKey);

  // Get all user profiles with substantial data
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, total_commits, total_repos, axes_json, persona_id")
    .gte("total_commits", 100) // Users with at least 100 commits
    .gte("total_repos", 2); // And at least 2 repos

  if (!profiles) return [];

  const fallbacks: RealUserFallback[] = [];

  for (const profile of profiles) {
    // Re-detect persona to get diagnostics
    const axes = profile.axes_json as VibeAxes;
    if (!axes) continue;

    const persona = detectVibePersona(axes, {
      commitCount: profile.total_commits,
      prCount: 0,
      dataQualityScore: 80,
    });

    if (persona.diagnostics?.isFallback) {
      // Get username
      const { data: userData } = await supabase
        .from("users")
        .select("github_username")
        .eq("id", profile.user_id)
        .single();

      fallbacks.push({
        userId: profile.user_id,
        username: userData?.github_username ?? "unknown",
        totalCommits: profile.total_commits,
        totalRepos: profile.total_repos,
        axes: persona.diagnostics.axes,
        suggestion: persona.diagnostics.suggestion,
      });
    }
  }

  return fallbacks;
}

export async function getCoverageReports(limit: number = 10) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", reports: [] };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return { success: false, error: "Admin access required", reports: [] };
  }

  const { data: reports, error } = await supabase
    .from("persona_coverage_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message, reports: [] };
  }

  return { success: true, reports: reports ?? [] };
}

export async function getAdminStats() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return null;
  }

  // Use service role to get counts
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const adminSupabase = createClient(url, serviceKey);

  const [usersResult, profilesResult, jobsResult, reportsResult] = await Promise.all([
    adminSupabase.from("users").select("id", { count: "exact", head: true }),
    adminSupabase.from("user_profiles").select("user_id", { count: "exact", head: true }),
    adminSupabase.from("analysis_jobs").select("id", { count: "exact", head: true }).eq("status", "done"),
    adminSupabase.from("persona_coverage_reports").select("id", { count: "exact", head: true }),
  ]);

  // Get persona distribution
  const { data: personaData } = await adminSupabase
    .from("user_profiles")
    .select("persona_id");

  const personaDistribution: Record<string, number> = {};
  for (const p of personaData ?? []) {
    const id = p.persona_id ?? "unknown";
    personaDistribution[id] = (personaDistribution[id] ?? 0) + 1;
  }

  return {
    totalUsers: usersResult.count ?? 0,
    usersWithProfiles: profilesResult.count ?? 0,
    completedJobs: jobsResult.count ?? 0,
    coverageReports: reportsResult.count ?? 0,
    personaDistribution,
  };
}
