import { NextResponse } from "next/server";
import { fetchGithubRepos } from "@/lib/github";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGithubAccessToken } from "@/lib/githubToken";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const token = await getGithubAccessToken(supabase, user.id);
    const repos = await fetchGithubRepos(token);

    return NextResponse.json({ repos });
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
