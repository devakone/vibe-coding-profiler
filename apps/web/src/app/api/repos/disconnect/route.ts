import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  const body = (await request.json()) as { repo_id: string };
  if (!body?.repo_id) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  const { data: allowedData, error: rateLimitError } = await (
    service as unknown as RateLimitRpcLike
  ).rpc("consume_user_action_rate_limit", {
    p_user_id: user.id,
    p_action: "repo_disconnect",
    p_window_seconds: 60,
    p_max_count: 40,
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

  const { error: disconnectError } = await service
    .from("user_repos")
    .update({ disconnected_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("repo_id", body.repo_id);

  if (disconnectError) {
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

