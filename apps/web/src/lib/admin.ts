import { createSupabaseServerClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
  email: string | null;
  is_admin: boolean;
};

/**
 * Check if the current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return (data as Pick<UserRow, "is_admin"> | null)?.is_admin === true;
}

/**
 * Get current user with admin status
 */
export async function getCurrentUserWithAdminStatus(): Promise<UserRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, github_username, avatar_url, email, is_admin")
    .eq("id", user.id)
    .single();

  return data as UserRow | null;
}
