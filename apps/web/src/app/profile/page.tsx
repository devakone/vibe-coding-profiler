import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

// Axis metadata for display
const AXIS_META = {
  automation_heaviness: {
    name: "Automation",
    description: "How much AI-generated code you accept",
  },
  guardrail_strength: {
    name: "Guardrails",
    description: "Testing, linting, and safety measures",
  },
  iteration_loop_intensity: {
    name: "Iteration",
    description: "Rapid cycles of prompting and fixing",
  },
  planning_signal: {
    name: "Planning",
    description: "Thoughtful setup before execution",
  },
  surface_area_per_change: {
    name: "Surface Area",
    description: "Size and scope of each change",
  },
  shipping_rhythm: {
    name: "Rhythm",
    description: "How frequently you ship changes",
  },
} as const;

type AxisKey = keyof typeof AXIS_META;

interface UserProfile {
  persona_id: string;
  persona_name: string;
  persona_tagline: string | null;
  persona_confidence: string;
  persona_score: number;
  total_commits: number;
  total_repos: number;
  axes_json: Record<AxisKey, { score: number; level: string; why: string[] }>;
  repo_personas_json: Array<{
    repoName: string;
    personaId: string;
    personaName: string;
    commitCount: number;
  }>;
  cards_json: unknown[] | null;
  updated_at: string | null;
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: connectedUserRepos } = await supabase
      .from("user_repos")
      .select("repo_id")
      .eq("user_id", user.id)
      .is("disconnected_at", null);

    const connectedRepoIdRows = (connectedUserRepos ?? []) as Array<{
      repo_id: string | null;
    }>;

    const connectedRepoIds = connectedRepoIdRows
      .map((r) => r.repo_id)
      .filter((id): id is string => Boolean(id));

    const { data: completedJobs } =
      connectedRepoIds.length > 0
        ? await supabase
            .from("analysis_jobs")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "done")
            .in("repo_id", connectedRepoIds)
            .limit(1)
        : { data: [] as Array<{ id: string }> };

    if ((completedJobs ?? []).length > 0) {
      return <EmptyProfileNeedsRebuild />;
    }

    return <EmptyProfileState />;
  }

  const userProfile = profile as unknown as UserProfile;

  return <ProfileView profile={userProfile} />;
}

function EmptyProfileState() {
  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Your profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Your Vibed Profile
          </h1>
        </header>

        <div className={`${wrappedTheme.card} p-8 text-center`}>
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-fuchsia-200/70 via-indigo-200/60 to-cyan-200/70" />
          <h2 className="mt-6 text-2xl font-semibold text-zinc-950">
            No profile yet
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-zinc-700">
            Your aggregated profile builds as you analyze repos. Complete your first
            vibe check to start shaping your profile.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/repos" className={wrappedTheme.primaryButton}>
              Connect a repo
            </Link>
            <Link href="/" className={wrappedTheme.secondaryButton}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyProfileNeedsRebuild() {
  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Your profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Your Vibed Profile
          </h1>
        </header>

        <div className={`${wrappedTheme.card} p-8 text-center`}>
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-fuchsia-200/70 via-indigo-200/60 to-cyan-200/70" />
          <h2 className="mt-6 text-2xl font-semibold text-zinc-950">
            Your profile is ready to build
          </h2>
          <p className="mt-2 mx-auto max-w-md text-sm text-zinc-700">
            You already have completed vibe checks. Build your aggregated profile to see your
            cross-repo persona and axes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <form action="/api/profile/rebuild" method="post">
              <button type="submit" className={wrappedTheme.primaryButton}>
                Build profile
              </button>
            </form>
            <Link href="/analysis" className={wrappedTheme.secondaryButton}>
              View individual reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: UserProfile }) {
  const confidencePercent =
    profile.persona_confidence === "high"
      ? 85
      : profile.persona_confidence === "medium"
        ? 65
        : 45;

  const axisKeys = Object.keys(AXIS_META) as AxisKey[];

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Your profile
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Your Vibed Profile
          </h1>
          <p className="text-sm text-zinc-700">
            Based on {profile.total_repos} repos · {profile.total_commits.toLocaleString()} commits
          </p>
        </header>

        {/* Hero Persona Card */}
        <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-fuchsia-200/70 via-indigo-200/60 to-cyan-200/70 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                Primary persona
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                {profile.persona_name}
              </h2>
              {profile.persona_tagline && (
                <p className="mt-2 text-base text-zinc-800 italic">
                  “{profile.persona_tagline}”
                </p>
              )}
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-black/5 bg-white/70 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                Confidence
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                {confidencePercent}%
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-zinc-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {profile.persona_confidence} · Add more repos to sharpen
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/repos" className={wrappedTheme.primaryButton}>
              Add another repo
            </Link>
            <Link href="/analysis" className={wrappedTheme.secondaryButton}>
              View individual reports
            </Link>
          </div>
        </section>

        {/* 6-Axis Grid */}
        <section className={`${wrappedTheme.card} p-8`}>
          <h2 className="text-xl font-semibold text-zinc-950">Your Axes</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Weighted averages across all analyzed repos
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {axisKeys.map((key) => {
              const axis = profile.axes_json[key];
              const meta = AXIS_META[key];
              const score = axis?.score ?? 50;

              return (
                <div
                  key={key}
                  className="rounded-2xl border border-black/5 bg-white/70 p-5 backdrop-blur"
                >
                  <p className="text-sm font-semibold text-zinc-950">{meta.name}</p>
                  <p className="mt-1 text-xs text-zinc-600">{meta.description}</p>
                  <div className="mt-4">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-semibold text-zinc-950">
                        {score}
                      </span>
                      <span className="text-xs text-zinc-500">/100</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Repo Breakdown */}
        {profile.repo_personas_json && profile.repo_personas_json.length > 0 && (
          <section className={`${wrappedTheme.card} p-8`}>
            <h2 className="text-xl font-semibold text-zinc-950">Your Repos</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Each repo contributes to your overall profile, weighted by commits
            </p>

            <div className="mt-6 divide-y divide-zinc-100">
              {profile.repo_personas_json.map((repo, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {repo.repoName}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {repo.personaName} · {repo.commitCount.toLocaleString()} commits
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="rounded-full bg-gradient-to-r from-fuchsia-100 via-indigo-100 to-cyan-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {Math.round((repo.commitCount / profile.total_commits) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cross-repo insight */}
        <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-600 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/75">
            Cross-repo insight
          </p>
          <p className="mt-3 text-lg font-medium text-white">
            {generateCrossRepoInsight(profile)}
          </p>
          {profile.updated_at && (
            <p className="mt-4 text-xs text-white/60">
              Last updated {new Date(profile.updated_at).toLocaleDateString()}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function generateCrossRepoInsight(profile: UserProfile): string {
  const repos = profile.repo_personas_json ?? [];
  if (repos.length === 0) {
    return "Add more repos to unlock cross-repo insights.";
  }

  if (repos.length === 1) {
    return `Based on ${repos[0].repoName}, you show strong ${profile.persona_name.toLowerCase()} tendencies. Add more repos to see how your style varies across projects.`;
  }

  // Group by persona
  const personaCounts = repos.reduce(
    (acc, repo) => {
      acc[repo.personaName] = (acc[repo.personaName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const uniquePersonas = Object.keys(personaCounts);

  if (uniquePersonas.length === 1) {
    return `Across ${repos.length} repos, you consistently show ${profile.persona_name.toLowerCase()} patterns. Your style is remarkably consistent.`;
  }

  // Multiple personas
  const dominant = repos[0];
  const secondary = repos.find((r) => r.personaName !== dominant.personaName);

  if (secondary) {
    return `On ${dominant.repoName} you lean ${dominant.personaName.toLowerCase()}, while on ${secondary.repoName} you show more ${secondary.personaName.toLowerCase()} tendencies. Your aggregated profile balances these styles.`;
  }

  return `Your ${profile.persona_name.toLowerCase()} profile emerges from ${repos.length} repos and ${profile.total_commits.toLocaleString()} commits.`;
}
