import { ImageResponse } from "@vercel/og";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeShareCardMetrics } from "@/lib/vcp/metrics";
import { isVibeAxes } from "@/lib/vcp/validators";
import { getPersonaAura } from "@/lib/persona-auras";
import type { ShareCardColors, ShareCardMetric } from "@/components/share/types";
import type { VibeAxes } from "@vibed/core";
import { NextRequest } from "next/server";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Database row types for Supabase queries
type AnalysisJobRow = {
  repo_id: string;
  commit_count: number | null;
  status: string;
};

type RepoRow = {
  full_name: string;
};

type AnalysisInsightsRow = {
  share_template: unknown;
  persona_label: string | null;
  persona_confidence: string | null;
  persona_id: string | null;
};

type VibeInsightsRow = {
  axes_json: unknown;
  persona_id: string | null;
  persona_name: string | null;
  persona_tagline: string | null;
  persona_confidence: string | null;
};

/**
 * Unified violet-indigo color palette for OG images
 */
const OG_THEMES: Record<string, ShareCardColors> = {
  prompt_sprinter: { primary: "#7c3aed", accent: "#6366f1" },
  rapid_risk_taker: { primary: "#8b5cf6", accent: "#6366f1" },
  fix_loop_hacker: { primary: "#7c3aed", accent: "#818cf8" },
  guardrailed_viber: { primary: "#6366f1", accent: "#7c3aed" },
  spec_first_director: { primary: "#4f46e5", accent: "#7c3aed" },
  balanced_builder: { primary: "#6366f1", accent: "#8b5cf6" },
  reflective_balancer: { primary: "#6366f1", accent: "#8b5cf6" },
  methodical_architect: { primary: "#4f46e5", accent: "#7c3aed" },
  vertical_slice_shipper: { primary: "#6366f1", accent: "#818cf8" },
  toolsmith_viber: { primary: "#4f46e5", accent: "#6366f1" },
  infra_weaver: { primary: "#4338ca", accent: "#6366f1" },
  "vibe-prototyper": { primary: "#7c3aed", accent: "#6366f1" },
  "test-validator": { primary: "#6366f1", accent: "#7c3aed" },
  "spec-architect": { primary: "#4f46e5", accent: "#7c3aed" },
  "agent-orchestrator": { primary: "#6366f1", accent: "#818cf8" },
  "reflective-balancer": { primary: "#6366f1", accent: "#8b5cf6" },
};

const DEFAULT_THEME: ShareCardColors = { primary: "#7c3aed", accent: "#6366f1" };

interface OgData {
  personaName: string;
  personaTagline: string;
  personaId: string;
  metrics: ShareCardMetric[];
  repoName: string;
  commitCount: number;
  colors: ShareCardColors;
  auraIconUrl: string;
}

const buildMetricsFromAxes = (axes: VibeAxes): ShareCardMetric[] => {
  const computed = computeShareCardMetrics(axes);
  return [
    { label: "Strongest", value: computed.strongest },
    { label: "Style", value: computed.style },
    { label: "Rhythm", value: computed.rhythm },
    { label: "Peak", value: computed.peak },
  ];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vibed.app";
  const supabase = await createSupabaseServerClient();
  const { jobId } = await params;

  // Fetch job data (public - no auth required for OG images)
  const { data: jobData } = await supabase
    .from("analysis_jobs")
    .select("repo_id, commit_count, status")
    .eq("id", jobId)
    .maybeSingle();

  const job = jobData as AnalysisJobRow | null;

  if (!job || job.status !== "done") {
    // Return a default/fallback OG image for pending or not found jobs
    return new ImageResponse(
      (
        <div
          style={{
            width: OG_WIDTH,
            height: OG_HEIGHT,
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <h1 style={{ fontSize: 48, margin: 0 }}>Vibe Coding Profiler</h1>
          <p style={{ fontSize: 24, opacity: 0.9, marginTop: 16 }}>
            Discover your AI coding style
          </p>
        </div>
      ),
      { width: OG_WIDTH, height: OG_HEIGHT }
    );
  }

  // Fetch related data
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

  const repoRow = repoResult?.data as RepoRow | null;
  const insightsRow = insightsResult?.data as AnalysisInsightsRow | null;
  const vibeRow = vibeResult?.data as VibeInsightsRow | null;

  const repoName =
    repoRow && typeof repoRow.full_name === "string"
      ? repoRow.full_name
      : "Repository";

  const shareTemplate =
    insightsRow?.share_template &&
    typeof insightsRow.share_template === "object"
      ? (insightsRow.share_template as {
          colors?: { primary?: string; accent?: string };
          metrics?: Array<{ label: string; value: string }>;
          tagline?: string;
        })
      : null;

  const axes =
    vibeRow && isVibeAxes(vibeRow.axes_json ?? null)
      ? (vibeRow.axes_json as VibeAxes)
      : null;

  const personaName =
    vibeRow?.persona_name ?? insightsRow?.persona_label ?? "Vibe Coder";
  const personaId =
    (vibeRow?.persona_id ?? insightsRow?.persona_id ?? "balanced_builder") as string;
  const personaTagline =
    vibeRow?.persona_tagline ??
    shareTemplate?.tagline ??
    `${insightsRow?.persona_confidence ?? "medium"} confidence`;

  const colors = OG_THEMES[personaId] ?? DEFAULT_THEME;
  const aura = getPersonaAura(personaId);

  const metrics =
    axes && !Number.isNaN(axes.shipping_rhythm.score)
      ? buildMetricsFromAxes(axes)
      : shareTemplate?.metrics?.slice(0, 4).map((m) => ({
          label: m.label,
          value: m.value,
        })) ?? [];

  const ogData: OgData = {
    personaName,
    personaTagline,
    personaId,
    metrics,
    repoName,
    commitCount: job.commit_count ?? 0,
    colors,
    auraIconUrl: `${appUrl}${aura.icon}`,
  };

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: OG_WIDTH,
          height: OG_HEIGHT,
          background: `linear-gradient(135deg, ${ogData.colors.primary}, ${ogData.colors.accent})`,
          display: "flex",
          color: "#fff",
          fontFamily:
            "Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient overlay for depth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_WIDTH,
            height: OG_HEIGHT,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 60,
            flex: 1,
            position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p
              style={{
                textTransform: "uppercase",
                fontSize: 14,
                letterSpacing: "0.3em",
                opacity: 0.8,
                margin: 0,
              }}
            >
              Vibe Coding Profile
            </p>
            <h1
              style={{
                marginTop: 12,
                marginBottom: 8,
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {ogData.personaName}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                opacity: 0.9,
                maxWidth: 700,
              }}
            >
              {ogData.personaTagline}
            </p>
          </div>

          {/* Metrics row */}
          {ogData.metrics.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 24,
              }}
            >
              {ogData.metrics.slice(0, 4).map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px 20px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.12)",
                    minWidth: 140,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      opacity: 0.75,
                    }}
                  >
                    {metric.label}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {ogData.repoName}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  opacity: 0.8,
                }}
              >
                {ogData.commitCount.toLocaleString()} commits analyzed
              </p>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                letterSpacing: "0.1em",
                opacity: 0.7,
              }}
            >
              vibed.app
            </p>
          </div>
        </div>

        {/* Aura icon on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 280,
            background: "rgba(255,255,255,0.08)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogData.auraIconUrl}
            alt=""
            style={{
              width: 180,
              height: 180,
              objectFit: "contain",
              opacity: 0.9,
            }}
          />
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    }
  );
}
