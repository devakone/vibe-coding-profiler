"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAnalysisInsights } from "@bolokono/core";
import type { AnalysisInsights, AnalysisMetrics, CommitEvent } from "@bolokono/core";

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
  insights: unknown | null;
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

type InsightsRow = {
  insights_json?: unknown;
  generator_version?: string;
  generated_at?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isBooleanOrNull(v: unknown): v is boolean | null {
  return v === null || typeof v === "boolean";
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

function isInsightsRow(v: unknown): v is InsightsRow {
  if (!isRecord(v)) return false;
  if (v.generator_version !== undefined && typeof v.generator_version !== "string") return false;
  if (v.generated_at !== undefined && typeof v.generated_at !== "string") return false;
  return true;
}

function isTechTerm(v: unknown): v is AnalysisInsights["tech"]["top_terms"][number] {
  if (!isRecord(v)) return false;
  return typeof v.term === "string" && typeof v.count === "number";
}

function isAnalysisInsights(v: unknown): v is AnalysisInsights {
  if (!isRecord(v)) return false;
  if (typeof v.version !== "string") return false;
  if (v.timezone !== "UTC") return false;
  if (typeof v.generated_at !== "string") return false;

  if (!isRecord(v.totals) || typeof v.totals.commits !== "number") return false;

  if (!isRecord(v.streak)) return false;
  if (typeof v.streak.longest_days !== "number") return false;
  if (!isStringOrNull(v.streak.start_day)) return false;
  if (!isStringOrNull(v.streak.end_day)) return false;
  if (!isStringArray(v.streak.evidence_shas ?? [])) return false;

  if (!isRecord(v.timing)) return false;
  if (!Array.isArray(v.timing.top_weekdays)) return false;
  for (const tw of v.timing.top_weekdays) {
    if (!isRecord(tw)) return false;
    if (typeof tw.weekday !== "number") return false;
    if (typeof tw.count !== "number") return false;
  }
  if (!isNumberOrNull(v.timing.peak_weekday)) return false;
  if (!isNumberOrNull(v.timing.peak_hour)) return false;
  if (
    !(
      v.timing.peak_window === null ||
      v.timing.peak_window === "mornings" ||
      v.timing.peak_window === "afternoons" ||
      v.timing.peak_window === "evenings" ||
      v.timing.peak_window === "late_nights"
    )
  ) {
    return false;
  }

  if (!isRecord(v.commits)) return false;
  if (!(v.commits.top_category === null || typeof v.commits.top_category === "string")) return false;
  if (!isRecord(v.commits.category_counts)) return false;
  for (const value of Object.values(v.commits.category_counts)) {
    if (typeof value !== "number") return false;
  }
  if (typeof v.commits.features !== "number") return false;
  if (typeof v.commits.fixes !== "number") return false;
  if (!isNumberOrNull(v.commits.features_per_fix)) return false;
  if (!isNumberOrNull(v.commits.fixes_per_feature)) return false;

  if (!isRecord(v.chunkiness)) return false;
  if (!isNumberOrNull(v.chunkiness.avg_files_changed)) return false;
  if (
    !(
      v.chunkiness.label === null ||
      v.chunkiness.label === "slicer" ||
      v.chunkiness.label === "mixer" ||
      v.chunkiness.label === "chunker"
    )
  ) {
    return false;
  }

  if (!isRecord(v.patterns)) return false;
  if (!isBooleanOrNull(v.patterns.auth_then_roles)) return false;

  if (!isRecord(v.tech)) return false;
  if (v.tech.source !== "commit_message_keywords") return false;
  if (!Array.isArray(v.tech.top_terms) || !v.tech.top_terms.every(isTechTerm)) return false;

  if (!isRecord(v.persona)) return false;
  if (typeof v.persona.id !== "string") return false;
  if (typeof v.persona.label !== "string") return false;
  if (typeof v.persona.description !== "string") return false;
  if (!Array.isArray(v.persona.archetypes) || !v.persona.archetypes.every((a) => typeof a === "string")) return false;
  if (typeof v.persona.confidence !== "string") return false;
  if (!isStringArray(v.persona.evidence_shas)) return false;

  if (!isRecord(v.share_template)) return false;
  if (typeof v.share_template.headline !== "string") return false;
  if (typeof v.share_template.subhead !== "string") return false;
  if (!isRecord(v.share_template.colors)) return false;
  if (typeof v.share_template.colors.primary !== "string") return false;
  if (typeof v.share_template.colors.accent !== "string") return false;
  if (!Array.isArray(v.share_template.metrics)) return false;
  for (const metric of v.share_template.metrics) {
    if (!isRecord(metric)) return false;
    if (typeof metric.label !== "string" || typeof metric.value !== "string") return false;
  }
  if (
    !isRecord(v.share_template.persona_archetype) ||
    typeof v.share_template.persona_archetype.label !== "string" ||
    !Array.isArray(v.share_template.persona_archetype.archetypes)
  ) {
    return false;
  }

  if (!Array.isArray(v.persona_delta)) return false;
  for (const delta of v.persona_delta) {
    if (!isRecord(delta)) return false;
    if (delta.from !== null && typeof delta.from !== "string") return false;
    if (typeof delta.to !== "string") return false;
    if (typeof delta.note !== "string") return false;
    if (!isStringArray(delta.evidence_shas)) return false;
  }

  if (!Array.isArray(v.sources) || !v.sources.every((s) => typeof s === "string")) return false;

  if (v.disclaimers !== undefined && !isStringArray(v.disclaimers)) return false;

  return true;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function weekdayName(dow: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow] ?? "—";
}

function InsightCard(props: {
  eyebrow: string;
  title: string;
  value: string;
  detail?: string;
  accent: "pink" | "indigo" | "amber" | "emerald" | "cyan";
}) {
  const accent = {
    pink: "from-fuchsia-500 to-pink-500",
    indigo: "from-indigo-600 to-violet-600",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-teal-500",
    cyan: "from-cyan-500 to-sky-500",
  }[props.accent];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{props.eyebrow}</p>
      <p className="mt-2 text-lg font-semibold text-zinc-900">{props.title}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">{props.value}</p>
      {props.detail ? <p className="mt-3 text-sm text-zinc-600">{props.detail}</p> : null}
    </div>
  );
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

  if (error) return <p className="mt-6 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-zinc-600">Loading…</p>;

  const { job, report, metrics, insights } = data;
  const parsedReport = isReportRow(report) ? report : null;
  const parsedMetrics = isMetricsRow(metrics) ? metrics : null;
  const parsedInsightsRow = isInsightsRow(insights) ? insights : null;

  const narrative = parsedReport?.narrative_json;
  const sections = narrative?.sections ?? [];
  const highlights = narrative?.highlights ?? [];
  const matchedCriteria = parsedReport?.evidence_json ?? [];
  const metricsJson = parsedMetrics?.metrics_json ?? null;
  const events = parsedMetrics?.events_json ?? [];

  const insightsJson = parsedInsightsRow?.insights_json ?? null;
  const wrapped = isAnalysisInsights(insightsJson) ? insightsJson : computeAnalysisInsights(events);

  const persona = wrapped.persona;
  const shareTemplate = wrapped.share_template;
  const personaDelta = wrapped.persona_delta;
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(() => {
    if (!shareTemplate) return "";
    const metricsLine = shareTemplate.metrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(" · ");
    return `${shareTemplate.headline}\n${shareTemplate.subhead}\n${metricsLine}\n#Vibed`;
  }, [shareTemplate]);

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Job status</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{job.status}</p>
          </div>
          <div className="text-xs text-zinc-500">
            <p>Created: <span className="font-mono">{fmtDate(job.created_at)}</span></p>
            <p>Started: <span className="font-mono">{fmtDate(job.started_at)}</span></p>
            <p>Completed: <span className="font-mono">{fmtDate(job.completed_at)}</span></p>
          </div>
        </div>
        {job.error_message ? <p className="mt-4 text-sm text-red-600">{job.error_message}</p> : null}
      </div>

      {job.status === "done" && events.length > 0 ? (
        <>
          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-500/10" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Your Coding Wrapped</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                {parsedReport?.bolokono_type ? parsedReport.bolokono_type : "Your profile"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-zinc-600">
                {narrative?.summary ??
                  "High-level habits derived from commit timestamps, messages, and basic stats. No file contents are used."}
              </p>
              {parsedReport?.generated_at ? (
                <p className="mt-2 text-xs text-zinc-500">Generated {fmtDate(parsedReport.generated_at)}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard
              accent="pink"
              eyebrow="Streak"
              title="Longest coding streak"
              value={`${wrapped.streak.longest_days} day${wrapped.streak.longest_days === 1 ? "" : "s"}`}
              detail={
                wrapped.streak.start_day && wrapped.streak.end_day
                  ? `${wrapped.streak.start_day} → ${wrapped.streak.end_day}`
                  : undefined
              }
            />
            <InsightCard
              accent="cyan"
              eyebrow="Timing"
              title="You code most on"
              value={wrapped.timing.peak_weekday !== null ? weekdayName(wrapped.timing.peak_weekday) : "—"}
              detail={
                wrapped.timing.peak_window !== null ? `Mostly in the ${wrapped.timing.peak_window} (UTC)` : "—"
              }
            />
            <InsightCard
              accent="amber"
              eyebrow="Focus"
              title="Most common commits"
              value={wrapped.commits.top_category ?? "—"}
              detail={
                wrapped.commits.top_category
                  ? `${wrapped.commits.category_counts[wrapped.commits.top_category] ?? 0} of ${wrapped.totals.commits}`
                  : undefined
              }
            />
            <InsightCard
              accent="indigo"
              eyebrow="Ratio"
              title="Features vs fixes"
              value={
                wrapped.commits.features_per_fix !== null
                  ? `${wrapped.commits.features_per_fix.toFixed(1)} : 1`
                  : wrapped.commits.fixes_per_feature !== null
                    ? `1 : ${wrapped.commits.fixes_per_feature.toFixed(1)}`
                    : "—"
              }
              detail={
                wrapped.commits.features_per_fix !== null
                  ? "Features per fix"
                  : wrapped.commits.fixes_per_feature !== null
                    ? "Fixes per feature"
                    : "Not enough signal"
              }
            />
            <InsightCard
              accent="emerald"
              eyebrow="Size"
              title="Commit “chunkiness”"
              value={
                wrapped.chunkiness.avg_files_changed !== null
                  ? `${wrapped.chunkiness.avg_files_changed.toFixed(1)} files`
                  : "—"
              }
              detail={
                wrapped.chunkiness.label === "chunker"
                  ? "Chunker: commits tend to touch many files"
                  : wrapped.chunkiness.label === "mixer"
                    ? "Mixer: a few files per commit"
                    : wrapped.chunkiness.label === "slicer"
                      ? "Slicer: tight, focused commits"
                      : undefined
              }
            />
            <InsightCard
              accent="pink"
              eyebrow="Starter"
              title="How you start projects"
              value={
                wrapped.patterns.auth_then_roles === null
                  ? "—"
                  : wrapped.patterns.auth_then_roles
                    ? "Auth → Roles"
                    : "Varies"
              }
              detail={
                wrapped.patterns.auth_then_roles === null
                  ? "Not enough signal"
                  : wrapped.patterns.auth_then_roles
                  ? "Roles/permissions commits show up soon after auth."
                  : "No consistent auth→roles sequence detected."
              }
            />
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Tech signals</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">Favorite technologies (best-effort)</h3>
            {wrapped.tech.top_terms.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {wrapped.tech.top_terms.map((t) => (
                  <span
                    key={t.term}
                    className="rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-800"
                  >
                    {t.term} <span className="text-zinc-500">({t.count})</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-600">
                Not enough strong keywords in commit messages to infer tech. For real “favorite technologies”, we should
                enrich data with GitHub repo languages or file-extension sampling (still without storing file contents).
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Persona snapshot</p>
              <h3 className="mt-2 text-2xl font-semibold text-zinc-900">{persona.label}</h3>
              <p className="mt-2 text-sm text-zinc-600">{persona.description}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-zinc-400">
                Confidence: {persona.confidence}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {persona.archetypes.map((arch) => (
                  <span
                    key={arch}
                    className="rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {arch}
                  </span>
                ))}
              </div>
              {persona.evidence_shas.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Evidence SHAs
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {persona.evidence_shas.map((sha) => (
                      <span
                        key={sha}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-mono text-zinc-700"
                      >
                        {sha.slice(0, 10)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {personaDelta.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-3 text-sm text-zinc-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Evolution notes
                  </p>
                  <ul className="mt-2 space-y-2">
                    {personaDelta.map((delta, idx) => (
                      <li key={`${delta.to}-${idx}`}>
                        <p>
                          {delta.from ? `${delta.from} → ` : ""} {delta.to}
                        </p>
                        <p className="text-xs text-zinc-500">{delta.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div
              className="rounded-3xl border border-black/5 p-6 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${shareTemplate.colors.primary}, ${shareTemplate.colors.accent})`,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Share card</p>
              <h3 className="mt-3 text-3xl font-semibold text-white">{shareTemplate.headline}</h3>
              <p className="mt-2 text-sm text-white/80">{shareTemplate.subhead}</p>
              <div className="mt-6 space-y-2">
                {shareTemplate.metrics.map((metric) => (
                  <p key={metric.label} className="text-sm font-semibold text-white">
                    {metric.label}: <span className="font-normal">{metric.value}</span>
                  </p>
                ))}
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.3em] text-white/70">
                {shareTemplate.persona_archetype.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {shareTemplate.persona_archetype.archetypes.map((arch) => (
                  <span
                    key={arch}
                    className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white"
                  >
                    {arch}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                onClick={handleCopyShare}
              >
                {copied ? "Copied" : "Copy summary"}
              </button>
            </div>
          </div>

          <details className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Deep dive (for the curious)</summary>
            <div className="mt-5 space-y-6">
              {highlights.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map((h, idx) => (
                    <div key={`${h.metric ?? "metric"}-${idx}`} className="rounded-2xl border border-black/5 bg-zinc-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{h.metric ?? "Metric"}</p>
                      <p className="mt-2 text-2xl font-semibold text-zinc-900">{h.value ?? "—"}</p>
                      <p className="mt-2 text-sm text-zinc-600">{h.interpretation ?? "—"}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {sections.length > 0 ? (
                <div className="rounded-2xl border border-black/5 bg-zinc-50 p-5">
                  <p className="text-sm font-semibold text-zinc-900">Narrative</p>
                  <div className="mt-4 flex flex-col gap-5">
                    {sections.map((s, idx) => (
                      <section key={`${s.title ?? "section"}-${idx}`} className="space-y-2">
                        <h4 className="text-base font-semibold text-zinc-900">{s.title ?? "Untitled"}</h4>
                        <p className="text-sm text-zinc-700">{s.content ?? "—"}</p>
                        {Array.isArray(s.evidence) && s.evidence.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {s.evidence.map((sha) => (
                              <span
                                key={sha}
                                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-mono text-zinc-700"
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

              {matchedCriteria.length > 0 ? (
                <div className="rounded-2xl border border-black/5 bg-zinc-50 p-5">
                  <p className="text-sm font-semibold text-zinc-900">Matched criteria</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchedCriteria.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-mono text-zinc-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <details className="rounded-2xl border border-black/5 bg-zinc-50 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Raw metrics JSON</summary>
                <pre className="mt-3 overflow-auto text-xs text-zinc-700">{JSON.stringify(metricsJson, null, 2)}</pre>
              </details>

              <details className="rounded-2xl border border-black/5 bg-zinc-50 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Commit sample ({events.length})</summary>
                <ul className="mt-4 space-y-3">
                  {events.slice(0, 20).map((e) => (
                    <li key={e.sha} className="rounded-2xl border border-black/5 bg-white p-4">
                      <p className="text-xs font-mono text-zinc-500">{e.sha}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-900">{e.message.split("\n")[0]}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {fmtDate(e.committer_date)} · {e.additions}+ / {e.deletions}- · {e.files_changed} files
                      </p>
                    </li>
                  ))}
                </ul>
                {events.length > 20 ? <p className="mt-3 text-xs text-zinc-500">Showing first 20 commits.</p> : null}
              </details>
            </div>
          </details>
        </>
      ) : job.status === "done" ? (
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">No analysis data found for this job.</p>
          <p className="mt-2 text-sm text-zinc-600">The job completed, but no commit events were returned.</p>
        </div>
      ) : null}
    </div>
  );
}
