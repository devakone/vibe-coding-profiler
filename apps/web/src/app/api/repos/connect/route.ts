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

  const body = (await request.json()) as {
    github_id: number;
    owner: string;
    name: string;
    full_name: string;
    is_private: boolean;
    default_branch: string;
  };

  if (!body?.github_id || !body?.full_name) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Rate limiting (bypassed for localhost and admins)
  const rateLimit = await checkRateLimit({
    userId: user.id,
    action: "repo_connect",
    windowSeconds: 60,
    maxCount: 20,
  });

  if (!rateLimit.allowed) {
    if (rateLimit.reason === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  const service = createSupabaseServiceClient();
  const { data: repoRow, error: repoError } = await service
    .from("repos")
    .upsert(
      {
        platform_repo_id: String(body.github_id),
        platform: "github",
        owner: body.owner,
        name: body.name,
        full_name: body.full_name,
        is_private: body.is_private,
        default_branch: body.default_branch,
      },
      { onConflict: "platform, platform_repo_id" }
    )
    .select("id")
    .single();

  if (repoError || !repoRow) {
    return NextResponse.json({ error: "repo_upsert_failed" }, { status: 500 });
  }

  const { error: connectError } = await service.from("user_repos").upsert(
    {
      user_id: user.id,
      repo_id: repoRow.id,
      disconnected_at: null,
      settings_json: {},
    },
    { onConflict: "user_id,repo_id" }
  );

  if (connectError) {
    return NextResponse.json({ error: "connect_failed" }, { status: 500 });
  }

  return NextResponse.json({ repo_id: repoRow.id });
}
