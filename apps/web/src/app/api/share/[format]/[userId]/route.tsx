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
      .select("*")
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
    const bgUrl = new URL(format === "story" ? aura.verticalBackground : aura.background, baseUrl).toString();
    const iconUrl = new URL(aura.icon, baseUrl).toString();
    
    const width = format === "story" ? 1080 : format === "square" ? 1080 : 1200;
    const height = format === "story" ? 1920 : format === "square" ? 1080 : 630;

    // Resolve fonts
    const [fontDataNormal, fontDataBold] = await Promise.all([fontNormalPromise, fontBoldPromise]);

    const fonts: any[] = [];
    if (fontDataNormal) fonts.push({ name: "Space Grotesk", data: fontDataNormal, style: "normal", weight: 400 });
    if (fontDataBold) fonts.push({ name: "Space Grotesk", data: fontDataBold, style: "normal", weight: 700 });

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
              padding: format === "story" ? "120px 80px" : "80px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: format === "story" ? 32 : 24,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 20,
                }}
              >
                My Unified VCP
              </div>
              <div
                style={{
                  fontSize: format === "story" ? 80 : 64,
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.1,
                  marginBottom: 20,
                }}
              >
                {personaName}
              </div>
              <div
                style={{
                  fontSize: format === "story" ? 40 : 32,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.4,
                  marginBottom: 30,
                }}
              >
                {personaTagline}
              </div>
              {personaConfidence && (
                <div
                  style={{
                    fontSize: format === "story" ? 32 : 24,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {personaConfidence} confidence
                </div>
              )}
            </div>

            {/* Icon */}
            <img
              src={iconUrl}
              width={160}
              height={160}
              style={{
                position: "absolute",
                top: format === "story" ? 120 : 80,
                right: format === "story" ? 80 : 80,
                borderRadius: 80,
                border: "4px solid rgba(255,255,255,0.3)",
                objectFit: "cover",
              }}
            />

            {/* Metrics */}
            <div
              style={{
                display: "flex",
                flexDirection: "row", // Explicit flex-direction
                gap: 40,
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Repositories
                </div>
                <div style={{ fontSize: 56, fontWeight: 700, color: "white" }}>
                  {totalRepos}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Commits
                </div>
                <div style={{ fontSize: 56, fontWeight: 700, color: "white" }}>
                  {totalCommits.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                flexDirection: "row", // Explicit flex-direction
                justifyContent: "space-between",
                borderTop: "2px solid rgba(255,255,255,0.2)",
                paddingTop: 40,
                marginTop: 60,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                vibed.dev
              </div>
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>
                #VCP
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
