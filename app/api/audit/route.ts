import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/audit — full decision history, joined back through matches to
// the underlying settlement/ledger for context.
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

// POST /api/audit — add a manual human note to a match's decision trail.
export async function POST(req: Request) {
  const body = await req.json();
  const { match_id, detail } = body;

  if (!match_id || !detail) {
    return NextResponse.json({ error: "match_id and detail are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("audit_log").insert({
    match_id,
    actor: "human",
    action: "note",
    detail,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
