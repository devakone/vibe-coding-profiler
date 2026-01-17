import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@vibed/db";
import { wrappedTheme } from "@/lib/theme";

const heroFeatures = [
  "A Vibed profile built from vibe-coding signals in your commit history",
  "Persona snapshots that evolve as you add more repos",
  "Share-ready cards with playful language and honest confidence",
  "Deep dive metrics and evidence when you want receipts",
];

const timeline = [
  { title: "Connect GitHub", description: "Sign in, then pick the repos that feel like you." },
  { title: "Run a vibe check", description: "We read commit metadata and patterns (not your code)." },
  { title: "Get your Vibed read", description: "Highlights, categories, and the story of how you build." },
  { title: "See your persona", description: "A playful archetype that changes as your work evolves." },
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
  latestPersona?: {
    label: string | null;
    confidence: string | null;
    repoName: string | null;
    generatedAt: string | null;
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

type LatestInsightRow = {
  job_id: string;
  persona_label: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
  analysis_jobs:
    | {
        created_at: string;
        repo_id: string | null;
      }
    | null;
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <MarketingLanding />;

  const [
    connectedReposResult,
    completedJobsResult,
    queuedJobsResult,
    latestJobResult,
    latestInsightResult,
  ] =
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
      supabase
        .from("analysis_insights")
        .select(
          "job_id, persona_label, persona_confidence, generated_at, analysis_jobs(created_at, repo_id)"
        )
        .eq("analysis_jobs.user_id", user.id)
        .order("analysis_jobs.created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const latestJob = (latestJobResult.data ?? null) as unknown as LatestJobRow | null;
  const latestInsight = (latestInsightResult.data ?? null) as unknown as LatestInsightRow | null;

  const repoNameResult = latestJob?.repo_id
    ? await supabase
        .from("repos")
        .select("full_name")
        .eq("id", latestJob.repo_id)
        .maybeSingle()
    : null;

  const repoName = (repoNameResult?.data ?? null) as unknown as RepoNameRow | null;

  const latestInsightRepoNameResult = latestInsight?.analysis_jobs?.repo_id
    ? await supabase
        .from("repos")
        .select("full_name")
        .eq("id", latestInsight.analysis_jobs.repo_id)
        .maybeSingle()
    : null;

  const latestInsightRepoName = (latestInsightRepoNameResult?.data ??
    null) as unknown as RepoNameRow | null;

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
    latestPersona: latestInsight
      ? {
          label: latestInsight.persona_label,
          confidence: latestInsight.persona_confidence,
          repoName: latestInsightRepoName?.full_name ?? null,
          generatedAt: latestInsight.generated_at,
        }
      : undefined,
  };

  return <AuthenticatedDashboard stats={stats} />;
}

function MarketingLanding() {
  const personaCards = [
    {
      title: "Spec-Driven Architect",
      description:
        "Plans thoroughly before touching code; constraints show up early and often.",
    },
    {
      title: "Test-First Validator",
      description:
        "Leans on tests as a contract; prefers safety nets before big changes.",
    },
    {
      title: "Vibe Prototyper",
      description:
        "Moves fast by experimenting; iterates in bursts and learns by doing.",
    },
    {
      title: "Agent Orchestrator",
      description:
        "Coordinates tools and assistants; breaks work into structured moves.",
    },
  ];

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl">
        <header className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
              For vibe coders
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              <span className={wrappedTheme.gradientText}>Find your Vibed coding profile</span>{" "}
              and the personality behind your workflow
            </h1>
            <p className="max-w-2xl text-base text-zinc-700 sm:text-lg">
              Vibed is a playful experiment by vibe coders who want to understand themselves
              better. We surface signals from your commit history to shine a light on how you build
              with AI. What feels like you, what feels new, and how your workflow is evolving.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className={wrappedTheme.primaryButton}
            >
              Generate mine
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className={`${wrappedTheme.card} p-8`}>
            <h2 className="text-2xl font-semibold text-zinc-950">
              What you get
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-zinc-800">
              {heroFeatures.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className={`mt-1 shrink-0 ${wrappedTheme.dot}`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-zinc-700">
              Personas are an interpretation layer based on observable commit signals. They can
              shift as your repos and your AI habits evolve.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-zinc-950 px-6 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Start with GitHub
              </Link>
              <Link
                href="/security"
                className={wrappedTheme.secondaryButton}
              >
                Read security notes
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-fuchsia-200/70 via-indigo-200/60 to-cyan-200/70 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.06)]">
            <h2 className="text-2xl font-semibold text-zinc-950">How it works</h2>
            <div className="mt-6 grid gap-4">
              {timeline.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-black/5 bg-white/70 p-5 backdrop-blur"
                >
                  <p className="text-sm font-semibold text-zinc-950">{step.title}</p>
                  <p className="mt-1 text-sm text-zinc-700">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={`mt-6 ${wrappedTheme.card} p-8`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">Persona previews</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-800">
                You may see one of these (or another persona). These are lenses on your
                vibe-coding style — observations, not labels.
              </p>
            </div>
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-950 transition hover:text-zinc-700"
            >
              Generate mine →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {personaCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600" />
                <p className="mt-4 text-sm font-semibold text-zinc-950">{card.title}</p>
                <p className="mt-2 text-sm text-zinc-800">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-black/5 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-zinc-700">Vibed Coding</p>
          <p className="font-mono text-xs text-zinc-400">v0.1.0</p>
        </footer>
      </div>
    </div>
  );
}

function AuthenticatedDashboard({ stats }: { stats: AuthStats }) {
  function clarityScore(): number {
    if (stats.completedJobs === 0) return 0;
    if (stats.connectedRepos <= 1) return 35;
    if (stats.connectedRepos === 2) return 55;
    if (stats.connectedRepos === 3) return 70;
    if (stats.connectedRepos <= 5) return 85;
    return 95;
  }

  const clarity = clarityScore();

  const cards = [
    {
      label: "Repos in profile",
      value: stats.connectedRepos,
      helper: "Repos you've connected",
    },
    {
      label: "Stories generated",
      value: stats.completedJobs,
      helper: "Vibed moments",
    },
    {
      label: "In progress",
      value: stats.queuedJobs,
      helper: "Reading commits",
    },
  ];

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Your profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Your Vibed profile
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Narrative first, receipts always available. Your profile sharpens across repos.
          </p>
        </header>

        <section className={`${wrappedTheme.card} p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                Primary vibe
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                {stats.latestPersona?.label ?? "Still forming"}
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                {stats.latestPersona?.confidence ?? "Run a vibe check to get your first read."}
                {stats.latestPersona?.repoName ? ` · Based on ${stats.latestPersona.repoName}` : ""}
              </p>
            </div>

            <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white/70 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                Profile clarity
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-950">{clarity}%</p>
              <div className="mt-4 h-2 w-full rounded-full bg-zinc-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600"
                  style={{ width: `${clarity}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-zinc-700">
                More data helps us stay accurate. Keep it safe: avoid sensitive repos.
              </p>
            </div>
          </div>

          {stats.completedJobs === 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/repos" className={wrappedTheme.primaryButton}>
                Pick a repo
              </Link>
              <Link href="/security" className={wrappedTheme.secondaryButton}>
                What we store
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/analysis" className={wrappedTheme.primaryButton}>
                View stories
              </Link>
              <Link href="/repos" className={wrappedTheme.secondaryButton}>
                Add a repo
              </Link>
            </div>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ label, value, helper }) => (
            <article
              key={label}
              className={`${wrappedTheme.card} p-6`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-zinc-600">
                {label}
              </p>
              <p className="mt-4 text-4xl font-semibold text-zinc-950">{value}</p>
              <p className="mt-2 text-sm text-zinc-700">{helper}</p>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-black/5 bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-600 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.18)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/75">
                Latest read
              </p>
              <p className="text-2xl font-semibold text-white">
                {stats.latestJob?.repoName ?? "No runs yet"}
              </p>
              <p className="text-sm text-white/80">
                Status: {stats.latestJob?.status ?? "waiting"}
                {stats.latestJob?.updatedAt ? ` • Updated ${new Date(stats.latestJob.updatedAt).toLocaleString()}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/repos"
                className="rounded-full border border-white/70 bg-white/10 px-6 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Add a repo
              </Link>
              <Link
                href="/analysis"
                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-white/90"
              >
                View stories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
