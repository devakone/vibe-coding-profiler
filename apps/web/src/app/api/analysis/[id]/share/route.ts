import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("analysis_insights")
    .select("share_template, persona_label, persona_confidence, persona_id, generated_at")
    .eq("job_id", id)
    .single();

  if (error || !data) {
    console.error("Failed to fetch share payload:", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ share: data });
}
