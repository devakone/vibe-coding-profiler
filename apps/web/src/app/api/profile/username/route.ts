import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateUsername, normalizeUsername } from "@/lib/username";

export const runtime = "nodejs";

/**
 * GET /api/profile/username
 * Returns the current user's username.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({
    username: (data as { username?: string | null })?.username ?? null,
    github_username: (data as { github_username?: string | null })?.github_username ?? null,
  });
}

// Reserved usernames that match app routes
const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "auth", "callback", "dashboard",
  "login", "logout", "settings", "signup", "vibes", "repos",
  "profile", "public", "share", "about", "help", "support",
  "terms", "privacy", "blog", "docs", "status", "pricing", "u",
  "undefined", "null", "root", "system", "bot",
  "vibed", "vibedcoding", "vibe-coding", "bolokonon", "vcp",
]);

/**
 * PUT /api/profile/username
 * Claims or changes the current user's username.
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.username || typeof body.username !== "string") {
    return NextResponse.json({ error: "username_required" }, { status: 400 });
  }

  const normalized = normalizeUsername(body.username);
  const validation = validateUsername(normalized);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check reserved
  if (RESERVED_USERNAMES.has(normalized)) {
    return NextResponse.json({ error: "This username is reserved" }, { status: 409 });
  }

  // Use service client for cross-user uniqueness check
  const service = createSupabaseServiceClient();

  // Check reserved_usernames table
  const { data: reserved } = await service
    .from("reserved_usernames")
    .select("username")
    .eq("username", normalized)
    .maybeSingle();

  if (reserved) {
    return NextResponse.json({ error: "This username is reserved" }, { status: 409 });
  }

  // Check uniqueness
  const { data: existing } = await service
    .from("users")
    .select("id")
    .eq("username", normalized)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This username is already taken" }, { status: 409 });
  }

  // Update username
  const { error: updateError } = await service
    .from("users")
    .update({ username: normalized })
    .eq("id", user.id);

  if (updateError) {
    console.error("Username update failed:", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ username: normalized });
}
