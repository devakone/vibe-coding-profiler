import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";
import { getPersonaAura } from "@/lib/persona-auras";

// Sentry import moved to lazy load to avoid issues
const getSentry = async () => {
  try {
    return await import("@sentry/nextjs");
  } catch {
    return null;
  }
};

// Node.js runtime: edge can't reliably fetch self-origin images for aura backgrounds
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string; userId: string }> }
) {
  try {
    const { format, userId } = await params;
    const jobId = new URL(request.url).searchParams.get("jobId");

    if (!["og", "square", "story"].includes(format)) {
      return new Response("Invalid format", { status: 400 });
    }

    // Font fetching inside try/catch with fallback
    // Use unpkg as it is generally reliable for package files
    const fontNormalPromise = fetch(
      new URL("https://unpkg.com/@fontsource/space-grotesk@5.0.13/files/space-grotesk-latin-400-normal.woff")
    ).then((res) => {
      if (!res.ok) {
        console.error(`Font fetch failed (Normal): ${res.statusText}`);
        return null; // Return null (ImageResponse handles this or we filter it)
      }
      return res.arrayBuffer();
    }).catch(e => {
        console.error("Font fetch error (Normal):", e);
        return null;
    });

    const fontBoldPromise = fetch(
      new URL("https://unpkg.com/@fontsource/space-grotesk@5.0.13/files/space-grotesk-latin-700-normal.woff")
    ).then((res) => {
      if (!res.ok) {
        console.error(`Font fetch failed (Bold): ${res.statusText}`);
        return null;
      }
      return res.arrayBuffer();
    }).catch(e => {
        console.error("Font fetch error (Bold):", e);
        return null;
    });

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Missing Supabase credentials");
    }

    if (!isServiceRoleKey) {
      console.warn("Using ANON key for share image generation. Private profiles will NOT be accessible due to RLS.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch data: job-specific or unified profile
    let profile: {
      persona_id: string;
      persona_name: string | null;
      persona_tagline: string | null;
      persona_confidence: string | null;
      total_repos: number | null;
      total_commits: number | null;
      axes_json: Record<string, { score: number }> | null;
      narrative_json: { insight?: string; summary?: string } | null;
    } | null = null;

    if (jobId) {
      // Job-specific share: fetch from vibe_insights + analysis_jobs
      const [vibeResult, jobResult, insightsResult] = await Promise.all([
        supabase
          .from("vibe_insights")
          .select("persona_id, persona_name, persona_tagline, persona_confidence, axes_json")
          .eq("job_id", jobId)
          .maybeSingle(),
        supabase
          .from("analysis_jobs")
          .select("commit_count")
          .eq("id", jobId)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("analysis_insights")
          .select("persona_label, persona_confidence, persona_id, narrative_json")
          .eq("job_id", jobId)
          .maybeSingle(),
      ]);

      const vibe = vibeResult.data;
      const job = jobResult.data;
      const insights = insightsResult.data;

      if (vibe || insights) {
        profile = {
          persona_id: vibe?.persona_id ?? insights?.persona_id ?? "balanced_builder",
          persona_name: vibe?.persona_name ?? insights?.persona_label ?? null,
          persona_tagline: vibe?.persona_tagline ?? null,
          persona_confidence: vibe?.persona_confidence ?? insights?.persona_confidence ?? null,
          total_repos: 1,
          total_commits: job?.commit_count ?? null,
          axes_json: vibe?.axes_json ?? null,
          narrative_json: insights?.narrative_json ?? null,
        };
      }
    } else {
      // Unified profile share
      const { data, error } = await supabase
        .from("user_profiles")
        .select("persona_id, persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, narrative_json")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Profile fetch failed: ${error.message}`);
      }
      profile = data;
    }

    if (!profile) {
      console.error(`Profile not found for userId: ${userId}${jobId ? `, jobId: ${jobId}` : ""}`);
      return new Response("Profile not found", { status: 404 });
    }

    // Prepare Data
    const totalRepos = profile.total_repos || 0;
    const totalCommits = profile.total_commits || 0;
    const personaName = profile.persona_name || "Unknown Vibe";
    const personaTagline = profile.persona_tagline || "Coding with vibes";
    const personaConfidence = profile.persona_confidence || "High";
    const aura = getPersonaAura(profile.persona_id);

    // Persona-based gradient colors (matches STORY_THEMES in story route)
    const PERSONA_COLORS: Record<string, { primary: string; accent: string }> = {
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
    };
    const DEFAULT_COLORS = { primary: "#7c3aed", accent: "#6366f1" };
    const colors = PERSONA_COLORS[profile.persona_id] ?? DEFAULT_COLORS;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8108";
    const displayUrl = new URL(baseUrl).host;

    const bgUrl = new URL(format === "story" ? aura.verticalBackground : aura.background, baseUrl).toString();
    const iconUrl = new URL(aura.icon, baseUrl).toString();
    
    // Dimensions (2x for Retina quality)
    const scale = 2;
    const width = (format === "story" ? 1080 : format === "square" ? 1080 : 1200) * scale;
    const height = (format === "story" ? 1920 : format === "square" ? 1080 : 630) * scale;

    // -------------------------------------------------------------------------
    // Metric Computation
    // -------------------------------------------------------------------------
    const axes = profile.axes_json as Record<string, { score: number }> | null;
    const narrative = profile.narrative_json as { insight?: string; summary?: string } | null;
    
    let metrics = {
      strongest: "N/A",
      style: "Balanced",
      rhythm: "Mixed",
      peak: "All Hours"
    };

    if (axes) {
      // 1. Strongest
      let maxScore = -1;
      let maxKey = "";
      const AXIS_NAMES: Record<string, string> = {
        automation_heaviness: "Automation",
        guardrail_strength: "Guardrails",
        iteration_loop_intensity: "Iteration",
        planning_signal: "Planning",
        surface_area_per_change: "Surface Area",
        shipping_rhythm: "Rhythm",
      };
      const AXIS_HIGH_LABELS: Record<string, string> = {
        automation_heaviness: "AI-Heavy",
        guardrail_strength: "Rigorous",
        iteration_loop_intensity: "Rapid",
        planning_signal: "Structured",
        surface_area_per_change: "Wide",
        shipping_rhythm: "Bursty",
      };
      for (const [key, val] of Object.entries(axes)) {
        const axis = val as { score: number };
        if (axis.score > maxScore && AXIS_NAMES[key]) {
          maxScore = axis.score;
          maxKey = key;
        }
      }
      const strongest = maxKey ? `${AXIS_HIGH_LABELS[maxKey]} ${AXIS_NAMES[maxKey]}` : "N/A";

      // 2. Style
      let style = "Mixed"; // Default
      const A = (axes.automation_heaviness?.score || 0);
      const B = (axes.guardrail_strength?.score || 0);
      const C = (axes.iteration_loop_intensity?.score || 0);
      const D = (axes.planning_signal?.score || 0);
      const E = (axes.surface_area_per_change?.score || 0);
      const F = (axes.shipping_rhythm?.score || 0);

      if (A >= 70 && C >= 65) style = "Fast Builder";
      else if (B >= 70 && A >= 50) style = "Safe Shipper";
      else if (F >= 70 && C >= 60) style = "Rapid Cycler";
      else if (B >= 65 && C < 40) style = "Steady Hand";
      else if (A >= 60 && B < 40) style = "Bold Mover";
      else if (D >= 70) style = "Deep Planner";
      else if (E >= 70) style = "Wide Scoper";
      else style = "Balanced";

      // 3. Rhythm
      let rhythm = "Mixed";
      const rScore = axes.shipping_rhythm?.score || 0;
      if (rScore >= 65) rhythm = "Bursty";
      else if (rScore < 35) rhythm = "Steady";

      metrics = { ...metrics, strongest, style, rhythm };
    }

    // Insight Text
    let insightText = "Your aggregated profile balances these styles across your repositories.";
    if (narrative) {
       if (narrative.insight) insightText = narrative.insight;
       else if (narrative.summary) insightText = narrative.summary;
    }

    // Resolve fonts
    const [fontDataNormal, fontDataBold] = await Promise.all([fontNormalPromise, fontBoldPromise]);

    const fonts: Array<{ name: string; data: ArrayBuffer; style: "normal" | "italic"; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 }> = [];
    if (fontDataNormal) fonts.push({ name: "Space Grotesk", data: fontDataNormal, style: "normal" as const, weight: 400 as const });
    if (fontDataBold) fonts.push({ name: "Space Grotesk", data: fontDataBold, style: "normal" as const, weight: 700 as const });

    const paddingX = 60 * scale;
    const paddingY = 60 * scale;

    // Debug logging for production
    console.log("Share image generation starting", {
      format,
      userId,
      personaId: profile.persona_id,
      personaName,
      hasAxes: !!axes,
      hasFonts: fonts.length,
      bgUrl,
      iconUrl,
      dimensions: { width, height },
    });

    try {
      return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: `linear-gradient(180deg, ${colors.primary}, ${colors.accent})`,
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 24 * scale,
            overflow: "hidden",
          }}
        >
          {/* Aura background overlay */}
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img
            src={bgUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
          {/* Readability overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          />

          {/* Content Container */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              padding: `${paddingY}px ${paddingX}px`, 
            }}
          >
            {/* Header Area */}
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 18 * scale,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 12 * scale, 
                }}
              >
                My Unified VCP
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 64 * scale,
                  fontWeight: 700,
                  color: "white",
                  marginBottom: 8 * scale, 
                  lineHeight: 1,
                  textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  maxWidth: "90%",
                }}
              >
                {personaName}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28 * scale,
                  color: "rgba(255,255,255,0.9)",
                  marginBottom: 12 * scale, 
                  fontWeight: 400,
                  maxWidth: "90%",
                }}
              >
                {personaTagline}
              </div>
              {personaConfidence && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 20 * scale,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {personaConfidence} confidence
                </div>
              )}
            </div>

            {/* Icon (Top Right) */}
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- OG image generation uses satori which requires <img> */}
            <img
              src={iconUrl}
              width={140 * scale}
              height={140 * scale}
              style={{
                position: "absolute",
                top: paddingY,
                right: paddingX,
                borderRadius: 70 * scale,
                border: `${4 * scale}px solid rgba(255,255,255,0.2)`,
                boxShadow: `0 ${8 * scale}px ${30 * scale}px rgba(0,0,0,0.3)`,
                objectFit: "cover",
              }}
            />

            {/* Insight Box */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%", 
                marginTop: "auto", // Push to bottom for Story, or natural flow
                marginBottom: 20 * scale,
                padding: 24 * scale, 
                backgroundColor: "rgba(255,255,255,0.1)",
                border: `${1 * scale}px solid rgba(255,255,255,0.2)`,
                borderRadius: 24 * scale,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22 * scale,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.3, 
                  fontWeight: 400,
                  maxHeight: 100 * scale, 
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {insightText}
              </div>
            </div>

            {/* Grid Area */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 20 * scale,
                width: "100%",
                marginBottom: 20 * scale,
              }}
            >
              {[
                { label: "Strongest", value: metrics.strongest },
                { label: "Style", value: metrics.style },
                { label: "Rhythm", value: metrics.rhythm },
                { label: "Peak", value: metrics.peak },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "48%", // Responsive 2-column grid
                    flexGrow: 1,
                    height: 120 * scale, 
                    padding: 20 * scale, 
                    backgroundColor: "rgba(255,255,255,0.1)",
                    border: `${1 * scale}px solid rgba(255,255,255,0.2)`,
                    borderRadius: 20 * scale,
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14 * scale,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 6 * scale,
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ display: "flex", fontSize: 32 * scale, fontWeight: 700, color: "white" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                maxWidth: "100%",
                borderTop: `${1 * scale}px solid rgba(255,255,255,0.15)`,
                paddingTop: 16 * scale,
                marginTop: 0,
                marginBottom: 0, 
              }}
            >
              <div style={{ display: "flex", fontSize: 20 * scale, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
                {displayUrl}
              </div>
              <div style={{ display: "flex", fontSize: 20 * scale, color: "rgba(255,255,255,0.6)" }}>
                {totalRepos} repos • {totalCommits.toLocaleString()} commits
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: fonts.length > 0 ? fonts : undefined,
      }
    );
    } catch (imageError: unknown) {
      console.error("ImageResponse generation failed:", imageError);
      const Sentry = await getSentry();
      if (Sentry) {
        Sentry.captureException(imageError, {
          tags: { api: "share-image", stage: "image-response" },
          extra: {
            url: request.url,
            format,
            userId,
            personaId: profile.persona_id,
            bgUrl,
            iconUrl,
          },
        });
      }
      const message = imageError instanceof Error ? imageError.message : "Image generation failed";
      return new Response(`ImageResponse Error: ${message}`, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("Share image generation error:", e);
    const Sentry = await getSentry();
    if (Sentry) {
      Sentry.captureException(e, {
        tags: { api: "share-image", stage: "outer" },
        extra: { url: request.url },
      });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(`Server Error: ${message}`, { status: 500 });
  }
}
