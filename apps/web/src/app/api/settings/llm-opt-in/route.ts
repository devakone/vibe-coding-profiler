import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserOptedInToLLM, setUserLLMOptIn } from "@/lib/llm-config";

export const runtime = "nodejs";

/**
 * GET /api/settings/llm-opt-in
 * Returns the user's current LLM opt-in status.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const optedIn = await hasUserOptedInToLLM(user.id);

  return NextResponse.json({ optedIn });
}

/**
 * POST /api/settings/llm-opt-in
 * Updates the user's LLM opt-in status.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { optIn?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.optIn !== "boolean") {
    return NextResponse.json({ error: "optIn_required" }, { status: 400 });
  }

  const success = await setUserLLMOptIn(user.id, body.optIn);

  if (!success) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ optedIn: body.optIn });
}
