import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

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

  // Rate limiting (bypassed for localhost and admins)
  const rateLimit = await checkRateLimit({
    userId: user.id,
    action: "repo_disconnect",
    windowSeconds: 60,
    maxCount: 40,
  });

  if (!rateLimit.allowed) {
    if (rateLimit.reason === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  const service = createSupabaseServiceClient();
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

