import { encryptString } from "@vibe-coding-profiler/core";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    url.pathname = "/login";
    url.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(url);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;
  const userId = session?.user?.id;

  const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  if (providerToken && userId && encryptionKey) {
    const service = createSupabaseServiceClient();
    const encryptedToken = encryptString(providerToken, encryptionKey);
    const scopes = await fetchGithubTokenScopes(providerToken).catch(() => []);

    const { data: userRow } = await service
      .from("users")
      .select("github_id")
      .eq("id", userId)
      .single();

    const githubUserId = userRow?.github_id;

    if (githubUserId) {
      await service.from("platform_connections").upsert(
        {
          user_id: userId,
          platform: "github",
          github_user_id: githubUserId,
          encrypted_token: encryptedToken,
          scopes,
        },
        { onConflict: "user_id, platform" }
      );
    }
  }

  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
