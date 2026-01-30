import { createBrowserClient } from "@supabase/ssr";
import type { Database, DbSchema } from "@vibe-coding-profiler/db";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient<Database, DbSchema>(supabaseUrl, supabaseAnonKey);
}
