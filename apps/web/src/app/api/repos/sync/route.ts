import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPlatformAccessToken } from "@/lib/platformToken";
import { createRepoLister, PlatformType, PlatformRepo } from "@vibed/core";

export const runtime = "nodejs";

type SyncRequestBody = {
  platform?: PlatformType;
  debug?: boolean;
};

type SyncResponse = {
  repos: PlatformRepo[];
  meta: {
    platform: PlatformType;
    repoCount: number;
  };
};

const ALLOWED_PLATFORMS: PlatformType[] = ["github", "gitlab", "bitbucket"];

function sanitizePlatform(value: unknown): PlatformType {
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

async function fetchReposForPlatform(platform: PlatformType, token: string): Promise<PlatformRepo[]> {
  const lister = createRepoLister(platform, token);
  const repos: PlatformRepo[] = [];
  for await (const repo of lister.listRepos()) {
    repos.push(repo);
  }
  return repos;
}

export async function POST(request: Request) {
  try {
    validateOrigin(request);

    const requestUrl = new URL(request.url);
    const rawBody = await request.json().catch(() => ({}));
    const requestedPlatform = sanitizePlatform(rawBody.platform ?? requestUrl.searchParams.get("platform"));

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit({
      userId: user.id,
      action: `repos_sync_${requestedPlatform}`,
      windowSeconds: 60,
      maxCount: 15,
    });

    if (!rateLimit.allowed) {
      if (rateLimit.reason === "rate_limited") {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
    }

    const token = await getPlatformAccessToken(supabase, user.id, requestedPlatform);
    const platformRepos = await fetchReposForPlatform(requestedPlatform, token);

    const serialized = platformRepos;

    const response: SyncResponse = {
      repos: serialized,
      meta: {
        platform: requestedPlatform,
        repoCount: serialized.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message.endsWith("account not connected")) {
        return NextResponse.json({ error: "platform_not_connected" }, { status: 400 });
      }
      if (error.message === "Missing GITHUB_TOKEN_ENCRYPTION_KEY") {
        return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
      }
    }
    const message = error instanceof Error ? error.message : "sync_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
