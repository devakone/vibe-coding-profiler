import { encryptString } from "@vibed/core";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

    const { data: userRow } = await service
      .from("users")
      .select("github_id")
      .eq("id", userId)
      .single();

    const githubUserId = userRow?.github_id;

    if (githubUserId) {
      await service.from("github_accounts").upsert(
        {
          user_id: userId,
          github_user_id: githubUserId,
          encrypted_token: encryptedToken,
          scopes: [],
        },
        { onConflict: "user_id" }
      );
    }
  }

  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
