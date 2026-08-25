/**
 * Deterministic matching pass.
 *
 * Philosophy: never let the AI reasoning layer touch a pair that can be matched
 * with plain arithmetic and string comparison. The AI layer is for judgment calls,
 * not for things a spreadsheet formula could already do — that's the "right tool
 * in the right place" bar the buildathon explicitly asks for.
 *
 * A pair is a DETERMINISTIC MATCH if:
 *   - order_ref (settlement) matches order_id (ledger) exactly, AND
 *   - net_amount (settlement) equals amount - refund_amount, within fee tolerance
 *
 * Everything else falls through to the AI reasoning layer as a CANDIDATE, or,
 * if there's no plausible candidate at all, becomes an UNRESOLVED exception
 * immediately (no point spending an LLM call on a settlement with zero ledger
 * entries within a sane date/amount window).
 */

export type SettlementRow = {
  id: string;
  utr: string;
  order_ref: string | null;
  gross_amount: number;
  fee: number;
  tax_on_fee: number;
  net_amount: number;
  settled_at: string;
};

export type LedgerRow = {
  id: string;
  order_id: string;
  customer_name: string | null;
  amount: number;
  order_date: string;
  refund_amount: number;
  status: string;
};

export type MatchResult = {
  settlement: SettlementRow;
  ledger: LedgerRow | null;
  stage: "deterministic" | "ai_candidate" | "unresolved";
  confidence: number;
  amountDelta: number;
  reasoning: string;
};

const AMOUNT_TOLERANCE = 1.0; // rupees — accounts for rounding
const DATE_WINDOW_DAYS = 10; // how far apart order/settlement dates can be before we stop considering a pair at all

function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
}

function expectedNet(ledger: LedgerRow, feeRate = 0.02, gstRate = 0.18) {
  const netOfRefund = ledger.amount - (ledger.refund_amount || 0);
  const fee = Math.round(netOfRefund * feeRate * 100) / 100;
  const tax = Math.round(fee * gstRate * 100) / 100;
  return Math.round((netOfRefund - fee - tax) * 100) / 100;
}

export function runDeterministicPass(
  settlements: SettlementRow[],
  ledgerEntries: LedgerRow[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const usedLedgerIds = new Set<string>();

  for (const settlement of settlements) {
    // Exact order_ref match first.
    const exact = ledgerEntries.find(
      (l) => l.order_id === settlement.order_ref && !usedLedgerIds.has(l.id)
    );

    if (exact) {
      const expected = expectedNet(exact);
      const delta = Math.round((settlement.net_amount - expected) * 100) / 100;

      if (Math.abs(delta) <= AMOUNT_TOLERANCE) {
        usedLedgerIds.add(exact.id);
        results.push({
          settlement,
          ledger: exact,
          stage: "deterministic",
          confidence: 1.0,
          amountDelta: delta,
          reasoning:
            "Exact order reference match; net settlement amount matches expected amount after standard fee deduction within tolerance.",
        });
        continue;
      }

      // Ref matches but amount doesn't — this is a candidate for AI reasoning,
      // not an auto-match. Could be a partial refund, could be a data error.
      usedLedgerIds.add(exact.id);
      results.push({
        settlement,
        ledger: exact,
        stage: "ai_candidate",
        confidence: 0,
        amountDelta: delta,
        reasoning: "",
      });
      continue;
    }

    // No exact ref match — look for a plausible candidate by amount + date window.
    const candidates = ledgerEntries.filter((l) => {
      if (usedLedgerIds.has(l.id)) return false;
      const expected = expectedNet(l);
      const withinAmount = Math.abs(settlement.net_amount - expected) <= 50; // loose net for candidate search
      const withinDate = daysBetween(l.order_date, settlement.settled_at) <= DATE_WINDOW_DAYS;
      return withinAmount && withinDate;
    });

    if (candidates.length === 1) {
      usedLedgerIds.add(candidates[0].id);
      const expected = expectedNet(candidates[0]);
      results.push({
        settlement,
        ledger: candidates[0],
        stage: "ai_candidate",
        confidence: 0,
        amountDelta: Math.round((settlement.net_amount - expected) * 100) / 100,
        reasoning: "",
      });
    } else {
      // Zero or multiple ambiguous candidates — no confident single pairing exists.
      results.push({
        settlement,
        ledger: null,
        stage: "unresolved",
        confidence: 0,
        amountDelta: settlement.net_amount,
        reasoning:
          candidates.length === 0
            ? "No ledger entry found within amount/date tolerance. Possible stray or test-mode settlement."
            : `${candidates.length} plausible ledger candidates found — ambiguous, needs human review.`,
      });
    }
  }

  // Any ledger entries never touched at all (not even as a candidate) are also exceptions —
  // they represent orders that never settled.
  for (const ledger of ledgerEntries) {
    if (!usedLedgerIds.has(ledger.id)) {
      results.push({
        settlement: null as unknown as SettlementRow, // no settlement side at all
        ledger,
        stage: "unresolved",
        confidence: 0,
        amountDelta: ledger.amount,
        reasoning: "No settlement record found for this order. Possible payment never settled or still pending.",
      });
    }
  }

  return results;
}
