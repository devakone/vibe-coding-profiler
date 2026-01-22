"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeAnalysisInsights } from "@vibed/core";
import type { AnalysisInsights, AnalysisMetrics, CommitEvent } from "@vibed/core";
import { formatMetricLabel, formatMetricValue } from "@/lib/format-labels";
import { computeShareCardMetrics } from "@/lib/vcp/metrics";
import { isVibeAxes } from "@/lib/vcp/validators";
import { ShareCard, ShareActions } from "@/components/share";
import type { ShareImageTemplate, ShareCardMetric } from "@/components/share";
import {
  RepoIdentitySection,
  RepoAxesSection,
  RepoMetricsGrid,
  ProfileContributionCard,
} from "@/components/vcp/repo";

type Job = {
  id: string;
  status: string;
  error_message: string | null;
  repo_id?: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ApiResponse = {
  job: Job;
  report: unknown | null;
  metrics: unknown | null;
  insights: unknown | null;
  profileContribution?: unknown | null;
  userAvatarUrl?: string | null;
  userId?: string | null;
  vibeInsights?: VibeInsightsRow | null;
};

type StoryMeta = {
  llm_used: boolean;
  llm_reason: string;
};

type ProfileMeta = {
  needsRebuild: boolean;
  willUseLlm: boolean;
  llmExhausted: boolean;
  reposWithLlm: number;
  repoLimit: number;
  llmSource: string;
  llmReason: string;
};

type ProfileContribution = {
  repoName: string | null;
  jobCommitCount: number | null;
  includedInProfile: boolean | null;
  profileTotalCommits: number | null;
  profileTotalRepos: number | null;
  profilePersonaName: string | null;
  profileUpdatedAt: string | null;
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

type VibeInsightsRow = {
  axes_json: unknown;
  persona_id: string;
  persona_name: string;
  persona_tagline: string | null;
  persona_confidence: string;
  persona_score: number | null;
};

type InsightHistoryEntry = {
  job_id: string;
  status: string;
  created_at: string;
  repo_id?: string;
  persona_label?: string;
  persona_confidence?: string;
  share_template?: AnalysisInsights["share_template"];
  generated_at?: string;
  analysis_jobs?: {
    status: string;
    created_at: string;
    repo_id: string | null;
  };
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

function isProfileContribution(v: unknown): v is ProfileContribution {
  if (!isRecord(v)) return false;
  if (!isStringOrNull(v.repoName)) return false;
  if (!isNumberOrNull(v.jobCommitCount)) return false;
  if (!isBooleanOrNull(v.includedInProfile)) return false;
  if (!isNumberOrNull(v.profileTotalCommits)) return false;
  if (!isNumberOrNull(v.profileTotalRepos)) return false;
  if (!isStringOrNull(v.profilePersonaName)) return false;
  if (!isStringOrNull(v.profileUpdatedAt)) return false;
  return true;
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

function isVibeInsightsRow(v: unknown): v is VibeInsightsRow {
  if (!isRecord(v)) return false;
  if (!isVibeAxes(v.axes_json)) return false;
  if (typeof v.persona_id !== "string") return false;
  if (typeof v.persona_name !== "string") return false;
  if (typeof v.persona_confidence !== "string") return false;
  const tagline = v.persona_tagline;
  if (tagline !== null && typeof tagline !== "string") return false;
  if (typeof v.persona_score !== "number" && v.persona_score !== null) return false;
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

function isStoryMeta(v: unknown): v is StoryMeta {
  if (!isRecord(v)) return false;
  return typeof v.llm_used === "boolean" && typeof v.llm_reason === "string";
}

function isProfileMeta(v: unknown): v is ProfileMeta {
  if (!isRecord(v)) return false;
  return (
    typeof v.needsRebuild === "boolean" &&
    typeof v.willUseLlm === "boolean" &&
    typeof v.llmExhausted === "boolean" &&
    typeof v.reposWithLlm === "number" &&
    typeof v.repoLimit === "number" &&
    typeof v.llmSource === "string" &&
    typeof v.llmReason === "string"
  );
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


export default function AnalysisClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<InsightHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [shareOrigin, setShareOrigin] = useState<string>("");
  const [regeneratingStory, setRegeneratingStory] = useState(false);
  const [regenerateStoryError, setRegenerateStoryError] = useState<string | null>(null);
  const [regenerateStoryMeta, setRegenerateStoryMeta] = useState<StoryMeta | null>(null);
  const [showLlmWarningModal, setShowLlmWarningModal] = useState(false);
  const [pendingProfileMeta, setPendingProfileMeta] = useState<ProfileMeta | null>(null);
  const [rebuildingProfile, setRebuildingProfile] = useState(false);
  const [profileRebuildStatus, setProfileRebuildStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    setShareOrigin(window.location.origin);
  }, []);

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
  const parsedVibeInsights = data && isVibeInsightsRow(data.vibeInsights) ? data.vibeInsights : null;
  const profileContribution =
    data && isProfileContribution(data.profileContribution) ? data.profileContribution : null;

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

  const shareText = useMemo(() => {
    if (!shareTemplate) return "";
    const metricsLine = shareTemplate.metrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(" · ");
    const taglineLine = shareTemplate.tagline ?? shareTemplate.subhead;
    return `${shareTemplate.headline}\n${taglineLine}\n${metricsLine}\n#VCP`;
  }, [shareTemplate]);

  const shareUrl = useMemo(() => {
    if (!shareOrigin) return "";
    return `${shareOrigin}/analysis/${jobId}`;
  }, [jobId, shareOrigin]);

  const shareCaption = useMemo(() => {
    if (!shareTemplate) return "";
    const metricsLine = shareTemplate.metrics
      .slice(0, 3)
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(" · ");
    const taglineLine = shareTemplate.tagline ?? shareTemplate.subhead;
    return `${shareTemplate.headline} — ${taglineLine}\n${metricsLine}\n#VCP`;
  }, [shareTemplate]);

  const storyEndpoint = data?.userId
    ? `/api/share/story/${data.userId}?jobId=${jobId}`
    : undefined;

  // Build share template for ShareActions component
  // Build metrics for ShareCard
  const shareCardMetrics: ShareCardMetric[] = useMemo(() => {
    if (parsedVibeInsights && isVibeAxes(parsedVibeInsights.axes_json)) {
      const axes = parsedVibeInsights.axes_json;
      const peakWindow = isAnalysisInsights(insightsJson)
        ? insightsJson.timing.peak_window
        : null;
      const computed = computeShareCardMetrics(axes, peakWindow ?? null);
      return [
        { label: "Strongest", value: computed.strongest },
        { label: "Style", value: computed.style },
        { label: "Rhythm", value: computed.rhythm },
        { label: "Peak", value: computed.peak },
      ];
    }

    const chunkinessLabel = wrapped.chunkiness.label
      ? `${wrapped.chunkiness.label.charAt(0).toUpperCase()}${wrapped.chunkiness.label.slice(1)}`
      : "Balanced";
    const peakWindowLabel = wrapped.timing.peak_window
      ? formatMetricLabel(wrapped.timing.peak_window)
      : "Varied";
    return [
      { label: "Strongest", value: persona?.label ?? "Vibe coder" },
      { label: "Style", value: chunkinessLabel },
      { label: "Rhythm", value: peakWindowLabel },
      { label: "Peak", value: peakWindowLabel },
    ];
  }, [persona, parsedVibeInsights, wrapped, insightsJson]);

  const repoAxes =
    parsedVibeInsights && isVibeAxes(parsedVibeInsights.axes_json)
      ? parsedVibeInsights.axes_json
      : null;

  const shareImageTemplate: ShareImageTemplate | null = shareTemplate
    ? {
        colors: shareTemplate.colors,
        headline: shareTemplate.headline,
        subhead: shareTemplate.subhead,
        tagline: shareTemplate.tagline ?? shareTemplate.subhead,
        metrics: shareCardMetrics,
        persona_archetype: shareTemplate.persona_archetype,
      }
    : null;

  const triggerProfileRebuild = async () => {
    setRebuildingProfile(true);
    setProfileRebuildStatus("idle");
    try {
      const res = await fetch("/api/profile/rebuild", { method: "POST" });
      if (!res.ok) {
        setProfileRebuildStatus("error");
      } else {
        setProfileRebuildStatus("success");
      }
    } catch {
      setProfileRebuildStatus("error");
    } finally {
      setRebuildingProfile(false);
      // Auto-clear success status after 4 seconds
      setTimeout(() => setProfileRebuildStatus("idle"), 4000);
    }
  };

  const executeRegenerateStory = async () => {
    setRegenerateStoryError(null);
    setRegenerateStoryMeta(null);
    setRegeneratingStory(true);
    try {
      const res = await fetch(`/api/analysis/${jobId}/regenerate-story`, { method: "POST" });
      const payload = (await res.json()) as {
        report?: unknown;
        story?: unknown;
        profile?: unknown;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to regenerate story");
      if (payload.report) {
        setData((prev) => (prev ? { ...prev, report: payload.report } : prev));
      }
      if (payload.story && isStoryMeta(payload.story)) {
        setRegenerateStoryMeta(payload.story);
      }
      // Auto-trigger profile rebuild after story regeneration
      if (payload.profile && isProfileMeta(payload.profile) && payload.profile.needsRebuild) {
        triggerProfileRebuild();
      }
    } catch (e) {
      setRegenerateStoryError(e instanceof Error ? e.message : "Failed to regenerate story");
    } finally {
      setRegeneratingStory(false);
    }
  };

  const handleRegenerateStory = async () => {
    // Check if we need to show warning modal first
    // We need to get profile status before regenerating
    setRegenerateStoryError(null);
    setRegenerateStoryMeta(null);
    setRegeneratingStory(true);
    try {
      const res = await fetch(`/api/analysis/${jobId}/regenerate-story`, { method: "POST" });
      const payload = (await res.json()) as {
        report?: unknown;
        story?: unknown;
        profile?: unknown;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to regenerate story");

      // Check if profile will lose LLM and show warning
      const profileInfo = payload.profile && isProfileMeta(payload.profile) ? payload.profile : null;
      if (profileInfo && profileInfo.llmExhausted && !profileInfo.willUseLlm) {
        // Show warning modal for future regenerations
        setPendingProfileMeta(profileInfo);
      }

      if (payload.report) {
        setData((prev) => (prev ? { ...prev, report: payload.report } : prev));
      }
      if (payload.story && isStoryMeta(payload.story)) {
        setRegenerateStoryMeta(payload.story);
      }
      // Auto-trigger profile rebuild after story regeneration
      if (profileInfo && profileInfo.needsRebuild) {
        triggerProfileRebuild();
      }
    } catch (e) {
      setRegenerateStoryError(e instanceof Error ? e.message : "Failed to regenerate story");
    } finally {
      setRegeneratingStory(false);
    }
  };

  const handleConfirmRegenerateWithWarning = () => {
    setShowLlmWarningModal(false);
    executeRegenerateStory();
  };

  const handleCancelRegenerateWithWarning = () => {
    setShowLlmWarningModal(false);
    setPendingProfileMeta(null);
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

  // Filter history to show only runs for the same repo
  const currentRepoId = data?.job.repo_id;
  const repoHistory = useMemo(() => {
    if (!currentRepoId) return [];
    return history.filter((entry) => {
      const entryRepoId = entry.analysis_jobs?.repo_id ?? entry.repo_id;
      return entryRepoId === currentRepoId;
    });
  }, [history, currentRepoId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-zinc-600">Loading…</p>;

  const { job } = data;

  // Show minimal status for non-complete states
  if (job.status === "queued" || job.status === "running") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-fuchsia-500" />
        <p className="text-sm text-zinc-600">
          {job.status === "queued" ? "Waiting to analyze…" : "Analyzing your commits…"}
        </p>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">Analysis failed</p>
        <p className="mt-2 text-sm text-red-600">{job.error_message ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* LLM Warning Modal */}
      {showLlmWarningModal && pendingProfileMeta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Profile LLM Limit Reached</h3>
            <p className="mt-3 text-sm text-zinc-600">
              You have analyzed {pendingProfileMeta.reposWithLlm} repos with LLM-generated reports,
              exceeding the free limit of {pendingProfileMeta.repoLimit} repos.
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              Regenerating will rebuild your Unified VCP using a{" "}
              <span className="font-semibold">non-LLM generated narrative</span>. Your previous
              LLM-generated profile versions will remain accessible in your profile history.
            </p>
            <p className="mt-3 text-sm text-zinc-700">
              To continue using LLM-generated narratives, add your own API key in Settings.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                onClick={handleCancelRegenerateWithWarning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                onClick={handleConfirmRegenerateWithWarning}
              >
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile Rebuild Notification */}
      {(rebuildingProfile || profileRebuildStatus !== "idle") ? (
        <div
          className={`rounded-2xl border p-4 ${
            profileRebuildStatus === "error"
              ? "border-red-200 bg-red-50"
              : profileRebuildStatus === "success"
                ? "border-green-200 bg-green-50"
                : "border-fuchsia-200 bg-fuchsia-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {rebuildingProfile ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-fuchsia-200 border-t-fuchsia-500" />
                <p className="text-sm font-medium text-fuchsia-800">
                  Rebuilding your Unified VCP with latest analysis...
                </p>
              </>
            ) : profileRebuildStatus === "success" ? (
              <p className="text-sm font-medium text-green-800">
                Your Unified VCP has been updated with the latest analysis.
              </p>
            ) : profileRebuildStatus === "error" ? (
              <p className="text-sm font-medium text-red-800">
                Failed to rebuild your Unified VCP. Please try again later.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Pending Profile LLM Warning Banner */}
      {pendingProfileMeta && !showLlmWarningModal && pendingProfileMeta.llmExhausted && !pendingProfileMeta.willUseLlm ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Your Unified VCP is now using a non-LLM narrative because you&apos;ve exceeded the
            free limit of {pendingProfileMeta.repoLimit} repos. Add your own API key in Settings
            to restore LLM-generated profiles.
          </p>
        </div>
      ) : null}

      {job.status === "done" && events.length > 0 ? (
        <>
          {/* HERO: Share Card - The main action users should take */}
          {shareTemplate ? (
            <div className="space-y-4">
              <ShareCard
                variant="repo"
                personaId={persona.id}
                persona={{
                  label: persona.label,
                  tagline: persona.description,
                  confidence: persona.confidence,
                  archetypes: persona.archetypes,
                }}
                metrics={shareCardMetrics}
                footer={{
                  left: process.env.NEXT_PUBLIC_APP_URL
                    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
                    : "vibed.dev",
                  right: `${wrapped.totals.commits} commits${metricsJson?.active_days ? ` · ${metricsJson.active_days} active days` : ""}`,
                }}
                colors={shareTemplate.colors}
                avatarUrl={data?.userAvatarUrl}
                tagline={shareTemplate.tagline ?? persona.description}
              />
              <ShareActions
                shareUrl={shareUrl}
                shareText={shareText}
                shareCaption={shareCaption}
                shareHeadline={shareTemplate.headline}
                shareTemplate={shareImageTemplate}
                entityId={jobId}
                storyEndpoint={storyEndpoint}
              />
            </div>
          ) : null}

          {/* Version Selector - Switch between runs of this repo */}
          {repoHistory.length > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Version:</span>
                <select
                  className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                  value={jobId}
                  onChange={(e) => {
                    if (e.target.value !== jobId) {
                      window.location.href = `/analysis/${e.target.value}`;
                    }
                  }}
                >
                  {repoHistory.map((entry, idx) => {
                    const entryDate = new Date(entry.analysis_jobs?.created_at ?? entry.created_at);
                    const dateStr = entryDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: entryDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                    });
                    const isCurrentJob = entry.job_id === jobId;
                    return (
                      <option key={entry.job_id} value={entry.job_id}>
                        {dateStr} — {entry.persona_label ?? "Unknown"} {isCurrentJob ? "(current)" : ""} {idx === 0 ? "(latest)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <span className="text-xs text-zinc-400">
                {repoHistory.length} runs of this repo
              </span>
            </div>
          ) : null}

          {/* Navigation and archetypes */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              My Unified VCP
            </Link>
            <div className="flex flex-wrap gap-2">
              {persona.archetypes.map((arch) => (
                <span
                  key={arch}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {arch}
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Analysis Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-indigo-500/8" />
            <div className="relative p-8">
              <RepoIdentitySection
                persona={persona}
                narrative={narrative ? { summary: narrative.summary } : null}
                matchedCriteria={matchedCriteria}
              />

              {repoAxes ? (
                <div className="mt-6">
                  <RepoAxesSection axes={repoAxes} />
                </div>
              ) : null}

              <RepoMetricsGrid
                className="mt-6"
                streak={wrapped.streak}
                timing={wrapped.timing}
                commits={wrapped.commits}
                chunkiness={wrapped.chunkiness}
                totals={wrapped.totals}
              />

              {/* Artifact Traceability Section */}
              {wrapped.artifact_traceability ? (
                <div className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-5 backdrop-blur">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                      Workflow Style
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        wrapped.artifact_traceability.workflow_style === "orchestrator"
                          ? "bg-cyan-100 text-cyan-800"
                          : wrapped.artifact_traceability.workflow_style === "conductor"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-violet-100 text-violet-800"
                      }`}
                    >
                      {wrapped.artifact_traceability.workflow_style === "orchestrator"
                        ? "Orchestrator"
                        : wrapped.artifact_traceability.workflow_style === "conductor"
                          ? "Conductor"
                          : "Hybrid"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">
                    {wrapped.artifact_traceability.workflow_style === "orchestrator"
                      ? "Durable git trail with PRs, issue links, and structured collaboration — typical of autonomous agent workflows."
                      : wrapped.artifact_traceability.workflow_style === "conductor"
                        ? "More ephemeral, IDE-chat style workflow with fewer artifacts — typical of interactive AI pair programming."
                        : "Mix of orchestrator and conductor patterns — balancing structured PRs with interactive development."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {wrapped.artifact_traceability.pr_coverage_rate !== null ? (
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">PR Coverage</p>
                        <p className="mt-1 text-xl font-semibold text-zinc-900">
                          {Math.round(wrapped.artifact_traceability.pr_coverage_rate * 100)}%
                        </p>
                      </div>
                    ) : null}
                    {wrapped.artifact_traceability.issue_link_rate !== null ? (
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Issue Linking</p>
                        <p className="mt-1 text-xl font-semibold text-zinc-900">
                          {Math.round(wrapped.artifact_traceability.issue_link_rate * 100)}%
                        </p>
                      </div>
                    ) : null}
                    {wrapped.artifact_traceability.structured_pr_rate !== null ? (
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Structured PRs</p>
                        <p className="mt-1 text-xl font-semibold text-zinc-900">
                          {Math.round(wrapped.artifact_traceability.structured_pr_rate * 100)}%
                        </p>
                      </div>
                    ) : null}
                    {wrapped.artifact_traceability.dominant_merge_method ? (
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Merge Style</p>
                        <p className="mt-1 text-xl font-semibold capitalize text-zinc-900">
                          {wrapped.artifact_traceability.dominant_merge_method}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  {wrapped.artifact_traceability.scores ? (
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
                      <span>
                        Orchestrator: <span className="font-semibold text-cyan-700">{wrapped.artifact_traceability.scores.orchestrator_score}</span>
                      </span>
                      <span>vs</span>
                      <span>
                        Conductor: <span className="font-semibold text-amber-700">{wrapped.artifact_traceability.scores.conductor_score}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-5 backdrop-blur">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Narrative</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-zinc-500">
                      {parsedReport?.llm_model && parsedReport.llm_model !== "none"
                        ? `Generated with ${parsedReport.llm_model}`
                        : "Generated from metrics"}
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleRegenerateStory}
                      disabled={regeneratingStory}
                    >
                      {regeneratingStory ? "Regenerating…" : "Regenerate"}
                    </button>
                  </div>
                </div>
                {regenerateStoryMeta && regenerateStoryMeta.llm_used === false ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    LLM narrative unavailable: {regenerateStoryMeta.llm_reason}
                  </p>
                ) : null}
                {regenerateStoryError ? (
                  <p className="mt-3 text-sm text-red-600">{regenerateStoryError}</p>
                ) : null}
                {sections.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-5">
                    {sections.slice(0, 3).map((s, idx) => (
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
                    {sections.length > 3 ? (
                      <details className="rounded-2xl border border-black/5 bg-white/60 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                          More sections
                        </summary>
                        <div className="mt-4 flex flex-col gap-5">
                          {sections.slice(3).map((s, idx) => (
                            <section key={`${s.title ?? "section"}-${idx + 3}`} className="space-y-2">
                              <h4 className="text-base font-semibold text-zinc-900">
                                {s.title ?? "Untitled"}
                              </h4>
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
                      </details>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-600">No narrative is available for this Repo VCP yet.</p>
                )}
              </div>

              {profileContribution ? (
                <ProfileContributionCard
                  contribution={profileContribution}
                  isRebuilding={rebuildingProfile}
                  rebuildStatus={profileRebuildStatus}
                  onRebuild={
                    profileContribution.includedInProfile === false ? triggerProfileRebuild : undefined
                  }
                  className="mt-6"
                />
              ) : null}
            </div>
          </div>

          <details className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
              Timeline and details
            </summary>
            <div className="mt-5 space-y-6">
              {history.length > 1 ? (
                <details className="rounded-2xl border border-black/5 bg-zinc-50 p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                    Timeline
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {historyLoading ? "Loading…" : historyError ? historyError : `${history.length} reads`}
                    </span>
                  </summary>
                  <div className="mt-4 flex flex-col gap-3">
                    {history.slice(0, 8).map((entry) => (
                      <div
                        key={entry.job_id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-xs text-zinc-400">{fmtDate(entry.created_at)}</p>
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
                </details>
              ) : null}

              {highlights.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map((h, idx) => (
                    <div
                      key={`${h.metric ?? "metric"}-${idx}`}
                      className="rounded-2xl border border-black/5 bg-zinc-50 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                        {h.metric ? formatMetricLabel(h.metric) : "Metric"}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-zinc-900">
                        {h.value ? formatMetricValue(h.value, 2) : "—"}
                      </p>
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
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-zinc-700"
                      >
                        {formatMetricLabel(c)}
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
