import ReposClient from "./ReposClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

export default async function ReposPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_repos")
    .select("repo_id, repos(id, full_name, platform)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  const rows = (data ?? []) as unknown as Array<{
    repo_id: string;
    repos: { full_name: string; platform: string } | null;
  }>;

  const initialConnected = rows
    .filter((r) => Boolean(r.repos?.full_name))
    .map((r) => ({
      repo_id: r.repo_id,
      full_name: r.repos!.full_name,
      platform: (r.repos!.platform as "github" | "gitlab" | "bitbucket") ?? "github",
    }));

  const { data: analyzedJobs } = await supabase
    .from("analysis_jobs")
    .select("id, repo_id, created_at")
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  const latestJobByRepoId: Record<string, string> = {};
  for (const row of (analyzedJobs ?? []) as Array<{ id: string; repo_id: string | null }>) {
    if (!row.repo_id) continue;
    if (!latestJobByRepoId[row.repo_id]) latestJobByRepoId[row.repo_id] = row.id;
  }

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-3xl">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Your repos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Pick a repo for a vibe check
          </h1>
          <p className="text-sm text-zinc-700 sm:text-base">
            Each repo adds to your profile. Start with something safe and non-sensitive.
          </p>
        </header>

        <ReposClient
          userId={user.id}
          initialConnected={initialConnected}
          latestJobByRepoId={latestJobByRepoId}
        />
      </div>
    </div>
  );
}
