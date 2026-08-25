import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDeterministicPass, type SettlementRow, type LedgerRow } from "@/lib/matching";
import { reasonAboutCandidate } from "@/lib/reasoning";

/**
 * POST /api/reconcile
 *
 * Runs the full pipeline over ALL settlement + ledger rows currently in the
 * database:
 *   1. Deterministic pass (cheap, instant, no LLM calls)
 *   2. AI reasoning pass — ONLY for pairs the deterministic pass flagged as
 *      ambiguous candidates. Every other row bypasses the LLM entirely.
 *   3. Writes one row to `matches` per settlement/ledger pair (or unresolved
 *      single-sided row), plus a corresponding `audit_log` entry explaining
 *      what happened and why.
 *
 * Returns summary metrics — this is what "the bar" (throughput + measured
 * accuracy + honest exception list) actually needs, so don't strip this down
 * to just "success: true" later.
 */
export async function POST() {
  try {
    const { data: settlements, error: settleErr } = await supabaseAdmin
      .from("settlements")
      .select("*");
    if (settleErr) throw settleErr;

    const { data: ledgerEntries, error: ledgerErr } = await supabaseAdmin
      .from("ledger_entries")
      .select("*");
    if (ledgerErr) throw ledgerErr;

    const deterministicResults = runDeterministicPass(
      settlements as SettlementRow[],
      ledgerEntries as LedgerRow[]
    );

    let matchedCount = 0;
    let exceptionCount = 0;
    let aiResolvedCount = 0;
    let totalValueReconciled = 0;
    let totalValueUnresolved = 0;

    for (const result of deterministicResults) {
      let finalStatus: "matched" | "exception" | "pending_review" = "exception";
      let finalStage = result.stage;
      let reasoning = result.reasoning;
      let confidence = result.confidence;

      if (result.stage === "deterministic") {
        finalStatus = "matched";
        matchedCount++;
        totalValueReconciled += result.settlement?.net_amount ?? 0;
      } else if (result.stage === "ai_candidate") {
        // Escalate to the AI reasoning layer — this is the only place an LLM call happens.
        const verdict = await reasonAboutCandidate(result);
        reasoning = verdict.reasoning;
        confidence = verdict.confidence;
        finalStage = "ai_reasoning";

        if (verdict.verdict === "match") {
          finalStatus = "matched";
          matchedCount++;
          aiResolvedCount++;
          totalValueReconciled += result.settlement?.net_amount ?? 0;
        } else {
          finalStatus = "exception";
          exceptionCount++;
          totalValueUnresolved += Math.abs(result.amountDelta);
        }
      } else {
        // unresolved — no candidate existed at all, no LLM call needed
        finalStatus = "exception";
        exceptionCount++;
        totalValueUnresolved += Math.abs(result.amountDelta);
      }

      const { data: matchRow, error: matchErr } = await supabaseAdmin
        .from("matches")
        .insert({
          settlement_id: result.settlement?.id ?? null,
          ledger_entry_id: result.ledger?.id ?? null,
          match_stage: finalStage,
          confidence,
          status: finalStatus,
          reasoning,
          amount_delta: result.amountDelta,
        })
        .select()
        .single();
      if (matchErr) throw matchErr;

      await supabaseAdmin.from("audit_log").insert({
        match_id: matchRow.id,
        actor: finalStage === "deterministic" ? "deterministic_engine" : "ai_reasoner",
        action: finalStatus === "matched" ? "matched" : "flagged_exception",
        detail: reasoning,
      });
    }

    const total = deterministicResults.length;
    const matchRate = total > 0 ? matchedCount / total : 0;

    return NextResponse.json({
      summary: {
        total_pairs_processed: total,
        matched: matchedCount,
        exceptions: exceptionCount,
        resolved_by_ai: aiResolvedCount,
        match_rate: Math.round(matchRate * 1000) / 1000,
        value_reconciled: Math.round(totalValueReconciled * 100) / 100,
        value_unresolved: Math.round(totalValueUnresolved * 100) / 100,
      },
    });
  } catch (err) {
    console.error("[reconcile] pipeline failed:", err);
    return NextResponse.json(
      { error: "Reconciliation pipeline failed", detail: `${err}` },
      { status: 500 }
    );
  }
}
