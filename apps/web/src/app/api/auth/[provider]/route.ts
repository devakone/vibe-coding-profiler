import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { OAUTH_CONFIG, OAuthProvider } from "@/lib/platforms/oauth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = OAUTH_CONFIG[provider as OAuthProvider];

  if (!config) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const requestUrl = new URL(request.url);
  
  // Construct the callback URL
  // This must match exactly what is registered in the OAuth provider
  // Since Supabase handles the callback first, we usually point to Supabase's callback
  // But here we want to redirect to OUR callback after Supabase is done.
  // When using signInWithOAuth on server, `redirectTo` is where Supabase will redirect
  // the user after successful authentication.
  const redirectTo = `${requestUrl.origin}/api/auth/${provider}/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: config.provider,
    options: {
      redirectTo,
      scopes: config.scopes,
      queryParams: {
        access_type: "offline", // Request refresh token
        prompt: "consent", // Force consent to ensure we get refresh token
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json({ error: "No URL returned" }, { status: 500 });
}
