/**
 * Server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY when available (bypasses RLS),
 * falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY for anon access.
 * Only used inside API Routes (Edge Runtime).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** true when Supabase is fully configured and API routes can use the DB */
export const hasSupabaseServer = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

/** Supabase client for server-side use (service role key preferred) */
export const dbServer = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key"
);
