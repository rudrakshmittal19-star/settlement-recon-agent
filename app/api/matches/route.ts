import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/matches — full list of every match (matched + exception), for the "All Matches" tab.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select(
      "*, settlements(utr, order_ref, gross_amount, net_amount, settled_at), ledger_entries(order_id, customer_name, amount, order_date, status)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ matches: data });
}
