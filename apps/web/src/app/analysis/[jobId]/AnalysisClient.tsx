"use client";

import { useEffect, useState } from "react";
import type { AnalysisMetrics, CommitEvent } from "@bolokono/core";

type Job = {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ApiResponse = {
  job: Job;
  report: unknown | null;
  metrics: unknown | null;
};

type NarrativeJson = {
  summary?: string;
  sections?: Array<{
    title?: string;
    content?: string;
    evidence?: string[];
  }>;
  highlights?: Array<{
    metric?: string;
    value?: string;
    interpretation?: string;
  }>;
};

type ReportRow = {
  bolokono_type: string | null;
  narrative_json?: NarrativeJson;
  evidence_json?: string[];
  llm_model?: string;
  generated_at?: string;
};

type MetricsRow = {
  metrics_json?: Partial<AnalysisMetrics>;
  events_json?: CommitEvent[];
  computed_at?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

function isNarrativeJson(v: unknown): v is NarrativeJson {
  if (!isRecord(v)) return false;
  const summary = v.summary;
  if (summary !== undefined && typeof summary !== "string") return false;

  const sections = v.sections;
  if (sections !== undefined) {
    if (!Array.isArray(sections)) return false;
    for (const s of sections) {
      if (!isRecord(s)) return false;
      if (s.title !== undefined && typeof s.title !== "string") return false;
      if (s.content !== undefined && typeof s.content !== "string") return false;
      if (s.evidence !== undefined && !isStringArray(s.evidence)) return false;
    }
  }

  const highlights = v.highlights;
  if (highlights !== undefined) {
    if (!Array.isArray(highlights)) return false;
    for (const h of highlights) {
      if (!isRecord(h)) return false;
      if (h.metric !== undefined && typeof h.metric !== "string") return false;
      if (h.value !== undefined && typeof h.value !== "string") return false;
      if (h.interpretation !== undefined && typeof h.interpretation !== "string") return false;
    }
  }

  return true;
}

function isReportRow(v: unknown): v is ReportRow {
  if (!isRecord(v)) return false;
  const bt = v.bolokono_type;
  if (!(bt === null || typeof bt === "string" || bt === undefined)) return false;
  if (v.narrative_json !== undefined && !isNarrativeJson(v.narrative_json)) return false;
  if (v.evidence_json !== undefined && !isStringArray(v.evidence_json)) return false;
  if (v.llm_model !== undefined && typeof v.llm_model !== "string") return false;
  if (v.generated_at !== undefined && typeof v.generated_at !== "string") return false;
  return true;
}

function isCommitEvent(v: unknown): v is CommitEvent {
  if (!isRecord(v)) return false;
  return (
    typeof v.sha === "string" &&
    typeof v.message === "string" &&
    typeof v.author_date === "string" &&
    typeof v.committer_date === "string" &&
    typeof v.author_email === "string" &&
    typeof v.files_changed === "number" &&
    typeof v.additions === "number" &&
    typeof v.deletions === "number" &&
    Array.isArray(v.parents) &&
    v.parents.every((p) => typeof p === "string")
  );
}

function isMetricsRow(v: unknown): v is MetricsRow {
  if (!isRecord(v)) return false;
  if (v.metrics_json !== undefined && !isRecord(v.metrics_json)) return false;
  if (v.events_json !== undefined) {
    if (!Array.isArray(v.events_json)) return false;
    if (!v.events_json.every((e) => isCommitEvent(e))) return false;
  }
  if (v.computed_at !== undefined && typeof v.computed_at !== "string") return false;
  return true;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getNumber(obj: unknown, key: string): number | null {
  if (!isRecord(obj)) return null;
  const v = obj[key];
  return typeof v === "number" ? v : null;
}

export default function AnalysisClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/analysis/${jobId}`, { cache: "no-store" });
        const json = (await res.json()) as unknown;

        if (!res.ok) {
          const err = (json as { error?: unknown } | null)?.error;
          throw new Error(typeof err === "string" ? err : "Failed to fetch analysis status");
        }

        const parsed = json as ApiResponse;
        if (!cancelled) setData(parsed);
        if (!cancelled && (parsed.job.status === "queued" || parsed.job.status === "running")) {
          timeoutId = window.setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch analysis status");
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [jobId]);

  if (error) return <p className="mt-6 text-sm text-red-400">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-zinc-300">Loading...</p>;

  const { job, report, metrics } = data;
  const parsedReport = isReportRow(report) ? report : null;
  const parsedMetrics = isMetricsRow(metrics) ? metrics : null;

  const narrative = parsedReport?.narrative_json;
  const sections = narrative?.sections ?? [];
  const highlights = narrative?.highlights ?? [];
  const matchedCriteria = parsedReport?.evidence_json ?? [];
  const metricsJson = parsedMetrics?.metrics_json ?? null;
  const events = parsedMetrics?.events_json ?? [];

  const totalCommits = getNumber(metricsJson, "total_commits");
  const activeDays = getNumber(metricsJson, "active_days");
  const spanDays = getNumber(metricsJson, "span_days");
  const burstiness = getNumber(metricsJson, "burstiness_score");
  const hoursP50 = getNumber(metricsJson, "hours_between_commits_p50");
  const fixRatio = getNumber(metricsJson, "fix_commit_ratio");
  const conventionalRatio = getNumber(metricsJson, "conventional_commit_ratio");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-md border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/60">Status</p>
        <p className="mt-1 text-lg font-semibold text-white">{job.status}</p>
        <dl className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-3">
          <div>
            <dt className="text-white/50">Created</dt>
            <dd className="font-mono text-xs">{fmtDate(job.created_at)}</dd>
          </div>
          <div>
            <dt className="text-white/50">Started</dt>
            <dd className="font-mono text-xs">{fmtDate(job.started_at)}</dd>
          </div>
          <div>
            <dt className="text-white/50">Completed</dt>
            <dd className="font-mono text-xs">{fmtDate(job.completed_at)}</dd>
          </div>
        </dl>
        {job.error_message ? (
          <p className="mt-3 text-sm text-red-400">{job.error_message}</p>
        ) : null}
      </div>

      {job.status === "done" ? (
        parsedReport ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-white/60">Bolokono type</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {parsedReport.bolokono_type ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Model</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {parsedReport.llm_model ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Generated {parsedReport.generated_at ? fmtDate(parsedReport.generated_at) : "—"}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-sm font-medium text-white">Summary</p>
              <p className="mt-1 text-sm text-white/80">{narrative?.summary ?? "—"}</p>

              {matchedCriteria.length > 0 ? (
                <>
                  <p className="mt-6 text-sm font-medium text-white">Matched criteria</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedCriteria.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-mono text-white/80"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {highlights.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map((h, idx) => (
                  <div key={`${h.metric ?? "metric"}-${idx}`} className="rounded-md border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">{h.metric ?? "Metric"}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{h.value ?? "—"}</p>
                    <p className="mt-2 text-sm text-white/70">{h.interpretation ?? "—"}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {sections.length > 0 ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">Narrative</p>
                <div className="mt-4 flex flex-col gap-5">
                  {sections.map((s, idx) => (
                    <section key={`${s.title ?? "section"}-${idx}`} className="space-y-2">
                      <h3 className="text-base font-semibold text-white">{s.title ?? "Untitled"}</h3>
                      <p className="text-sm text-white/80">{s.content ?? "—"}</p>
                      {Array.isArray(s.evidence) && s.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.evidence.map((sha) => (
                            <span
                              key={sha}
                              className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-mono text-white/80"
                            >
                              {sha.slice(0, 10)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              </div>
            ) : null}

            {parsedMetrics ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">Metrics</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">Commits</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{totalCommits ?? "—"}</p>
                    <p className="mt-2 text-sm text-white/70">
                      Active days: {activeDays ?? "—"} · Span days: {spanDays ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">Rhythm</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {hoursP50 !== null ? `${hoursP50.toFixed(1)}h` : "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Burstiness: {burstiness !== null ? burstiness.toFixed(2) : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">Iteration</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {fixRatio !== null ? `${Math.round(fixRatio * 100)}%` : "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">Fix commit ratio</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">Messages</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {conventionalRatio !== null ? `${Math.round(conventionalRatio * 100)}%` : "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">Conventional commits</p>
                  </div>
                </div>

                <details className="mt-6 rounded-md border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-white">
                    View raw metrics JSON
                  </summary>
                  <pre className="mt-3 overflow-auto text-xs text-white/70">
                    {JSON.stringify(metricsJson, null, 2)}
                  </pre>
                </details>

                {events.length > 0 ? (
                  <details className="mt-4 rounded-md border border-white/10 bg-white/5 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-white">
                      View sample commits ({events.length})
                    </summary>
                    <ul className="mt-3 space-y-3">
                      {events.slice(0, 20).map((e) => (
                        <li key={e.sha} className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-xs font-mono text-white/70">{e.sha}</p>
                          <p className="mt-1 text-sm text-white">{e.message.split("\n")[0]}</p>
                          <p className="mt-1 text-xs text-white/50">
                            {fmtDate(e.committer_date)} · {e.additions}+ / {e.deletions}- · {e.files_changed} files
                          </p>
                        </li>
                      ))}
                    </ul>
                    {events.length > 20 ? (
                      <p className="mt-3 text-xs text-white/50">Showing first 20 commits.</p>
                    ) : null}
                  </details>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">Metrics</p>
                <p className="mt-2 text-sm text-white/70">No metrics found for this job.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">Report</p>
            <p className="mt-2 text-sm text-white/70">No report found for this job.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
