import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

type HistoryRow = {
  job_id: string;
  persona_label: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
  analysis_jobs:
    | {
        status: string;
        created_at: string;
        repo_id: string | null;
      }
    | null;
};

export default async function AnalysisIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("analysis_insights")
    .select("job_id, persona_label, persona_confidence, generated_at, analysis_jobs(status, created_at, repo_id)")
    .eq("analysis_jobs.user_id", user.id)
    .order("analysis_jobs.created_at", { ascending: false });

  const history = (data ?? []) as unknown as HistoryRow[];

  const repoIds = Array.from(
    new Set(history.map((h) => h.analysis_jobs?.repo_id).filter((id): id is string => Boolean(id)))
  );

  const repoNames =
    repoIds.length > 0
      ? await supabase.from("repos").select("id, full_name").in("id", repoIds)
      : null;

  const repoNameById = new Map<string, string>();
  for (const row of (repoNames?.data ?? []) as Array<{ id: string; full_name: string }>) {
    repoNameById.set(row.id, row.full_name);
  }

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Reports
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Your analysis history
          </h1>
          <p className="max-w-2xl text-sm text-zinc-700 sm:text-base">
            Open a report to view insights, persona, and evidence SHAs.
          </p>
        </header>

        <section className={`${wrappedTheme.card} p-6`}>
          {history.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-700">No reports yet.</p>
              <Link className={wrappedTheme.primaryButtonSm} href="/repos">
                Connect a repo
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {history.map((h) => {
                const repoId = h.analysis_jobs?.repo_id ?? null;
                const repoName = repoId ? repoNameById.get(repoId) ?? null : null;
                const status = h.analysis_jobs?.status ?? "unknown";
                const createdAt = h.analysis_jobs?.created_at ?? null;
                const generatedAt = h.generated_at ?? null;

                return (
                  <li key={h.job_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {repoName ?? "Repository"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Status: {status}
                        {createdAt ? ` • Created ${new Date(createdAt).toLocaleString()}` : ""}
                        {generatedAt ? ` • Generated ${new Date(generatedAt).toLocaleString()}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-zinc-700">
                        Persona: {h.persona_label ?? "—"}
                        {h.persona_confidence ? ` • ${h.persona_confidence}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link href={`/analysis/${h.job_id}`} className={wrappedTheme.primaryButtonSm}>
                        Open
                      </Link>
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

