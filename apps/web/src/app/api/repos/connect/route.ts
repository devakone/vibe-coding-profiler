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

  const service = createSupabaseServiceClient();

  const { data: allowedData, error: rateLimitError } = await (
    service as unknown as RateLimitRpcLike
  ).rpc("consume_user_action_rate_limit", {
    p_user_id: user.id,
    p_action: "repo_connect",
    p_window_seconds: 60,
    p_max_count: 20,
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

  const { data: repoRow, error: repoError } = await service
    .from("repos")
    .upsert(
      {
        github_id: body.github_id,
        owner: body.owner,
        name: body.name,
        full_name: body.full_name,
        is_private: body.is_private,
        default_branch: body.default_branch,
      },
      { onConflict: "github_id" }
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
