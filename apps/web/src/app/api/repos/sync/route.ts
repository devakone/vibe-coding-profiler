import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformAccessToken } from "@/lib/platformToken";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRepoLister } from "@vibed/core";
import { PlatformType } from "@vibed/core";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const platform: PlatformType = body.platform || "github";

    // Rate limiting
    const rateLimit = await checkRateLimit({
      userId: user.id,
      action: "sync_repos",
      windowSeconds: 60,
      maxCount: 15,
    });

    if (!rateLimit.allowed) {
      if (rateLimit.reason === "rate_limited") {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
    }

    const token = await getPlatformAccessToken(supabase, user.id, platform);
    
    // Create lister and fetch repos
    const lister = createRepoLister(platform, token);
    const repos = [];
    
    for await (const repo of lister.listRepos()) {
      repos.push(repo);
    }

    return NextResponse.json({ repos });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";
    console.error("Sync failed:", e);

    if (message.includes("not connected")) {
      return NextResponse.json({ error: "platform_not_connected" }, { status: 400 });
    }

    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
