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

// =============================================================================
// Admin User Management
// =============================================================================

export interface AdminUser {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
  profile?: {
    persona_id: string;
    persona_name: string;
    persona_confidence: string;
    total_commits: number;
    total_repos: number;
    updated_at: string | null;
  } | null;
  jobCounts?: {
    total: number;
    done: number;
    queued: number;
    running: number;
    failed: number;
  };
}

export async function getAdminUsers(
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; error?: string; users: AdminUser[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", users: [], total: 0 };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return { success: false, error: "Admin access required", users: [], total: 0 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { success: false, error: "Missing credentials", users: [], total: 0 };
  }

  const adminSupabase = createClient(url, serviceKey);

  // Get total count
  const { count: totalCount } = await adminSupabase
    .from("users")
    .select("id", { count: "exact", head: true });

  // Get users with profiles
  const { data: users, error } = await adminSupabase
    .from("users")
    .select(`
      id,
      github_username,
      avatar_url,
      email,
      is_admin,
      created_at
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { success: false, error: error.message, users: [], total: 0 };
  }

  // Get profiles for these users
  const userIds = (users ?? []).map((u) => u.id);
  const { data: profiles } = await adminSupabase
    .from("user_profiles")
    .select("user_id, persona_id, persona_name, persona_confidence, total_commits, total_repos, updated_at")
    .in("user_id", userIds);

  const profileByUserId = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // Get job counts for these users
  const { data: jobCounts } = await adminSupabase
    .from("analysis_jobs")
    .select("user_id, status")
    .in("user_id", userIds);

  const jobCountsByUserId = new Map<string, AdminUser["jobCounts"]>();
  for (const job of jobCounts ?? []) {
    const existing = jobCountsByUserId.get(job.user_id) ?? {
      total: 0,
      done: 0,
      queued: 0,
      running: 0,
      failed: 0,
    };
    existing.total++;
    if (job.status === "done") existing.done++;
    else if (job.status === "queued") existing.queued++;
    else if (job.status === "running") existing.running++;
    else if (job.status === "failed") existing.failed++;
    jobCountsByUserId.set(job.user_id, existing);
  }

  const adminUsers: AdminUser[] = (users ?? []).map((u) => ({
    ...u,
    is_admin: u.is_admin ?? false,
    profile: profileByUserId.get(u.id) ?? null,
    jobCounts: jobCountsByUserId.get(u.id),
  }));

  return { success: true, users: adminUsers, total: totalCount ?? 0 };
}

export interface AdminUserDetail extends AdminUser {
  repos: Array<{
    id: string;
    full_name: string;
    connected_at: string;
    disconnected_at: string | null;
  }>;
  jobs: Array<{
    id: string;
    repo_name: string | null;
    status: string;
    commit_count: number | null;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
  }>;
  profileAxes: Record<string, { score: number; level: string }> | null;
  vibeInsights: Array<{
    job_id: string;
    persona_id: string;
    persona_name: string;
    persona_confidence: string;
    axes: Record<string, { score: number }>;
  }>;
}

export async function getAdminUserDetail(
  userId: string
): Promise<{ success: boolean; error?: string; user: AdminUserDetail | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", user: null };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return { success: false, error: "Admin access required", user: null };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { success: false, error: "Missing credentials", user: null };
  }

  const adminSupabase = createClient(url, serviceKey);

  // Get user
  const { data: targetUser, error: userError } = await adminSupabase
    .from("users")
    .select("id, github_username, avatar_url, email, is_admin, created_at")
    .eq("id", userId)
    .single();

  if (userError || !targetUser) {
    return { success: false, error: "User not found", user: null };
  }

  // Get profile
  const { data: profile } = await adminSupabase
    .from("user_profiles")
    .select("persona_id, persona_name, persona_confidence, total_commits, total_repos, updated_at, axes_json")
    .eq("user_id", userId)
    .single();

  // Get connected repos
  const { data: userRepos } = await adminSupabase
    .from("user_repos")
    .select("repo_id, connected_at, disconnected_at")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  const repoIds = (userRepos ?? []).map((r) => r.repo_id).filter(Boolean);
  const { data: repos } = await adminSupabase
    .from("repos")
    .select("id, full_name")
    .in("id", repoIds);

  const repoNameById = new Map((repos ?? []).map((r) => [r.id, r.full_name]));

  // Get jobs
  const { data: jobs } = await adminSupabase
    .from("analysis_jobs")
    .select("id, repo_id, status, commit_count, created_at, completed_at, error_message")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get vibe insights for this user's jobs
  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: vibeInsights } = await adminSupabase
    .from("vibe_insights")
    .select("job_id, persona_id, persona_name, persona_confidence, axes_json")
    .in("job_id", jobIds);

  return {
    success: true,
    user: {
      ...targetUser,
      is_admin: targetUser.is_admin ?? false,
      profile: profile
        ? {
            persona_id: profile.persona_id,
            persona_name: profile.persona_name,
            persona_confidence: profile.persona_confidence,
            total_commits: profile.total_commits,
            total_repos: profile.total_repos,
            updated_at: profile.updated_at,
          }
        : null,
      profileAxes: profile?.axes_json as Record<string, { score: number; level: string }> | null,
      repos: (userRepos ?? []).map((ur) => ({
        id: ur.repo_id ?? "",
        full_name: repoNameById.get(ur.repo_id ?? "") ?? "Unknown",
        connected_at: ur.connected_at,
        disconnected_at: ur.disconnected_at,
      })),
      jobs: (jobs ?? []).map((j) => ({
        id: j.id,
        repo_name: repoNameById.get(j.repo_id ?? "") ?? null,
        status: j.status,
        commit_count: j.commit_count,
        created_at: j.created_at,
        completed_at: j.completed_at,
        error_message: j.error_message,
      })),
      vibeInsights: (vibeInsights ?? []).map((v) => ({
        job_id: v.job_id,
        persona_id: v.persona_id,
        persona_name: v.persona_name,
        persona_confidence: v.persona_confidence,
        axes: v.axes_json as Record<string, { score: number }>,
      })),
    },
  };
}

export async function getAllJobs(
  limit: number = 50,
  offset: number = 0,
  statusFilter?: string
): Promise<{
  success: boolean;
  error?: string;
  jobs: Array<{
    id: string;
    user_id: string;
    username: string | null;
    repo_name: string | null;
    status: string;
    commit_count: number | null;
    created_at: string;
    completed_at: string | null;
    profile_updated: boolean;
    profile_persona: string | null;
  }>;
  total: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", jobs: [], total: 0 };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    return { success: false, error: "Admin access required", jobs: [], total: 0 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { success: false, error: "Missing credentials", jobs: [], total: 0 };
  }

  const adminSupabase = createClient(url, serviceKey);

  // Build query
  let countQuery = adminSupabase.from("analysis_jobs").select("id", { count: "exact", head: true });
  let dataQuery = adminSupabase
    .from("analysis_jobs")
    .select("id, user_id, repo_id, status, commit_count, created_at, completed_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    countQuery = countQuery.eq("status", statusFilter);
    dataQuery = dataQuery.eq("status", statusFilter);
  }

  const [{ count: totalCount }, { data: jobs, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  if (error) {
    return { success: false, error: error.message, jobs: [], total: 0 };
  }

  // Get user and repo names
  const userIds = [...new Set((jobs ?? []).map((j) => j.user_id))];
  const repoIds = [...new Set((jobs ?? []).map((j) => j.repo_id).filter(Boolean))];
  const jobIds = (jobs ?? []).map((j) => j.id);

  const [{ data: users }, { data: repos }, { data: profileHistory }] = await Promise.all([
    adminSupabase.from("users").select("id, github_username").in("id", userIds),
    adminSupabase.from("repos").select("id, full_name").in("id", repoIds),
    // Get profile history entries triggered by these jobs
    adminSupabase
      .from("user_profile_history")
      .select("trigger_job_id, profile_snapshot")
      .in("trigger_job_id", jobIds),
  ]);

  const usernameById = new Map((users ?? []).map((u) => [u.id, u.github_username]));
  const repoNameById = new Map((repos ?? []).map((r) => [r.id, r.full_name]));

  // Map job ID to profile update info
  const profileUpdateByJobId = new Map<string, { persona: string | null }>();
  for (const ph of profileHistory ?? []) {
    if (ph.trigger_job_id) {
      const snapshot = ph.profile_snapshot as { persona?: { name?: string } } | null;
      profileUpdateByJobId.set(ph.trigger_job_id, {
        persona: snapshot?.persona?.name ?? null,
      });
    }
  }

  return {
    success: true,
    jobs: (jobs ?? []).map((j) => {
      const profileUpdate = profileUpdateByJobId.get(j.id);
      return {
        id: j.id,
        user_id: j.user_id,
        username: usernameById.get(j.user_id) ?? null,
        repo_name: repoNameById.get(j.repo_id ?? "") ?? null,
        status: j.status,
        commit_count: j.commit_count,
        created_at: j.created_at,
        completed_at: j.completed_at,
        profile_updated: Boolean(profileUpdate),
        profile_persona: profileUpdate?.persona ?? null,
      };
    }),
    total: totalCount ?? 0,
  };
}
