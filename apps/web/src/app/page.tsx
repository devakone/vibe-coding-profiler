import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@bolokono/db";

const heroFeatures = [
  "Turn commit history into a build-rhythm profile",
  "See burstiness, fixups, and build categories over time",
  "Read a narrative that cites exact SHAs and metric values",
  "Supabase Auth + RLS scope user-facing reads to your account",
];

const timeline = [
  { title: "Connect GitHub", description: "Sign in and pick the repos you want to analyze." },
  { title: "Queue an analysis", description: "We fetch commit history and compute metrics." },
  { title: "Get your profile", description: "See patterns, archetype, and evidence SHAs." },
  { title: "Share responsibly", description: "Keep private repos private; share only what you intend to share." },
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

  if (!user) return <MarketingLanding />;

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

function MarketingLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              For solo builders
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Bolokono turns git history into a build-rhythm profile
            </h1>
            <p className="max-w-2xl text-base text-white/70 sm:text-lg">
              Analyze commit metadata, compute metrics, and generate a narrative that points to
              evidence SHAs. No magic claims. Just a clean view of how you build.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/security"
              className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40"
            >
              Security
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-900"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <h2 className="text-2xl font-semibold text-white">What you get</h2>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              {heroFeatures.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300/70" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-900"
              >
                Start with GitHub
              </Link>
              <Link
                href="/security"
                className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40"
              >
                Read security notes
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/70 to-cyan-500/50 p-8">
            <h2 className="text-2xl font-semibold text-white">How it works</h2>
            <div className="mt-6 grid gap-4">
              {timeline.map((step) => (
                <div key={step.title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-white/80">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Bolokono</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/security" className="transition hover:text-white">
              Security
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </div>
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
            backed by Supabase data and scoped access controls.
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
