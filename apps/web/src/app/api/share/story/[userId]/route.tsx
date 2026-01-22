import { ImageResponse } from "@vercel/og";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeShareCardMetrics } from "@/lib/vcp/metrics";
import { isVibeAxes } from "@/lib/vcp/validators";
import { AXIS_METADATA } from "@/components/vcp/constants";
import type { ShareCardColors, ShareCardMetric } from "@/components/share/types";
import type { InsightCard, VibeAxes } from "@vibed/core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientInstance = any;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

const STORY_THEMES: Record<string, ShareCardColors> = {
  prompt_sprinter: { primary: "#7c3aed", accent: "#a855f7" },
  guardrailed_viber: { primary: "#4338ca", accent: "#6366f1" },
  spec_first_director: { primary: "#312e81", accent: "#7c3aed" },
  vertical_slice_shipper: { primary: "#0f172a", accent: "#6366f1" },
  fix_loop_hacker: { primary: "#4c1d95", accent: "#c084fc" },
  rapid_risk_taker: { primary: "#a855f7", accent: "#ec4899" },
  balanced_builder: { primary: "#14b8a6", accent: "#0ea5e9" },
  toolsmith_viber: { primary: "#0f172a", accent: "#22d3ee" },
  infra_weaver: { primary: "#075985", accent: "#0ea5e9" },
};

const DEFAULT_THEME: ShareCardColors = { primary: "#4c1d95", accent: "#6366f1" };

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

  const axes = isVibeAxes(profileRow.axes_json) ? profileRow.axes_json : null;
  const metrics = axes ? buildMetricsFromAxes(axes) : [];
  const highlight = parseCardsHighlight(profileRow.cards_json);
  const colors = STORY_THEMES[profileRow.persona_id ?? ""] ?? DEFAULT_THEME;
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
    personaId: profileRow.persona_id ?? "balanced_builder",
    personaConfidence: profileRow.persona_confidence ?? "medium",
    metrics: metrics.length ? metrics : stats.slice(0, 4).map((value, idx) => ({ label: ["Commits", "Repos", "Profile", "Vibes"][idx] ?? `Stat ${idx + 1}`, value })),
    highlight,
    topAxes,
    stats,
    colors,
    url: `${appUrl}/profile`,
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
  const colors = shareTemplate?.colors
    ? {
        primary: shareTemplate.colors.primary ?? DEFAULT_THEME.primary,
        accent: shareTemplate.colors.accent ?? DEFAULT_THEME.accent,
      }
    : STORY_THEMES[personaId] ?? DEFAULT_THEME;

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
  };
}

const renderStoryImage = async (story: StoryData, qrDataUrl: string) => {
  return new ImageResponse(
    (
      <div
        style={{
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          padding: 80,
          borderRadius: 64,
          background: `linear-gradient(180deg, ${story.colors.primary}, ${story.colors.accent})`,
          display: "flex",
          flexDirection: "column",
          color: "#fff",
          fontFamily: "Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            textTransform: "uppercase",
            fontSize: 16,
            letterSpacing: "0.4em",
            opacity: 0.8,
            margin: 0,
          }}
        >
          Vibed Story
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
        <p
          style={{
            margin: 0,
            fontSize: 24,
            opacity: 0.95,
          }}
        >
          {story.subhead}
        </p>
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
        {story.highlight ? (
          <div
            style={{
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
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vibed.app";
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
