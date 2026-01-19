import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

type JobRow = {
  id: string;
  status: string;
  created_at: string;
  repo_id: string;
};

export default async function AnalysisIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("analysis_jobs")
    .select("id, status, created_at, repo_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as unknown as JobRow[];

  const repoIds = Array.from(
    new Set(jobs.map((j) => j.repo_id).filter((id): id is string => Boolean(id)))
  );

  const repoNames =
    repoIds.length > 0
      ? await supabase.from("repos").select("id, full_name").in("id", repoIds)
      : null;

  const repoNameById = new Map<string, string>();
  for (const row of (repoNames?.data ?? []) as Array<{ id: string; full_name: string }>) {
    repoNameById.set(row.id, row.full_name);
  }

  const jobIds = jobs.map((j) => j.id);
  const insightsResult =
    jobIds.length > 0
      ? await supabase
          .from("analysis_insights")
          .select("job_id, persona_label, persona_confidence, generated_at")
          .in("job_id", jobIds)
      : null;

  const insightByJobId = new Map<
    string,
    { persona_label: string | null; persona_confidence: string | null; generated_at: string | null }
  >();

  for (const row of (insightsResult?.data ?? []) as Array<{
    job_id: string;
    persona_label: string | null;
    persona_confidence: string | null;
    generated_at: string | null;
  }>) {
    insightByJobId.set(row.job_id, {
      persona_label: row.persona_label,
      persona_confidence: row.persona_confidence,
      generated_at: row.generated_at,
    });
  }

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Vibed Repos
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Your Vibed Repos
          </h1>
          <p className="max-w-2xl text-sm text-zinc-700 sm:text-base">
            Each vibed repo reveals your coding persona, confidence level, and the evidence behind it.
          </p>
        </header>

        <section className={`${wrappedTheme.card} p-6`}>
          {jobs.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-700">
                No vibed repos yet. Run your first vibe check.
              </p>
              <Link className={wrappedTheme.primaryButtonSm} href="/repos">
                Pick a repo
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {jobs.map((j) => {
                const repoName = repoNameById.get(j.repo_id) ?? null;
                const insight = insightByJobId.get(j.id) ?? null;
                const when = insight?.generated_at ?? j.created_at;

                return (
                  <li
                    key={j.id}
                    className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.06)] backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {repoName ?? "Repository"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {j.status === "done" ? "Ready" : j.status}
                          {when ? ` · ${new Date(when).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Link href={`/analysis/${j.id}`} className={wrappedTheme.primaryButtonSm}>
                        View
                      </Link>
                    </div>

                    <div className="mt-5 rounded-2xl border border-black/5 bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                        Persona
                      </p>
                      <p className="mt-2 text-lg font-semibold text-zinc-950">
                        {insight?.persona_label ?? "Still forming"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700">
                        {insight?.persona_confidence ?? "Not enough signal yet"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
