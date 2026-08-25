import { createClient } from "@supabase/supabase-js";

// Server-side client. Uses the SERVICE ROLE key because API routes need to
// write to settlements/ledger/matches/audit_log without per-row RLS friction.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser/client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  // Fail loudly at build/runtime rather than silently returning a broken client.
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
