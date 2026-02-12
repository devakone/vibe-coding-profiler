import { ImageResponse } from "@vercel/og";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const test = url.searchParams.get("test") || "basic";

  try {
    if (test === "basic") {
      return new Response("Debug route works", { status: 200 });
    }

    if (test === "image") {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontSize: 48,
            }}
          >
            ImageResponse Works!
          </div>
        ),
        { width: 600, height: 400 }
      );
    }

    return new Response(`Unknown test: ${test}`, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Debug route error:", e);
    return new Response(`Error: ${message}`, { status: 500 });
  }
}
