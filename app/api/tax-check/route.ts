import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const GST_RATE = 0.18;
const TOLERANCE = 0.5;

export async function GET() {
  const { data: settlements, error } = await supabaseAdmin
    .from("settlements")
    .select("id, utr, fee, tax_on_fee, gross_amount, settled_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (settlements ?? []).map((s) => {
    const expectedTax = Math.round(s.fee * GST_RATE * 100) / 100;
    const variance = Math.round((s.tax_on_fee - expectedTax) * 100) / 100;
    return {
      utr: s.utr,
      fee: s.fee,
      tax_on_fee: s.tax_on_fee,
      expected_tax: expectedTax,
      variance,
      settled_at: s.settled_at,
      flagged: Math.abs(variance) > TOLERANCE,
    };
  });

  const flagged = rows.filter((r) => r.flagged);
  const totalVariance = Math.round(flagged.reduce((sum, r) => sum + Math.abs(r.variance), 0) * 100) / 100;

  return NextResponse.json({
    summary: {
      total_checked: rows.length,
      flagged_count: flagged.length,
      total_variance: totalVariance,
    },
    rows,
  });
}
