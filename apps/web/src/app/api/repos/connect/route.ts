import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    github_id: number;
    owner: string;
    name: string;
    full_name: string;
    is_private: boolean;
    default_branch: string;
  };

  if (!body?.github_id || !body?.full_name) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  const { data: repoRow, error: repoError } = await service
    .from("repos")
    .upsert(
      {
        github_id: body.github_id,
        owner: body.owner,
        name: body.name,
        full_name: body.full_name,
        is_private: body.is_private,
        default_branch: body.default_branch,
      },
      { onConflict: "github_id" }
    )
    .select("id")
    .single();

  if (repoError || !repoRow) {
    return NextResponse.json({ error: "repo_upsert_failed" }, { status: 500 });
  }

  const { error: connectError } = await service.from("user_repos").upsert(
    {
      user_id: user.id,
      repo_id: repoRow.id,
      disconnected_at: null,
      settings_json: {},
    },
    { onConflict: "user_id,repo_id" }
  );

  if (connectError) {
    return NextResponse.json({ error: "connect_failed" }, { status: 500 });
  }

  return NextResponse.json({ repo_id: repoRow.id });
}

