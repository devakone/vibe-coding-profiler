import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@bolokono/db";

const heroFeatures = [
  "Capture your commits without exposing file contents",
  "Trace build categories, burstiness, and fixup sequences",
  "Narratives cite exact SHAs and metric values",
  "Supabase handles auth + RLS; you control the data",
];

const timeline = [
  { title: "Connect your repo", description: "Grant limited GitHub scopes and keep tokens encrypted." },
  { title: "Queue an analysis job", description: "Supabase records the request and job status." },
  { title: "Worker sketches your rhythm", description: "Commit timing, categories, and fixups become metrics." },
  { title: "Read your Bolokono profile", description: "Type, timeline, and narrative explain your vibe." },
];

type AuthStats = {
  connectedRepos: number;
  completedJobs: number;
  queuedJobs: number;
  latestJob?: {
    status: string;
    repoName: string | null;
    updatedAt: string | null;
  };
};

type LatestJobRow = Pick<
  Database["public"]["Tables"]["analysis_jobs"]["Row"],
  "status" | "repo_id" | "created_at" | "started_at" | "completed_at"
>;

type RepoNameRow = Pick<
  Database["public"]["Tables"]["repos"]["Row"],
  "full_name"
>;

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [connectedReposResult, completedJobsResult, queuedJobsResult, latestJobResult] =
    await Promise.all([
      supabase
        .from("user_repos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("disconnected_at", null),
      supabase
        .from("analysis_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "done"),
      supabase
        .from("analysis_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["queued", "running"]),
      supabase
        .from("analysis_jobs")
        .select("status,created_at,started_at,completed_at,repo_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const latestJob = (latestJobResult.data ?? null) as unknown as LatestJobRow | null;

  const repoNameResult = latestJob?.repo_id
    ? await supabase
        .from("repos")
        .select("full_name")
        .eq("id", latestJob.repo_id)
        .maybeSingle()
    : null;

  const repoName = (repoNameResult?.data ?? null) as unknown as RepoNameRow | null;

  const stats: AuthStats = {
    connectedRepos: connectedReposResult.count ?? 0,
    completedJobs: completedJobsResult.count ?? 0,
    queuedJobs: queuedJobsResult.count ?? 0,
    latestJob: latestJob
      ? {
          status: latestJob.status,
          repoName: repoName?.full_name ?? null,
          updatedAt:
            latestJob.completed_at ??
            latestJob.started_at ??
            latestJob.created_at ??
            null,
        }
      : undefined,
  };

  return <AuthenticatedDashboard stats={stats} />;
}

function AuthenticatedDashboard({ stats }: { stats: AuthStats }) {
  const cards = [
    {
      label: "Connected repos",
      value: stats.connectedRepos,
      helper: "Active connections",
    },
    {
      label: "Finished analyses",
      value: stats.completedJobs,
      helper: "Bolokono profiles generated",
    },
    {
      label: "Queued or running",
      value: stats.queuedJobs,
      helper: "Jobs in progress",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Authenticated workspace</p>
          <h1 className="text-4xl font-semibold text-white">Your Bolokono dashboard</h1>
          <p className="text-lg text-white/70">
            A single pane for monitoring your repos, job status, and insights. Everything here is
            backed by Supabase data and secure by design.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ label, value, helper }) => (
            <article
              key={label}
              className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.7)]"
            >
              <p className="text-sm uppercase tracking-[0.4em] text-white/40">{label}</p>
              <p className="mt-4 text-4xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-sm text-white/70">{helper}</p>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/80 to-cyan-500/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Latest job</p>
              <p className="text-2xl font-semibold text-white">
                {stats.latestJob?.repoName ?? "No jobs yet"}
              </p>
              <p className="text-sm text-white/80">
                Status: {stats.latestJob?.status ?? "waiting for queue"}
                {stats.latestJob?.updatedAt ? ` • Updated ${new Date(stats.latestJob.updatedAt).toLocaleString()}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/repos"
                className="rounded-full border border-white/60 px-6 py-2 text-sm font-semibold text-white transition hover:border-white"
              >
                Manage repos
              </Link>
              <Link
                href="/analysis"
                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-900"
              >
                View reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
