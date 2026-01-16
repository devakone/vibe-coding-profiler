/**
 * @bolokono/db
 *
 * Supabase client and database utilities for Bolokono.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./database.types";

export type { Database } from "./database.types";
export type { Json } from "./database.types";
export type { DbSchema } from "./schema";
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Create a Supabase client for server-side use (with service role key)
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseServiceKey: string
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client for client-side use (with anon key)
 */
export function createBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Re-export types for convenience
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
