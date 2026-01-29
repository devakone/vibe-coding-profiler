import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";
import { getPersonaAura } from "@/lib/persona-auras";

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string; userId: string }> }
) {
  try {
    const { format, userId } = await params;
    
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

    // Fetch Profile
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("persona_id, persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, narrative_json")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Profile fetch failed: ${error.message}`);
    }
    
    if (!profile) {
      console.error(`Profile not found for userId: ${userId}`);
      return new Response("Profile not found - check if userId is correct or if RLS policies prevent access (Service Role Key required for private profiles)", { status: 404 });
    }

    // Prepare Data
    const totalRepos = profile.total_repos || 0;
    const totalCommits = profile.total_commits || 0;
    const personaName = profile.persona_name || "Unknown Vibe";
    const personaTagline = profile.persona_tagline || "Coding with vibes";
    const personaConfidence = profile.persona_confidence || "High";
    const aura = getPersonaAura(profile.persona_id);

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
    const axes = profile.axes_json as any;
    const narrative = profile.narrative_json as any;
    
    let metrics = {
      strongest: "N/A",
      style: "Balanced",
      rhythm: "Mixed",
      peak: "Varied"
    };

    if (axes) {
      // 1. Strongest
      let maxScore = -1;
      let maxName = "";
      const AXIS_NAMES: Record<string, string> = {
        automation_heaviness: "Automation",
        guardrail_strength: "Guardrails",
        iteration_loop_intensity: "Loops",
        planning_signal: "Planning",
        surface_area_per_change: "Scope",
        shipping_rhythm: "Rhythm",
      };
      for (const [key, val] of Object.entries(axes)) {
        const axis = val as { score: number };
        if (axis.score > maxScore && AXIS_NAMES[key]) {
          maxScore = axis.score;
          maxName = AXIS_NAMES[key];
        }
      }
      const strongest = maxName ? `${maxName} ${maxScore}` : "N/A";

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

    const fonts: any[] = [];
    if (fontDataNormal) fonts.push({ name: "Space Grotesk", data: fontDataNormal, style: "normal", weight: 400 });
    if (fontDataBold) fonts.push({ name: "Space Grotesk", data: fontDataBold, style: "normal", weight: 700 });

    const paddingX = 60 * scale;
    const paddingY = 60 * scale;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            backgroundColor: "#111",
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 24 * scale,
          }}
        >
          {/* Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
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
  } catch (e: any) {
    console.error("API Error detailed:", e);
    return new Response(`Server Error: ${e.message}\n${e.stack}`, { status: 500 });
  }
}
