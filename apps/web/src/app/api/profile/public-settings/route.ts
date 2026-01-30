import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";

export const runtime = "nodejs";

const VALID_KEYS = new Set(Object.keys(DEFAULT_PUBLIC_PROFILE_SETTINGS));

/**
 * GET /api/profile/public-settings
 * Returns the current user's public profile settings.
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

  const row = data as { username?: string | null; public_profile_settings?: Record<string, unknown> | null } | null;
  const settings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(row?.public_profile_settings as Partial<PublicProfileSettings> | null),
  };

  return NextResponse.json({
    username: row?.username ?? null,
    settings,
  });
}

/**
 * PUT /api/profile/public-settings
 * Updates the current user's public profile settings.
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { settings?: Partial<PublicProfileSettings> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "settings_required" }, { status: 400 });
  }

  // Validate all keys are known boolean settings
  for (const [key, value] of Object.entries(body.settings)) {
    if (!VALID_KEYS.has(key)) {
      return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 });
    }
    if (typeof value !== "boolean") {
      return NextResponse.json({ error: `Setting ${key} must be a boolean` }, { status: 400 });
    }
  }

  // Fetch current user data
  const { data: currentData } = await supabase
    .from("users")
    .select()
    .eq("id", user.id)
    .single();

  const currentRow = currentData as { username?: string | null; public_profile_settings?: Record<string, unknown> | null } | null;

  // If enabling profile, verify username exists
  if (body.settings.profile_enabled && !currentRow?.username) {
    return NextResponse.json(
      { error: "You must set a username before enabling your public profile" },
      { status: 400 }
    );
  }

  const merged: PublicProfileSettings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(currentRow?.public_profile_settings as Partial<PublicProfileSettings> | null),
    ...body.settings,
  };

  const service = createSupabaseServiceClient();
  const { error: updateError } = await service
    .from("users")
    .update({ public_profile_settings: JSON.parse(JSON.stringify(merged)) })
    .eq("id", user.id);

  if (updateError) {
    console.error("Settings update failed:", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ settings: merged });
}
