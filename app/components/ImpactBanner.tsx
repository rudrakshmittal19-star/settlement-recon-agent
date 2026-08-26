import type { Summary } from "./SummaryStats";

/**
 * Translates raw reconciliation numbers into a business-readable line —
 * the kind of sentence a finance ops lead would actually say out loud.
 * MINUTES_PER_MANUAL_REVIEW is a deliberately conservative estimate (not
 * measured), stated as such rather than presented as a precise figure.
 */
const MINUTES_PER_MANUAL_REVIEW = 12;

export default function ImpactBanner({ summary }: { summary: Summary }) {
  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const totalPairs = summary.total_pairs_processed;
  const autoResolved = summary.matched;
  const hoursSaved = Math.round(((autoResolved * MINUTES_PER_MANUAL_REVIEW) / 60) * 10) / 10;

  return (
    <div className="border border-line rounded-md bg-paperRaised p-4 mb-8">
      <p className="mono text-[0.65rem] uppercase tracking-widest text-ink/45 mb-2">Impact, this run</p>
      <p className="text-sm leading-relaxed">
        Of <span className="font-semibold">{totalPairs}</span> settlement/ledger pairs,{" "}
        <span className="font-semibold text-matched">{autoResolved}</span> were reconciled automatically —
        an estimated <span className="font-semibold">{hoursSaved} hours</span> of manual review avoided
        (at ~{MINUTES_PER_MANUAL_REVIEW} min/case, a conservative estimate, not measured).{" "}
        <span className="font-semibold text-exception">{inr(summary.value_unresolved)}</span> across{" "}
        <span className="font-semibold">{summary.exceptions}</span> cases remains genuinely unresolved and
        needs a human decision.
      </p>
    </div>
  );
}
