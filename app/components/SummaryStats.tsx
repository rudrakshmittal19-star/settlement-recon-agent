export type Summary = {
  total_pairs_processed: number;
  matched: number;
  exceptions: number;
  resolved_by_ai: number;
  match_rate: number;
  value_reconciled: number;
  value_unresolved: number;
};

function TallyCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ledger-card bg-paperRaised border border-line rounded-md py-4">
      <p className="mono text-[0.65rem] uppercase tracking-widest text-ink/50">{label}</p>
      <p className="font-display text-3xl font-bold mt-1.5">{value}</p>
      {sub && <p className="text-xs text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}

export default function SummaryStats({ summary }: { summary: Summary }) {
  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <TallyCard
        label="Match rate"
        value={`${(summary.match_rate * 100).toFixed(1)}%`}
        sub={`${summary.matched} of ${summary.total_pairs_processed} pairs`}
      />
      <TallyCard
        label="Resolved by AI"
        value={`${summary.resolved_by_ai}`}
        sub="ambiguous pairs, deterministic pass couldn't close"
      />
      <TallyCard label="Value reconciled" value={inr(summary.value_reconciled)} />
      <TallyCard
        label="Value unresolved"
        value={inr(summary.value_unresolved)}
        sub={`${summary.exceptions} exceptions`}
      />
    </div>
  );
}
