import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";
import { getPersonaAura } from "@/lib/persona-auras";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SCALE = 2;

/**
 * GET /api/og/u/[username]
 * Generates a 1200x630 OG image for a public profile.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Font loading
    const fontNormalPromise = fetch(
      new URL(
        "https://unpkg.com/@fontsource/space-grotesk@5.0.13/files/space-grotesk-latin-400-normal.woff"
      )
    )
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null);

    const fontBoldPromise = fetch(
      new URL(
        "https://unpkg.com/@fontsource/space-grotesk@5.0.13/files/space-grotesk-latin-700-normal.woff"
      )
    )
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null);

    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user by username
    const { data: user } = await supabase
      .from("users")
      .select("id, username, public_profile_settings")
      .eq("username", username.toLowerCase())
      .single();

    if (!user) {
      return new Response("Profile not found", { status: 404 });
    }

    const settings = user.public_profile_settings as Record<string, boolean> | null;
    if (!settings?.profile_enabled) {
      return new Response("Profile not public", { status: 404 });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "persona_id, persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, narrative_json"
      )
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response("Profile not found", { status: 404 });
    }

    const personaName = profile.persona_name || "Unknown Vibe";
    const personaTagline = profile.persona_tagline || "Coding with vibes";
    const personaConfidence = profile.persona_confidence || "High";
    const totalRepos = profile.total_repos || 0;
    const totalCommits = profile.total_commits || 0;
    const aura = getPersonaAura(profile.persona_id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8108";
    const displayUrl = `${new URL(baseUrl).host}/u/${user.username}`;
    const bgUrl = new URL(aura.background, baseUrl).toString();

    const [fontDataNormal, fontDataBold] = await Promise.all([
      fontNormalPromise,
      fontBoldPromise,
    ]);

    const fonts: Array<{ name: string; data: ArrayBuffer; style: string; weight: number }> = [];
    if (fontDataNormal)
      fonts.push({ name: "Space Grotesk", data: fontDataNormal, style: "normal", weight: 400 });
    if (fontDataBold)
      fonts.push({ name: "Space Grotesk", data: fontDataBold, style: "normal", weight: 700 });

    const width = OG_WIDTH * SCALE;
    const height = OG_HEIGHT * SCALE;
    const pad = 60 * SCALE;

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
            fontSize: 24 * SCALE,
          }}
        >
          {/* Overlay */}
          <div
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              padding: `${pad}px`,
            }}
          >
            {/* Top */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 16 * SCALE,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 12 * SCALE,
                }}
              >
                @{user.username}&apos;s VCP
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 56 * SCALE,
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1,
                  marginBottom: 8 * SCALE,
                  maxWidth: "90%",
                }}
              >
                {personaName}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 24 * SCALE,
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 400,
                  marginBottom: 12 * SCALE,
                  maxWidth: "85%",
                }}
              >
                {personaTagline}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 18 * SCALE,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {personaConfidence} confidence
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: `${1 * SCALE}px solid rgba(255,255,255,0.15)`,
                paddingTop: 16 * SCALE,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18 * SCALE,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {displayUrl}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 18 * SCALE,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {totalRepos} repos &bull; {totalCommits.toLocaleString()} commits
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: fonts.length > 0 ? (fonts as never) : undefined,
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("OG image error:", message);
    return new Response(`Server Error: ${message}`, { status: 500 });
  }
}
