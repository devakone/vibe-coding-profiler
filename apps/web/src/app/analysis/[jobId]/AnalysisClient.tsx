"use client";

import Link from "next/link";
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
  profileContribution?: unknown | null;
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ShareFormat = "og" | "square" | "story";

const SHARE_FORMATS: Record<
  ShareFormat,
  {
    label: string;
    width: number;
    height: number;
    pad: number;
    headlineSize: number;
    subheadSize: number;
    metricsSize: number;
    metaSize: number;
    watermarkSize: number;
    cardRadius: number;
  }
> = {
  og: {
    label: "OpenGraph 1200×630",
    width: 1200,
    height: 630,
    pad: 80,
    headlineSize: 64,
    subheadSize: 28,
    metricsSize: 24,
    metaSize: 18,
    watermarkSize: 18,
    cardRadius: 48,
  },
  square: {
    label: "Square 1080×1080",
    width: 1080,
    height: 1080,
    pad: 88,
    headlineSize: 72,
    subheadSize: 32,
    metricsSize: 28,
    metaSize: 20,
    watermarkSize: 20,
    cardRadius: 64,
  },
  story: {
    label: "Story 1080×1920",
    width: 1080,
    height: 1920,
    pad: 96,
    headlineSize: 84,
    subheadSize: 36,
    metricsSize: 30,
    metaSize: 22,
    watermarkSize: 22,
    cardRadius: 64,
  },
};

function wrapTextLines(
  text: string,
  maxCharsPerLine: number,
  maxLines: number
): { lines: string[]; truncated: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) {
        return { lines, truncated: true };
      }
      continue;
    }

    lines.push(word.slice(0, Math.max(1, maxCharsPerLine)));
    if (lines.length >= maxLines) {
      return { lines, truncated: true };
    }
    current = "";
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    return { lines: lines.slice(0, maxLines), truncated: true };
  }

  return { lines, truncated: false };
}

function withEllipsis(text: string): string {
  const t = text.trim();
  return t.length === 0 ? t : `${t}…`;
}

function createShareSvg(template: AnalysisInsights["share_template"], format: ShareFormat): string {
  const cfg = SHARE_FORMATS[format];
  const metricsText = template.metrics
    .slice(0, 3)
    .map((metric) => `${metric.label}: ${metric.value}`)
    .join(" · ");
  const archetypes = template.persona_archetype.archetypes.slice(0, 3).join(", ");

  const headlineChars = format === "og" ? 26 : format === "square" ? 22 : 18;
  const subheadChars = format === "og" ? 46 : format === "square" ? 36 : 30;
  const metricsChars = format === "og" ? 72 : format === "square" ? 60 : 46;

  const headlineWrapped = wrapTextLines(template.headline, headlineChars, 2);
  const subheadWrapped = wrapTextLines(template.subhead, subheadChars, 2);
  const metricsWrapped = wrapTextLines(metricsText, metricsChars, format === "story" ? 2 : 1);

  const headlineLines = headlineWrapped.lines.map((l, idx) =>
    escapeXml(idx === headlineWrapped.lines.length - 1 && headlineWrapped.truncated ? withEllipsis(l) : l)
  );
  const subheadLines = subheadWrapped.lines.map((l, idx) =>
    escapeXml(idx === subheadWrapped.lines.length - 1 && subheadWrapped.truncated ? withEllipsis(l) : l)
  );
  const metricsLines = metricsWrapped.lines.map((l, idx) =>
    escapeXml(idx === metricsWrapped.lines.length - 1 && metricsWrapped.truncated ? withEllipsis(l) : l)
  );

  const startY =
    format === "story" ? Math.round(cfg.height * 0.34) : cfg.pad + Math.round(cfg.headlineSize * 0.9);

  const headlineY = startY;
  const subheadY = headlineY + Math.round(cfg.headlineSize * 0.95) + 18;
  const metricsY = subheadY + Math.round(cfg.subheadSize * 0.95) + 18;
  const metaY =
    format === "story" ? Math.round(cfg.height * 0.72) : metricsY + Math.round(cfg.metricsSize * 0.95) + 28;
  const hashY = metaY + Math.round(cfg.metaSize * 1.6);
  const watermarkY = cfg.height - Math.round(cfg.pad * 0.6);

  const x = cfg.pad;
  const watermarkX = cfg.width - cfg.pad;

  const headlineTspans = headlineLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.headlineSize * 1.1)}">${line}</tspan>`)
    .join("");
  const subheadTspans = subheadLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.subheadSize * 1.25)}">${line}</tspan>`)
    .join("");
  const metricsTspans = metricsLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.metricsSize * 1.25)}">${line}</tspan>`)
    .join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.width}" height="${cfg.height}" viewBox="0 0 ${cfg.width} ${cfg.height}">
  <defs>
    <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${template.colors.primary}" />
      <stop offset="100%" stop-color="${template.colors.accent}" />
    </linearGradient>
  </defs>
  <rect width="${cfg.width}" height="${cfg.height}" rx="${cfg.cardRadius}" fill="url(#g)" />
  <text x="${x}" y="${headlineY}" font-size="${cfg.headlineSize}" font-weight="700" fill="#FFFFFF" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${headlineTspans}
  </text>
  <text x="${x}" y="${subheadY}" font-size="${cfg.subheadSize}" fill="rgba(255,255,255,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${subheadTspans}
  </text>
  <text x="${x}" y="${metricsY}" font-size="${cfg.metricsSize}" fill="rgba(255,255,255,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${metricsTspans}
  </text>
  <text x="${x}" y="${metaY}" font-size="${cfg.metaSize}" fill="rgba(224,242,254,0.9)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    Persona: ${escapeXml(template.persona_archetype.label)} · ${escapeXml(archetypes)}
  </text>
  <text x="${x}" y="${hashY}" font-size="${cfg.metaSize}" fill="rgba(224,242,254,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    #Vibed
  </text>
  <text x="${watermarkX}" y="${watermarkY}" font-size="${cfg.watermarkSize}" text-anchor="end" fill="rgba(255,255,255,0.75)" font-family="Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    vibed.coding
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("og");
  const [shareDownloadError, setShareDownloadError] = useState<string | null>(null);
  const [downloadingShare, setDownloadingShare] = useState(false);
  const [shareOrigin, setShareOrigin] = useState<string>("");
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const [regeneratingStory, setRegeneratingStory] = useState(false);
  const [regenerateStoryError, setRegenerateStoryError] = useState<string | null>(null);
  const [regenerateStoryMeta, setRegenerateStoryMeta] = useState<StoryMeta | null>(null);
  const [showLlmWarningModal, setShowLlmWarningModal] = useState(false);
  const [pendingProfileMeta, setPendingProfileMeta] = useState<ProfileMeta | null>(null);
  const [rebuildingProfile, setRebuildingProfile] = useState(false);
  const [profileRebuildStatus, setProfileRebuildStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    setShareOrigin(window.location.origin);
    setSupportsNativeShare(typeof navigator !== "undefined" && "share" in navigator);
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
  const profileContributionLabel = (() => {
    if (!profileContribution) return null;
    if (profileContribution.includedInProfile === true) return "Included in your Vibed profile";
    if (profileContribution.includedInProfile === false) return "Not yet included in your Vibed profile";
    return "Vibed profile impact";
  })();

  const shareText = useMemo(() => {
    if (!shareTemplate) return "";
    const metricsLine = shareTemplate.metrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(" · ");
    return `${shareTemplate.headline}\n${shareTemplate.subhead}\n${metricsLine}\n#Vibed`;
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
    return `${shareTemplate.headline} — ${shareTemplate.subhead}\n${metricsLine}\n#Vibed`;
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

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const openSharePopup = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=800,height=600");
  };

  const handleShareTwitter = () => {
    if (!shareUrl) return;
    const u = new URL("https://twitter.com/intent/tweet");
    u.searchParams.set("text", shareCaption);
    u.searchParams.set("url", shareUrl);
    openSharePopup(u.toString());
  };

  const handleShareFacebook = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.facebook.com/sharer/sharer.php");
    u.searchParams.set("u", shareUrl);
    if (shareCaption) u.searchParams.set("quote", shareCaption);
    openSharePopup(u.toString());
  };

  const handleShareLinkedIn = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.linkedin.com/sharing/share-offsite/");
    u.searchParams.set("url", shareUrl);
    openSharePopup(u.toString());
  };

  const handleShareReddit = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.reddit.com/submit");
    u.searchParams.set("url", shareUrl);
    if (shareTemplate?.headline) u.searchParams.set("title", shareTemplate.headline);
    openSharePopup(u.toString());
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const u = new URL("https://wa.me/");
    u.searchParams.set("text", `${shareCaption}\n${shareUrl}`.trim());
    openSharePopup(u.toString());
  };

  const handleNativeShare = async () => {
    if (!shareUrl || !shareTemplate) return;
    if (!("share" in navigator)) return;
    try {
      await navigator.share({
        title: shareTemplate.headline,
        text: shareCaption,
        url: shareUrl,
      });
    } catch {
      // no-op
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadShareSvg = (format: ShareFormat) => {
    if (!shareTemplate) return;
    setShareDownloadError(null);
    const svg = createShareSvg(shareTemplate, format);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `vibed-coding-${jobId}-${format}.svg`);
  };

  const handleDownloadSharePng = async (format: ShareFormat) => {
    if (!shareTemplate) return;
    setShareDownloadError(null);
    setDownloadingShare(true);
    let svgUrl: string | null = null;
    try {
      const svg = createShareSvg(shareTemplate, format);
      const cfg = SHARE_FORMATS[format];

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image_load_failed"));
      });
      img.src = svgUrl;
      await loaded;

      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = cfg.width * scale;
      canvas.height = cfg.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas_unsupported");
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0, cfg.width, cfg.height);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png_encode_failed"))), "image/png");
      });

      downloadBlob(pngBlob, `vibed-coding-${jobId}-${format}.png`);
    } catch (e) {
      setShareDownloadError(e instanceof Error ? e.message : "download_failed");
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setDownloadingShare(false);
    }
  };

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
              Regenerating will rebuild your aggregate Vibed profile using a{" "}
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
                className="flex-1 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
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
                  Rebuilding your Vibed profile with latest analysis...
                </p>
              </>
            ) : profileRebuildStatus === "success" ? (
              <p className="text-sm font-medium text-green-800">
                Your Vibed profile has been updated with the latest analysis.
              </p>
            ) : profileRebuildStatus === "error" ? (
              <p className="text-sm font-medium text-red-800">
                Failed to rebuild your Vibed profile. Please try again later.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Pending Profile LLM Warning Banner */}
      {pendingProfileMeta && !showLlmWarningModal && pendingProfileMeta.llmExhausted && !pendingProfileMeta.willUseLlm ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Your Vibed profile is now using a non-LLM narrative because you've exceeded the
            free limit of {pendingProfileMeta.repoLimit} repos. Add your own API key in Settings
            to restore LLM-generated profiles.
          </p>
        </div>
      ) : null}

      {job.status === "done" && events.length > 0 ? (
        <>
          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-500/10" />
            <div className="relative p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Your vibe</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
                    {persona.label}
                  </h2>
                  <p className="mt-3 text-base text-zinc-600">{persona.description}</p>
                  {narrative?.summary ? (
                    <p className="mt-3 text-sm font-medium text-zinc-800">{narrative.summary}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  >
                    My Vibed profile
                  </Link>
                </div>
              </div>
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

              <div className="mt-5 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur">
                <details>
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    How we got this
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-zinc-700">
                    <p>
                      This report is inferred from Git/PR metadata (commit timing, commit size,
                      file paths, and message patterns). We do not use your prompts, IDE workflow,
                      PR comments, or code content—so this is an informed guess based on what lands
                      in Git.
                    </p>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                        Matched criteria
                      </p>
                      {matchedCriteria.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {matchedCriteria.map((c) => (
                            <span
                              key={c}
                              className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-mono text-zinc-700"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-600">
                          This report didn’t include explicit matched criteria.
                        </p>
                      )}
                    </div>
                    <div>
                      <Link
                        href="/methodology"
                        className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-700 underline decoration-zinc-400 underline-offset-4"
                      >
                        Methodology
                      </Link>
                    </div>
                  </div>
                </details>
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-5">
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
                  <p className="mt-4 text-sm text-zinc-600">No narrative is available for this vibed repo yet.</p>
                )}
              </div>

              {profileContribution ? (
                <div className="mt-6 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    {profileContributionLabel}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">This repo</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {profileContribution.repoName ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {typeof profileContribution.jobCommitCount === "number"
                          ? `${profileContribution.jobCommitCount} commits`
                          : "Commit count unavailable"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Your Vibed profile</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {typeof profileContribution.profileTotalRepos === "number"
                          ? `${profileContribution.profileTotalRepos} repos`
                          : "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {typeof profileContribution.profileTotalCommits === "number"
                          ? `${profileContribution.profileTotalCommits} commits`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Current persona</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {profileContribution.profilePersonaName ?? "—"}
                      </p>
                      {profileContribution.profileUpdatedAt ? (
                        <p className="mt-1 text-xs text-zinc-600">
                          Updated {fmtDate(profileContribution.profileUpdatedAt)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-600">—</p>
                      )}
                    </div>
                  </div>
                  {profileContribution.includedInProfile === false ? (
                    <p className="mt-3 text-xs text-zinc-500">
                      The profile aggregate can lag behind analysis completion by a moment.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <details className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
              Share, timeline, and details
            </summary>
            <div className="mt-5 space-y-6">
              {shareTemplate ? (
                <div
                  className="rounded-3xl border border-black/5 p-6 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${shareTemplate.colors.primary}, ${shareTemplate.colors.accent})`,
                  }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                        Share
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold text-white">{shareTemplate.headline}</h3>
                      <p className="mt-2 text-sm text-white/80">{shareTemplate.subhead}</p>
                      <div className="mt-4 flex flex-wrap gap-4">
                        {shareTemplate.metrics.map((metric) => (
                          <div key={metric.label}>
                            <p className="text-xs uppercase tracking-wider text-white/70">{metric.label}</p>
                            <p className="text-lg font-semibold text-white">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                      {shareDownloadError ? (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                          Download failed
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <select
                        className="h-9 rounded-full border border-white/60 bg-white/10 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-white"
                        value={shareFormat}
                        onChange={(e) => setShareFormat(e.target.value as ShareFormat)}
                      >
                        {Object.entries(SHARE_FORMATS).map(([key, f]) => (
                          <option key={key} value={key} className="text-zinc-900">
                            {f.label}
                          </option>
                        ))}
                      </select>
                      {supportsNativeShare ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                          onClick={handleNativeShare}
                          disabled={!shareUrl}
                        >
                          Share
                        </button>
                      ) : null}
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
                        onClick={handleCopyLink}
                        disabled={!shareUrl}
                      >
                        {copiedLink ? "Copied" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                        onClick={() => handleDownloadSharePng(shareFormat)}
                        disabled={downloadingShare}
                      >
                        {downloadingShare ? "PNG…" : "PNG"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                        onClick={() => handleDownloadShareSvg(shareFormat)}
                      >
                        SVG
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                      onClick={handleShareTwitter}
                      disabled={!shareUrl}
                    >
                      Twitter / X
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                      onClick={handleShareFacebook}
                      disabled={!shareUrl}
                    >
                      Facebook
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                      onClick={handleShareLinkedIn}
                      disabled={!shareUrl}
                    >
                      LinkedIn
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                      onClick={handleShareReddit}
                      disabled={!shareUrl}
                    >
                      Reddit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                      onClick={handleShareWhatsApp}
                      disabled={!shareUrl}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              ) : null}

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
                        {h.metric ?? "Metric"}
                      </p>
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
