import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PlatformType } from "@vibed/core";

const ALLOWED_PLATFORMS: PlatformType[] = ["github", "gitlab", "bitbucket"];

function sanitizePlatform(value?: string): PlatformType {
  if (typeof value === "string" && ALLOWED_PLATFORMS.includes(value as PlatformType)) {
    return value as PlatformType;
  }
  return "github";
}

function validateOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const requestOrigin = requestUrl.origin;

  if (originHeader && originHeader !== requestOrigin) {
    throw new Error("forbidden");
  }

  if (!originHeader && refererHeader) {
    const refererOrigin = new URL(refererHeader).origin;
    if (refererOrigin !== requestOrigin) {
      throw new Error("forbidden");
    }
  }
}

export const runtime = "nodejs";

type ConnectBody = {
  platform?: string;
  platform_repo_id: string;
  owner: string;
  name: string;
  full_name: string;
  is_private: boolean;
  default_branch: string;
  platform_owner?: string;
  platform_project_id?: string;
};

export async function POST(request: Request) {
  try {
    validateOrigin(request);

    const body = (await request.json().catch(() => ({}))) as ConnectBody;
    if (!body?.platform_repo_id || !body?.full_name) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const platform = sanitizePlatform(body.platform);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit({
      userId: user.id,
      action: `repo_connect_${platform}`,
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
          platform_repo_id: body.platform_repo_id,
          platform,
          owner: body.owner,
          name: body.name,
          full_name: body.full_name,
          is_private: body.is_private,
          default_branch: body.default_branch,
          platform_owner: body.platform_owner ?? body.owner,
          platform_project_id: body.platform_project_id ?? null,
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
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "repo_connect_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
