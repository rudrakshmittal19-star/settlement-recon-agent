export type Summary = {
  total_pairs_processed: number;
  matched: number;
  exceptions: number;
  resolved_by_ai: number;
  match_rate: number;
  value_reconciled: number;
  value_unresolved: number;
};

function TallyCard({
  label,
  value,
  sub,
  bg,
  fg,
}: {
  label: string;
  value: string;
  sub?: string;
  bg: string;
  fg: string;
}) {
  return (
    <div className={`ledger-card rounded-md py-4 ${bg}`}>
      <p className={`mono text-[0.65rem] uppercase tracking-widest ${fg} opacity-70`}>{label}</p>
      <p className={`font-display text-3xl font-bold mt-1.5 ${fg}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${fg} opacity-60`}>{sub}</p>}
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
        bg="bg-matchedBg"
        fg="text-matched"
      />
      <TallyCard
        label="Resolved by AI"
        value={`${summary.resolved_by_ai}`}
        sub="ambiguous, deterministic pass couldn't close"
        bg="bg-pendingBg"
        fg="text-pending"
      />
      <TallyCard label="Value reconciled" value={inr(summary.value_reconciled)} bg="bg-accentBg" fg="text-accent" />
      <TallyCard
        label="Value unresolved"
        value={inr(summary.value_unresolved)}
        sub={`${summary.exceptions} exceptions`}
        bg="bg-exceptionBg"
        fg="text-exception"
      />
    </div>
  );
}
