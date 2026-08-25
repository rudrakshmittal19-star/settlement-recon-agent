export type Summary = {
  total_pairs_processed: number;
  matched: number;
  exceptions: number;
  resolved_by_ai: number;
  match_rate: number;
  value_reconciled: number;
  value_unresolved: number;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-line rounded-lg p-4 bg-white/40">
      <p className="mono text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}

export default function SummaryStats({ summary }: { summary: Summary }) {
  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Match rate"
        value={`${(summary.match_rate * 100).toFixed(1)}%`}
        sub={`${summary.matched} of ${summary.total_pairs_processed} pairs`}
      />
      <StatCard
        label="Resolved by AI"
        value={`${summary.resolved_by_ai}`}
        sub="ambiguous pairs the deterministic pass couldn't close"
      />
      <StatCard
        label="Value reconciled"
        value={inr(summary.value_reconciled)}
      />
      <StatCard
        label="Value unresolved"
        value={inr(summary.value_unresolved)}
        sub={`${summary.exceptions} exceptions`}
      />
    </div>
  );
}
