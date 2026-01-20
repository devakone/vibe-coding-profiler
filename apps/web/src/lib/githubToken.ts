import { decryptString } from "@vibed/core";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getGithubAccessToken(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<string> {
  const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Missing GITHUB_TOKEN_ENCRYPTION_KEY");

  const { data, error } = await supabase
    .from("github_accounts")
    .select("encrypted_token")
    .eq("user_id", userId)
    .single();

  const row = data as unknown as { encrypted_token: string } | null;
  if (error || !row) throw new Error("GitHub account not connected");

  return decryptString(row.encrypted_token, encryptionKey);
}
