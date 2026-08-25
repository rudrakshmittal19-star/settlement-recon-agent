import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/exceptions — list all unresolved matches for the review panel
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select(
      "*, settlements(utr, order_ref, gross_amount, net_amount, settled_at), ledger_entries(order_id, customer_name, amount, order_date, status)"
    )
    .eq("status", "exception")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exceptions: data });
}

// PATCH /api/exceptions — human overrides a match's status, with a reason logged to audit_log
export async function PATCH(req: Request) {
  const body = await req.json();
  const { match_id, new_status, reason } = body;

  if (!match_id || !new_status) {
    return NextResponse.json({ error: "match_id and new_status are required" }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("matches")
    .update({
      status: new_status,
      reviewed_by_human: true,
      human_override_status: new_status,
    })
    .eq("id", match_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await supabaseAdmin.from("audit_log").insert({
    match_id,
    actor: "human",
    action: "overridden",
    detail: reason ?? `Human overrode status to ${new_status}`,
  });

  return NextResponse.json({ success: true });
}
