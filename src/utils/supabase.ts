import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Creates a standard Supabase client for edge cases where the default singleton
 * isn't sufficient or for public-only server reads without a session.
 * 
 * NOTE: For standard app logic, prefer `import { supabase } from "@/integrations/supabase/client"`.
 */
export function createSupabaseClient(config?: {
  persistSession?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
}) {
  const SUPABASE_URL = config?.supabaseUrl || import.meta.env?.VITE_SUPABASE_URL || process.env?.['SUPABASE_URL'];
  const SUPABASE_KEY = config?.supabaseKey || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.['SUPABASE_PUBLISHABLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL and Key are required. Check environment variables.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: config?.persistSession ?? false,
      autoRefreshToken: config?.persistSession ?? false,
    },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (SUPABASE_KEY.startsWith("sb_") && h.get("Authorization") === `Bearer ${SUPABASE_KEY}`) {
          h.delete("Authorization");
        }
        h.set("apikey", SUPABASE_KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
