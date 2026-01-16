import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [
      connectedReposResult,
      completedJobsResult,
      queuedJobsResult,
      latestJobResult,
    ] = await Promise.all([
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
        .select("status, updated_at, repos(full_name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const stats: AuthStats = {
      connectedRepos: connectedReposResult.count ?? 0,
      completedJobs: completedJobsResult.count ?? 0,
      queuedJobs: queuedJobsResult.count ?? 0,
      latestJob: latestJobResult.data
        ? {
            status: latestJobResult.data.status,
            repoName: latestJobResult.data.repos?.full_name ?? null,
            updatedAt: latestJobResult.data.updated_at ?? null,
          }
        : undefined,
    };

    return <AuthenticatedDashboard stats={stats} />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-[Space_Grotesk]">
      <section className="relative isolate overflow-hidden bg-zinc-950 px-6 py-24 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.4em] text-zinc-400">Observe your craft</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            What does your <span className="text-zinc-300">vibe</span> look like when you code?
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-zinc-300">
            Bolokono maps cadence, category shifts, and fix-ups into a narrative for solo builders.
            Metrics first, evidence always—no sales fluff, no file contents, just your habits.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-zinc-600 px-8 py-3 text-base font-semibold text-white transition hover:border-zinc-400"
            >
              Sign in with GitHub
            </Link>
            <Link
              href="/repos"
              className="inline-flex items-center justify-center rounded-full border border-zinc-600 px-8 py-3 text-base font-semibold text-zinc-200 transition hover:border-zinc-400"
            >
              Preview the workspace
            </Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {heroFeatures.map((feature) => (
              <article
                key={feature}
                className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-200 shadow-[0_10px_40px_rgba(2,6,23,0.8)]"
              >
                {feature}
              </article>
            ))}
          </div>
        </div>
      </section>

    <section className="border-b border-zinc-800 bg-zinc-900 px-6 py-16 text-zinc-200 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Solo builder focus</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">This is about your coding vibe</h2>
        </div>
        <p className="text-lg text-zinc-300">
          Bolokono is a tool for solo devs who want to understand their build patterns. We keep it
          open-source, run everything through Supabase RLS, and never guess. Every insight points
          back to a metric and a commit so you can see what happened.
        </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">Privacy</p>
              <p className="mt-4 text-base text-white/70">
                Commit messages stay private. No clone, no file contents. Supabase stores only
                metadata, encrypted tokens, and derived metrics.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">Open source</p>
              <p className="mt-4 text-base text-white/70">
                The worker, metrics, and narrative logic live in this repo. Inspect how we classify
                commits, calculate burstiness, and assign types before you analyze a repo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 px-6 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-white">How an analysis flows</h2>
            <span className="text-sm uppercase tracking-[0.3em] text-white/40">Phase 0</span>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {timeline.map(({ title, description }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-white/70">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-900 px-6 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-white/40">Your craft, surfaced</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">Shape your own builder profile</h2>
          <p className="mt-4 text-lg text-zinc-300">
            Connect a GitHub repo, queue an analysis, and we’ll walk you through the timeline,
            burstiness, and categories that describe how you actually work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-3 text-base font-semibold text-zinc-900 shadow-lg shadow-black/40"
            >
              Start analyzing
            </Link>
            <Link
              href="/repos"
              className="rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:border-white"
            >
              Preview workspace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
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
