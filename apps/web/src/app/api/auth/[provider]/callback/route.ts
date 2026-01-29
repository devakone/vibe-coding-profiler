import { encryptString } from "@vibed/core";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OAUTH_CONFIG, OAuthProvider } from "@/lib/platforms/oauth";

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

async function fetchGitlabTokenScopes(token: string): Promise<string[]> {
  // GitLab OAuth tokens have scopes defined at app creation, but we can verify
  // the token is valid by hitting the user endpoint
  const res = await fetch("https://gitlab.com/api/v4/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  // GitLab doesn't expose scopes in response headers for OAuth tokens
  // Return the default scopes we requested during OAuth
  return ["read_user", "read_api", "read_repository"];
}

async function fetchBitbucketTokenScopes(token: string): Promise<string[]> {
  // Bitbucket OAuth scopes are defined at app creation time
  // Verify the token is valid by hitting the user endpoint
  const res = await fetch("https://api.bitbucket.org/2.0/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  // Return the scopes we requested during OAuth
  return ["account", "repository", "pullrequest"];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = OAUTH_CONFIG[provider as OAuthProvider];

  if (!config) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

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
    console.error("Auth error:", error);
    url.pathname = "/login";
    url.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(url);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;
  const providerRefreshToken = session?.provider_refresh_token;
  const userId = session?.user?.id;
  
  // Get platform user ID from identities
  const identity = session?.user?.identities?.find(
    (id) => id.provider === provider
  );
  
  // If identity is missing (sometimes happens with existing sessions), we might need to rely on what we have
  // But for a fresh login, it should be there.
  const platformUserId = identity?.id;
  const platformEmail = identity?.identity_data?.email;
  const platformUsername = identity?.identity_data?.user_name || identity?.identity_data?.username || identity?.identity_data?.preferred_username;
  const platformAvatarUrl = identity?.identity_data?.avatar_url;

  const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  if (providerToken && userId && platformUserId && encryptionKey) {
    const service = createSupabaseServiceClient();
    const encryptedToken = encryptString(providerToken, encryptionKey);
    const encryptedRefreshToken = providerRefreshToken 
      ? encryptString(providerRefreshToken, encryptionKey) 
      : null;

    let scopes: string[] = [];
    if (provider === "github") {
      scopes = await fetchGithubTokenScopes(providerToken).catch(() => []);
    } else if (provider === "gitlab") {
      scopes = await fetchGitlabTokenScopes(providerToken).catch(() => []);
    } else if (provider === "bitbucket") {
      scopes = await fetchBitbucketTokenScopes(providerToken).catch(() => []);
    }

    // Check if we need to set is_primary
    // If the user has no other connections, this one is primary.
    // Or if they explicitly chose to sign in with this one, maybe we update it?
    // For now, let's keep it simple: if it's the first connection, it's primary.
    // Actually, we can just upsert. If we want to ensure at least one primary, we can handle that separately.
    // But we need a value for is_primary if it's a new row. Default is false.
    // Let's check if user has any connections.
    const { count } = await service
      .from("platform_connections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    const isFirstConnection = count === 0;

    // Check if this external account is already linked to a different user
    const { data: existingConnection } = await service
      .from("platform_connections")
      .select("user_id")
      .eq("platform", provider)
      .eq("platform_user_id", platformUserId)
      .single();

    if (existingConnection && existingConnection.user_id !== userId) {
      // This external account is linked to another user
      console.warn(`${provider} account ${platformUserId} already linked to user ${existingConnection.user_id}, current user: ${userId}`);
      url.pathname = "/login";
      url.searchParams.set("error", "account_already_linked");
      url.searchParams.set("provider", provider);
      return NextResponse.redirect(url);
    }

    // Prepare upsert data
    const upsertData = {
      user_id: userId,
      platform: provider,
      platform_user_id: platformUserId,
      platform_email: platformEmail,
      platform_username: platformUsername,
      platform_avatar_url: platformAvatarUrl,
      encrypted_token: encryptedToken,
      refresh_token_encrypted: encryptedRefreshToken,
      scopes,
      disconnected_at: null, // Re-connect if it was disconnected
      ...(isFirstConnection ? { is_primary: true } : {}),
    };

    // Upsert platform connection using user_id + platform to handle reconnections properly
    await service.from("platform_connections").upsert(
      upsertData,
      { onConflict: "user_id, platform" }
    );
  }

  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
