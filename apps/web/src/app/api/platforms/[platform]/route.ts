import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if this is the only connection or the primary one
  const { data: connectionsData, error: fetchError } = await supabase
    .from("platform_connections")
    .select("platform, is_primary")
    .eq("user_id", user.id);

  if (fetchError || !connectionsData) {
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
  
  const connections = connectionsData as { platform: string; is_primary: boolean }[];

  const connectionToDelete = connections.find((c) => c.platform === platform);
  if (!connectionToDelete) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Prevent disconnecting the last platform
  if (connections.length <= 1) {
    return NextResponse.json({ error: "Cannot disconnect the last platform" }, { status: 400 });
  }

  // Prevent disconnecting the primary platform
  if (connectionToDelete.is_primary) {
    return NextResponse.json(
      { error: "Cannot disconnect the primary platform. Please set another platform as primary first." },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  const { error: deleteError } = await service
    .from("platform_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const body = await request.json();
  const { is_primary } = body;

  if (is_primary !== true) {
    return NextResponse.json(
      { error: "Only setting is_primary=true is supported" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  // 1. Unset current primary
  const { error: unsetError } = await service
    .from("platform_connections")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("is_primary", true);

  if (unsetError) {
    return NextResponse.json({ error: "Failed to unset primary" }, { status: 500 });
  }

  // 2. Set new primary
  const { error: setError } = await service
    .from("platform_connections")
    .update({ is_primary: true })
    .eq("user_id", user.id)
    .eq("platform", platform);

  if (setError) {
    // If setting new primary fails, try to revert the unset (best effort)
    await service
      .from("platform_connections")
      .update({ is_primary: true })
      .eq("user_id", user.id)
      .neq("platform", platform) // Revert the one that WAS primary (approximate logic)
      .limit(1); // Not perfect but better than nothing
      
    return NextResponse.json({ error: setError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
