import { ImageResponse } from "@vercel/og";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeShareCardMetrics } from "@/lib/vcp/metrics";
import { isVibeAxes } from "@/lib/vcp/validators";
import { AXIS_METADATA } from "@/components/vcp/constants";
import { getPersonaAura } from "@/lib/persona-auras";
import type { ShareCardColors, ShareCardMetric } from "@/components/share/types";
import type { InsightCard, VibeAxes } from "@vibe-coding-profiler/core";
import { NextRequest, NextResponse } from "next/server";

// Node.js runtime required: qrcode package uses Node APIs incompatible with edge
export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientInstance = any;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * Unified violet-indigo color palette for story themes
 * Matches the PERSONA_COLORS in ProfileShareSection.tsx
 */
const STORY_THEMES: Record<string, ShareCardColors> = {
  // Dynamic/fast personas - brighter violet
  prompt_sprinter: { primary: "#7c3aed", accent: "#6366f1" }, // violet-600 → indigo-500
  rapid_risk_taker: { primary: "#8b5cf6", accent: "#6366f1" }, // violet-500 → indigo-500
  fix_loop_hacker: { primary: "#7c3aed", accent: "#818cf8" }, // violet-600 → indigo-400
  
  // Balanced/thoughtful personas - deeper tones
  guardrailed_viber: { primary: "#6366f1", accent: "#7c3aed" }, // indigo-500 → violet-600
  spec_first_director: { primary: "#4f46e5", accent: "#7c3aed" }, // indigo-600 → violet-600
  balanced_builder: { primary: "#6366f1", accent: "#8b5cf6" }, // indigo-500 → violet-500
  reflective_balancer: { primary: "#6366f1", accent: "#8b5cf6" }, // indigo-500 → violet-500
  methodical_architect: { primary: "#4f46e5", accent: "#7c3aed" }, // indigo-600 → violet-600
  
  // Technical/structured personas - cooler indigo
  vertical_slice_shipper: { primary: "#6366f1", accent: "#818cf8" }, // indigo-500 → indigo-400
  toolsmith_viber: { primary: "#4f46e5", accent: "#6366f1" }, // indigo-600 → indigo-500
  infra_weaver: { primary: "#4338ca", accent: "#6366f1" }, // indigo-700 → indigo-500
  
  // Legacy persona IDs
  "vibe-prototyper": { primary: "#7c3aed", accent: "#6366f1" },
  "test-validator": { primary: "#6366f1", accent: "#7c3aed" },
  "spec-architect": { primary: "#4f46e5", accent: "#7c3aed" },
  "agent-orchestrator": { primary: "#6366f1", accent: "#818cf8" },
  "reflective-balancer": { primary: "#6366f1", accent: "#8b5cf6" },
};

// Default uses the primary brand gradient (violet → indigo)
const DEFAULT_THEME: ShareCardColors = { primary: "#7c3aed", accent: "#6366f1" };

interface StoryData {
  headline: string;
  subhead: string;
  personaName: string;
  personaTagline: string;
  personaId: string;
  personaConfidence: string;
  metrics: ShareCardMetric[];
  highlight?: string;
  topAxes: string[];
  stats: string[];
  colors: ShareCardColors;
  url: string;
  /** Full URL to aura background image */
  auraBackgroundUrl: string;
  /** Full URL to aura icon image */
  auraIconUrl: string;
}

const parseCardsHighlight = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) return undefined;
  const first = value[0] as InsightCard | undefined;
  if (!first) return undefined;
  if (typeof first.subtitle === "string" && first.subtitle.trim().length > 0) {
    return first.subtitle;
  }
  if (typeof first.title === "string" && typeof first.value === "string") {
    return `${first.title}: ${first.value}`;
  }
  return undefined;
};

const formatAxesList = (axes: VibeAxes): string[] => {
  const entries = Object.entries(axes) as [keyof VibeAxes, { score: number }][];
  return entries
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 4)
    .map(([key, value]) => `${AXIS_METADATA[key].shortName}: ${Math.round(value.score)}`);
};

const buildMetricsFromAxes = (axes: VibeAxes): ShareCardMetric[] => {
  const computed = computeShareCardMetrics(axes);
  return [
    { label: "Strongest", value: computed.strongest },
    { label: "Style", value: computed.style },
    { label: "Rhythm", value: computed.rhythm },
    { label: "Peak", value: computed.peak },
  ];
};

interface UserProfileRow {
  axes_json?: unknown;
  cards_json?: unknown;
  persona_id?: string;
  persona_name?: string | null;
  persona_tagline?: string | null;
  persona_confidence?: string | null;
  total_commits?: number | null;
  total_repos?: number | null;
}

async function buildProfileStory(
  supabase: SupabaseClientInstance,
  userId: string,
  appUrl: string
): Promise<StoryData | null> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "persona_id, persona_name, persona_tagline, persona_confidence, axes_json, cards_json, total_commits, total_repos"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const profileRow = (profile ?? null) as UserProfileRow | null;
  if (!profileRow) return null;

  const personaId = profileRow.persona_id ?? "balanced_builder";
  const axes = isVibeAxes(profileRow.axes_json) ? profileRow.axes_json : null;
  const metrics = axes ? buildMetricsFromAxes(axes) : [];
  const highlight = parseCardsHighlight(profileRow.cards_json);
  const colors = STORY_THEMES[personaId] ?? DEFAULT_THEME;
  const aura = getPersonaAura(personaId);
  const subhead =
    profileRow.persona_tagline?.trim().length
      ? profileRow.persona_tagline
      : `${profileRow.persona_confidence ?? "medium"} confidence`;
  const stats = [
    `${profileRow.total_commits?.toLocaleString() ?? "0"} commits`,
    `${profileRow.total_repos ?? 0} repos included`,
  ];
  const topAxes = axes ? formatAxesList(axes) : [];

  return {
    headline: "My Vibed Profile",
    subhead,
    personaName: profileRow.persona_name ?? "Vibe Coder",
    personaTagline: subhead,
    personaId,
    personaConfidence: profileRow.persona_confidence ?? "medium",
    metrics: metrics.length ? metrics : stats.slice(0, 4).map((value, idx) => ({ label: ["Commits", "Repos", "Profile", "Vibes"][idx] ?? `Stat ${idx + 1}`, value })),
    highlight,
    topAxes,
    stats,
    colors,
    url: `${appUrl}/profile`,
    auraBackgroundUrl: `${appUrl}${aura.verticalBackground}`,
    auraIconUrl: `${appUrl}${aura.icon}`,
  };
}

async function buildJobStory(
  supabase: SupabaseClientInstance,
  userId: string,
  jobId: string,
  appUrl: string
): Promise<StoryData | null> {
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("repo_id, commit_count")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!job || typeof job !== "object") return null;

  const [repoResult, insightsResult, vibeResult] = await Promise.all([
    supabase.from("repos").select("full_name").eq("id", job.repo_id).maybeSingle(),
    supabase
      .from("analysis_insights")
      .select("share_template, persona_label, persona_confidence, persona_id")
      .eq("job_id", jobId)
      .maybeSingle(),
    supabase
      .from("vibe_insights")
      .select("axes_json, persona_id, persona_name, persona_tagline, persona_confidence")
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  const repoName =
    repoResult &&
    typeof repoResult === "object" &&
    repoResult.data &&
    typeof repoResult.data.full_name === "string"
      ? repoResult.data.full_name
      : "Repo";

  const shareTemplate =
    insightsResult &&
    typeof insightsResult === "object" &&
    insightsResult.data &&
    typeof insightsResult.data.share_template === "object"
      ? (insightsResult.data.share_template as {
          colors?: { primary?: string; accent?: string };
          metrics?: Array<{ label: string; value: string }>;
          headline?: string;
          subhead?: string;
          tagline?: string;
        })
      : null;

  const vibeRow = vibeResult && typeof vibeResult === "object" ? vibeResult.data : null;
  const axes = vibeRow && isVibeAxes(vibeRow.axes_json ?? null) ? (vibeRow.axes_json as VibeAxes) : null;

  const personaName = vibeRow?.persona_name ?? insightsResult?.data?.persona_label ?? repoName;
  const personaId =
    (vibeRow?.persona_id ?? insightsResult?.data?.persona_id ?? "balanced_builder") as string;
  const personaTagline =
    vibeRow?.persona_tagline ??
    shareTemplate?.tagline ??
    shareTemplate?.headline ??
    `${insightsResult?.data?.persona_confidence ?? "medium"} confidence`;
  // Prefer unified STORY_THEMES over stored shareTemplate colors for consistency
  const colors = STORY_THEMES[personaId] ?? DEFAULT_THEME;
  const aura = getPersonaAura(personaId);

  const metrics =
    axes && !Number.isNaN(axes.shipping_rhythm.score)
      ? buildMetricsFromAxes(axes)
      : shareTemplate?.metrics?.map((metric) => ({
          label: metric.label,
          value: metric.value,
        })) ?? [];

  const highlight = shareTemplate?.tagline ?? shareTemplate?.subhead ?? shareTemplate?.headline;
  const topAxes = axes ? formatAxesList(axes) : [];
  const stats = [`${job.commit_count ?? 0} commits`, repoName];

  return {
    headline: `${repoName} VCP`,
    subhead: personaTagline,
    personaName,
    personaTagline,
    personaId,
    personaConfidence: insightsResult?.data?.persona_confidence ?? "medium",
    metrics: metrics.length ? metrics : [{ label: "Commits", value: `${job.commit_count ?? 0}` }],
    highlight,
    topAxes,
    stats,
    colors,
    url: `${appUrl}/analysis/${jobId}`,
    auraBackgroundUrl: `${appUrl}${aura.verticalBackground}`,
    auraIconUrl: `${appUrl}${aura.icon}`,
  };
}

const renderStoryImage = async (story: StoryData, qrDataUrl: string) => {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          borderRadius: 64,
          background: `linear-gradient(180deg, ${story.colors.primary}, ${story.colors.accent})`,
          display: "flex",
          flexDirection: "column",
          color: "#fff",
          fontFamily: "Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Aura background overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.auraBackgroundUrl}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            objectFit: "cover",
            opacity: 0.25,
          }}
        />
        {/* Readability overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            background: "rgba(0,0,0,0.15)",
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: 80,
            position: "relative",
          }}
        >
          {/* Header with title and aura icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <p
                style={{
                  textTransform: "uppercase",
                  fontSize: 16,
                  letterSpacing: "0.4em",
                  opacity: 0.8,
                  margin: 0,
                }}
              >
                My VCP
              </p>
              <h1
                style={{
                  marginTop: 12,
                  marginBottom: 6,
                  fontSize: 60,
                  lineHeight: 1,
                }}
              >
                {story.personaName}
              </h1>
            </div>
            {/* Aura icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
                borderRadius: 50,
                background: "rgba(255,255,255,0.15)",
                overflow: "hidden",
                flexShrink: 0,
                marginLeft: 20,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.auraIconUrl}
                alt=""
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                }}
              />
            </div>
          </div>

          {/* Subhead */}
          <p
            style={{
              margin: 0,
              marginTop: 8,
              fontSize: 24,
              opacity: 0.95,
            }}
          >
            {story.subhead}
          </p>

          {/* Metrics grid */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {story.metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "48%",
                  marginBottom: 18,
                  borderRadius: 28,
                  padding: "18px 20px",
                  background: "rgba(255,255,255,0.1)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {metric.label}
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Highlight (optional) */}
          {story.highlight ? (
            <div
              style={{
                display: "flex",
                marginTop: 32,
                padding: "20px 24px",
                borderRadius: 32,
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 20,
                  lineHeight: 1.4,
                }}
              >
                {story.highlight}
              </p>
            </div>
          ) : null}

          {/* Top axes badges (optional) */}
          {story.topAxes.length > 0 && (
            <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {story.topAxes.map((label) => (
                <span
                  key={label}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.18)",
                    fontSize: 14,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Footer with stats and QR code */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {story.stats.map((line) => (
                <p
                  key={line}
                  style={{
                    margin: "0 0 4px",
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {line}
                </p>
              ))}
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                {story.personaConfidence && story.personaConfidence}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 150,
                height: 150,
                borderRadius: 32,
                padding: 12,
                background: "rgba(255,255,255,0.15)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                width={126}
                height={126}
                alt="Scan for your Vibed profile"
                style={{
                  borderRadius: 24,
                  width: 126,
                  height: 126,
                  objectFit: "cover",
                }}
              />
            </div>
          </div>

          {/* Hashtag footer */}
          <p
            style={{
              marginTop: 24,
              fontSize: 16,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            #VCP
          </p>
        </div>
      </div>
    ),
    {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
    }
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vibe-coding-profiler.com";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { userId } = await params;
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId") ?? null;
  const storyData = jobId
    ? await buildJobStory(supabase, user.id, jobId, appUrl)
    : await buildProfileStory(supabase, user.id, appUrl);

  if (!storyData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const qrSvg = await QRCode.toString(storyData.url, { type: "svg", width: 260, margin: 0 });
  const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;
  return renderStoryImage(storyData, qrDataUrl);
}
