import { NextResponse } from "next/server";
import { fetchGithubRepos } from "@/lib/github";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getGithubAccessToken } from "@/lib/githubToken";

export const runtime = "nodejs";

async function fetchGithubTokenScopes(token: string): Promise<string[]> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  const rawScopes = res.headers.get("x-oauth-scopes") ?? "";
  return rawScopes
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

async function fetchGithubOrgLogins(token: string): Promise<string[]> {
  const res = await fetch("https://api.github.com/user/orgs?per_page=100&page=1", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const orgs = (await res.json()) as unknown;
  if (!Array.isArray(orgs)) return [];

  return orgs
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).login : null))
    .filter((login): login is string => typeof login === "string" && login.length > 0);
}

type GithubOrgRepoDebug = {
  org: string;
  status: number;
  sso?: string | null;
  repoCount?: number | null;
  sampleFullNames?: string[];
};

async function fetchGithubOrgReposDebug(params: {
  token: string;
  org: string;
}): Promise<GithubOrgRepoDebug> {
  const res = await fetch(
    `https://api.github.com/orgs/${encodeURIComponent(params.org)}/repos?per_page=30&page=1&type=all&sort=updated`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${params.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    }
  );

  const sso = res.headers.get("x-github-sso");

  if (!res.ok) {
    return { org: params.org, status: res.status, sso };
  }

  const payload = (await res.json()) as unknown;
  if (!Array.isArray(payload)) {
    return { org: params.org, status: res.status, sso, repoCount: null, sampleFullNames: [] };
  }

  const sampleFullNames = payload
    .map((row) =>
      row && typeof row === "object" ? (row as Record<string, unknown>).full_name : null
    )
    .filter((fullName): fullName is string => typeof fullName === "string" && fullName.length > 0)
    .slice(0, 6);

  return {
    org: params.org,
    status: res.status,
    sso,
    repoCount: payload.length,
    sampleFullNames,
  };
}

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

    const tokenScopes = await fetchGithubTokenScopes(token).catch(() => []);
    const orgLogins = await fetchGithubOrgLogins(token).catch(() => []);
    const enableDebug = requestUrl.searchParams.get("debug") === "1";

    const { data: accountData } = await supabase
      .from("github_accounts")
      .select("scopes")
      .eq("user_id", user.id)
      .single();

    const accountRow = accountData as unknown as { scopes: string[] } | null;
    const storedScopes = accountRow?.scopes ?? [];

    const owners = Array.from(
      new Set(
        repos
          .map((repo) => repo?.owner?.login)
          .filter((owner): owner is string => typeof owner === "string" && owner.length > 0)
      )
    );

    const orgReposInUserRepos = orgLogins.reduce((sum, org) => {
      const count = repos.filter((repo) => repo?.owner?.login === org).length;
      return sum + count;
    }, 0);

    const orgRepoDebug = enableDebug
      ? await Promise.all(
          orgLogins.slice(0, 5).map((org) => fetchGithubOrgReposDebug({ token, org }))
        )
      : null;

    return NextResponse.json({
      repos,
      meta: {
        tokenScopes,
        storedScopes,
        orgLogins,
        repoCount: repos.length,
        ownerCount: owners.length,
        orgReposInUserRepos,
        orgRepoDebug,
      },
    });
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
