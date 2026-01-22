import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Default OG image for the Vibe Coding Profiler homepage and generic pages.
 * This image is used when no specific OG image is available.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: OG_WIDTH,
          height: OG_HEIGHT,
          background: "linear-gradient(135deg, #7c3aed, #6366f1)",
          display: "flex",
          flexDirection: "column",
          color: "#fff",
          fontFamily:
            "Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Gradient overlay for depth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_WIDTH,
            height: OG_HEIGHT,
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            padding: 60,
            position: "relative",
            textAlign: "center",
          }}
        >
          {/* Logo/Brand mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "rgba(255,255,255,0.15)",
              marginBottom: 32,
              fontSize: 40,
            }}
          >
            ⚡
          </div>

          {/* Title */}
          <h1
            style={{
              margin: 0,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Vibe Coding Profiler
          </h1>

          {/* Tagline */}
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 28,
              opacity: 0.9,
              maxWidth: 700,
            }}
          >
            Discover your AI coding style
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 40,
            }}
          >
            {["Commit Analysis", "Persona Insights", "Shareable Profiles"].map(
              (feature) => (
                <span
                  key={feature}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </span>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "0 60px 40px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 18,
              letterSpacing: "0.1em",
              opacity: 0.7,
            }}
          >
            vibe-coding-profiler.com
          </p>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    }
  );
}
