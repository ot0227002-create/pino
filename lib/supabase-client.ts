import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && key);

// Placeholder values prevent createClient from throwing at build time.
// All actual usage is guarded by hasSupabase checks.
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-key"
);
