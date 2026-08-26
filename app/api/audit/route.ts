import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/audit — full decision history, joined back through matches to
// the underlying settlement/ledger for context. This is the explainability
// trail the buildathon brief asks for.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select(
      "*, matches(status, match_stage, settlements(utr), ledger_entries(order_id))"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}
