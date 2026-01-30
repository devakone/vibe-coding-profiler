import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import ReposClient from "@/app/repos/ReposClient";
import type { PlatformType } from "@vibe-coding-profiler/core";

export const runtime = "nodejs";

export const metadata = {
  title: "Repos · Settings · Vibe Coding Profiler",
  description: "Manage your connected repositories across platforms",
};

export default async function RepoSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch connected repos
  const { data } = await supabase
    .from("user_repos")
    .select("repo_id, repos(id, full_name, platform)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  const rows = (data ?? []) as unknown as Array<{
    repo_id: string;
    repos: { id: string; full_name: string; platform: string } | null;
  }>;

  const initialConnected = rows
    .filter((r) => Boolean(r.repos?.full_name))
    .map((r) => ({
      repo_id: r.repo_id,
      full_name: r.repos!.full_name,
      platform: (r.repos!.platform as PlatformType) ?? "github",
    }));

  // Fetch analyzed jobs
  const { data: analyzedJobs } = await supabase
    .from("analysis_jobs")
    .select("id, repo_id")
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  const latestJobByRepoId: Record<string, string> = {};
  for (const row of (analyzedJobs ?? []) as Array<{ id: string; repo_id: string | null }>) {
    if (!row.repo_id) continue;
    if (!latestJobByRepoId[row.repo_id]) latestJobByRepoId[row.repo_id] = row.id;
  }

  // Fetch connected platforms
  const { data: platformConnections } = await supabase
    .from("platform_connections")
    .select("platform")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  const connectedPlatforms = ((platformConnections ?? []) as Array<{ platform: string }>)
    .map((p) => p.platform as PlatformType)
    .filter(Boolean);

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Link href="/settings/llm-keys" className="hover:text-zinc-900">
              Settings
            </Link>
            <span>/</span>
            <span className="text-zinc-900">Repos</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Connected Repos
          </h1>
          <p className="mt-2 text-zinc-600">
            Manage the repositories connected to your Vibe Coding Profile.
          </p>
        </div>

        {/* Settings Tabs */}
        <SettingsTabs activeTab="repos" />

        {/* Main Content */}
          <ReposClient
            userId={user.id}
            initialConnected={initialConnected}
            latestJobByRepoId={latestJobByRepoId}
            connectedPlatforms={connectedPlatforms}
            mode="settings"
          />
      </div>
    </div>
  );
}

