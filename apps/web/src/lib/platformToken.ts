import { decryptString } from "@vibe-coding-profiler/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPlatformAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any Supabase client generic variant
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  platform: 'github' | 'gitlab' | 'bitbucket' = 'github'
): Promise<string> {
  const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Missing GITHUB_TOKEN_ENCRYPTION_KEY");

  const { data, error } = await supabase
    .from("platform_connections")
    .select("encrypted_token")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  const row = data as unknown as { encrypted_token: string } | null;
  if (error || !row) throw new Error(`${platform} account not connected`);

  return decryptString(row.encrypted_token, encryptionKey);
}
