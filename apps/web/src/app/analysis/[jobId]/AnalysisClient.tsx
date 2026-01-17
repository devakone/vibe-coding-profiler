"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAnalysisInsights } from "@vibed/core";
import type { AnalysisInsights, AnalysisMetrics, CommitEvent } from "@vibed/core";

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
  vibe_type: string | null;
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

type InsightHistoryEntry = {
  job_id: string;
  status: string;
  created_at: string;
  persona_label?: string;
  persona_confidence?: string;
  share_template?: AnalysisInsights["share_template"];
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
  const bt = v.vibe_type;
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createShareSvg(template: AnalysisInsights["share_template"]): string {
  const width = 1200;
  const height = 630;
  const metricsText = template.metrics
    .map((metric) => `${metric.label}: ${metric.value}`)
    .join(" · ");
  const archetypes = template.persona_archetype.archetypes.join(", ");
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${template.colors.primary}" />
      <stop offset="100%" stop-color="${template.colors.accent}" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="48" fill="url(#g)" />
  <text x="80" y="140" font-size="64" font-weight="700" fill="#fff" font-family="Space Grotesk, sans-serif">
    ${escapeXml(template.headline)}
  </text>
  <text x="80" y="210" font-size="28" fill="#F8FAFC" font-family="Space Grotesk, sans-serif">
    ${escapeXml(template.subhead)}
  </text>
  <text x="80" y="280" font-size="24" fill="#F8FAFC" font-family="Space Grotesk, sans-serif">
    ${escapeXml(metricsText)}
  </text>
  <text x="80" y="340" font-size="18" fill="#E0F2FE" font-family="Space Grotesk, sans-serif" opacity="0.9">
    Persona: ${escapeXml(template.persona_archetype.label)} · ${escapeXml(archetypes)}
  </text>
  <text x="80" y="420" font-size="16" fill="#E0F2FE" font-family="Space Grotesk, sans-serif" opacity="0.8">
    #Vibed
  </text>
</svg>`;
}

function weekdayName(dow: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow] ?? "—";
}

export default function AnalysisClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<InsightHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const jobStatus = data?.job.status ?? null;

  const parsedReport = data && isReportRow(data.report) ? data.report : null;
  const parsedMetrics = data && isMetricsRow(data.metrics) ? data.metrics : null;
  const parsedInsightsRow = data && isInsightsRow(data.insights) ? data.insights : null;

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

  const handleDownloadShare = () => {
    if (!shareTemplate) return;
    const svg = createShareSvg(shareTemplate);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vibed-coding-${jobId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let cancelled = false;
    if (jobStatus !== "done") {
      setHistory([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return () => {
        cancelled = true;
      };
    }

    async function fetchHistory() {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetch("/api/analysis/history", { cache: "no-store" });
        const payload = (await res.json()) as { history?: InsightHistoryEntry[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setHistoryError(payload.error ?? "Unable to load insight history");
          setHistory([]);
        } else {
          setHistory(payload.history ?? []);
        }
      } catch {
        if (cancelled) return;
        setHistoryError("Failed to load insight history");
        setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [jobStatus]);

  if (error) return <p className="mt-6 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-zinc-600">Loading…</p>;

  const { job } = data;

  // Show minimal status for non-complete states
  if (job.status === "queued" || job.status === "running") {
    return (
      <div className="mt-6 flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-fuchsia-500" />
        <p className="text-sm text-zinc-600">
          {job.status === "queued" ? "Waiting to analyze…" : "Analyzing your commits…"}
        </p>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">Analysis failed</p>
        <p className="mt-2 text-sm text-red-600">{job.error_message ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {job.status === "done" && events.length > 0 ? (
        <>
          {/* Main Vibe Card - Hero Section */}
          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-500/10" />
            <div className="relative p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Your Vibe</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
                {persona.label}
              </h2>
              <p className="mt-3 max-w-2xl text-base text-zinc-600">
                {persona.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {persona.archetypes.map((arch) => (
                  <span
                    key={arch}
                    className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {arch}
                  </span>
                ))}
              </div>

              {/* Insights Grid - Inside the main card */}
              <div className="mt-8 grid gap-4 border-t border-zinc-100 pt-8 sm:grid-cols-2 lg:grid-cols-5">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Streak</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {wrapped.streak.longest_days} day{wrapped.streak.longest_days === 1 ? "" : "s"}
                  </p>
                  {wrapped.streak.start_day && wrapped.streak.end_day ? (
                    <p className="mt-1 text-xs text-zinc-500">{wrapped.streak.start_day} → {wrapped.streak.end_day}</p>
                  ) : null}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Peak day</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {wrapped.timing.peak_weekday !== null ? weekdayName(wrapped.timing.peak_weekday) : "—"}
                  </p>
                  {wrapped.timing.peak_window ? (
                    <p className="mt-1 text-xs text-zinc-500">{wrapped.timing.peak_window} (UTC)</p>
                  ) : null}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Focus</p>
                  <p className="mt-1 text-2xl font-semibold capitalize text-zinc-900">
                    {wrapped.commits.top_category ?? "—"}
                  </p>
                  {wrapped.commits.top_category ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {wrapped.commits.category_counts[wrapped.commits.top_category] ?? 0} of {wrapped.totals.commits} commits
                    </p>
                  ) : null}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Build vs Fix</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {wrapped.commits.features_per_fix !== null
                      ? `${wrapped.commits.features_per_fix.toFixed(1)} : 1`
                      : wrapped.commits.fixes_per_feature !== null
                        ? `1 : ${wrapped.commits.fixes_per_feature.toFixed(1)}`
                        : "—"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {wrapped.commits.features_per_fix !== null
                      ? "features per fix"
                      : wrapped.commits.fixes_per_feature !== null
                        ? "fixes per feature"
                        : "balanced"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Scope</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {wrapped.chunkiness.avg_files_changed !== null
                      ? `${wrapped.chunkiness.avg_files_changed.toFixed(1)}`
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {wrapped.chunkiness.label === "chunker"
                      ? "files/commit (wide)"
                      : wrapped.chunkiness.label === "mixer"
                        ? "files/commit (balanced)"
                        : wrapped.chunkiness.label === "slicer"
                          ? "files/commit (focused)"
                          : "files/commit"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile contribution banner */}
          <div className="rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-fuchsia-50 via-indigo-50 to-cyan-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600" />
                <p className="text-sm text-zinc-700">
                  This repo contributes to your aggregated profile
                </p>
              </div>
              <a
                href="/profile"
                className="text-sm font-semibold text-zinc-950 transition hover:text-zinc-700"
              >
                View profile →
              </a>
            </div>
          </div>

          {/* Share Card - Centered */}
          {shareTemplate ? (
            <div className="flex justify-center">
              <div
                className="w-full max-w-xl rounded-3xl border border-black/5 p-6 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${shareTemplate.colors.primary}, ${shareTemplate.colors.accent})`,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Share your vibe</p>
                <h3 className="mt-3 text-3xl font-semibold text-white">{shareTemplate.headline}</h3>
                <p className="mt-2 text-sm text-white/80">{shareTemplate.subhead}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {shareTemplate.metrics.map((metric) => (
                    <div key={metric.label} className="text-center">
                      <p className="text-xs uppercase tracking-wider text-white/70">{metric.label}</p>
                      <p className="text-lg font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                    onClick={handleCopyShare}
                  >
                    {copied ? "Copied" : "Copy summary"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                    onClick={handleDownloadShare}
                  >
                    Download SVG
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Timeline - Only show if there's history */}
          {history.length > 1 ? (
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Your journey
                  </p>
                  <h3 className="text-xl font-semibold text-zinc-950">Vibe timeline</h3>
                </div>
                <div className="text-xs text-zinc-500">
                  {historyLoading && "Loading…"}
                  {historyError ? historyError : null}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {history.slice(0, 6).map((entry) => (
                  <div
                    key={entry.job_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-zinc-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-zinc-400">
                        {fmtDate(entry.created_at)}
                      </p>
                      <p className="text-base font-semibold text-zinc-900">{entry.persona_label ?? "—"}</p>
                    </div>
                    {entry.persona_confidence ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                        {entry.persona_confidence}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
