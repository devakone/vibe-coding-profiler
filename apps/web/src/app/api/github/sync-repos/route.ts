import { NextResponse } from "next/server";
import { fetchGithubRepos } from "@/lib/github";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getGithubAccessToken } from "@/lib/githubToken";

export const runtime = "nodejs";

type RateLimitRpcLike = {
  rpc: (
    fn: string,
    args: {
      p_user_id: string;
      p_action: string;
      p_window_seconds: number;
      p_max_count: number;
    }
  ) => Promise<{ data: unknown; error: unknown }>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const requestUrl = new URL(request.url);
    const requestOrigin = requestUrl.origin;
    const originHeader = request.headers.get("origin");
    const refererHeader = request.headers.get("referer");

    if (originHeader && originHeader !== requestOrigin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!originHeader && refererHeader) {
      const refererOrigin = new URL(refererHeader).origin;
      if (refererOrigin !== requestOrigin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const service = createSupabaseServiceClient();
    const { data: allowedData, error: rateLimitError } = await (
      service as unknown as RateLimitRpcLike
    ).rpc("consume_user_action_rate_limit", {
      p_user_id: user.id,
      p_action: "github_sync_repos",
      p_window_seconds: 60,
      p_max_count: 15,
    });

    if (rateLimitError) {
      return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
    }

    if (allowedData !== true && allowedData !== false) {
      return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
    }

    if (allowedData === false) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const token = await getGithubAccessToken(supabase, user.id);
    const repos = await fetchGithubRepos(token);

    return NextResponse.json({ repos });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";

    if (message === "GitHub account not connected") {
      return NextResponse.json({ error: "github_not_connected" }, { status: 400 });
    }

    if (message === "Missing GITHUB_TOKEN_ENCRYPTION_KEY") {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
