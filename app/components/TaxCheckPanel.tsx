"use client";

import { useEffect, useState } from "react";

type TaxRow = {
  utr: string;
  fee: number;
  tax_on_fee: number;
  expected_tax: number;
  variance: number;
  settled_at: string;
  flagged: boolean;
};

export default function TaxCheckPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [summary, setSummary] = useState<{ total_checked: number; flagged_count: number; total_variance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/tax-check")
      .then((r) => r.json())
      .then((json) => {
        setRows(json.rows ?? []);
        setSummary(json.summary ?? null);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="text-ink/50 text-sm">Checking tax lines…</p>;

  const flaggedRows = rows.filter((r) => r.flagged);

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="ledger-card bg-paperRaised border border-line rounded-md py-3">
            <p className="mono text-[0.65rem] uppercase tracking-widest text-ink/45">Checked</p>
            <p className="font-display text-2xl font-bold mt-1">{summary.total_checked}</p>
          </div>
          <div className="ledger-card bg-exceptionBg border border-line rounded-md py-3">
            <p className="mono text-[0.65rem] uppercase tracking-widest text-exception opacity-70">Flagged</p>
            <p className="font-display text-2xl font-bold mt-1 text-exception">{summary.flagged_count}</p>
          </div>
          <div className="ledger-card bg-pendingBg border border-line rounded-md py-3">
            <p className="mono text-[0.65rem] uppercase tracking-widest text-pending opacity-70">Total variance</p>
            <p className="font-display text-2xl font-bold mt-1 text-pending">₹{summary.total_variance}</p>
          </div>
        </div>
      )}

      {flaggedRows.length === 0 ? (
        <p className="text-ink/50 text-sm border border-line rounded-md p-4 bg-paperRaised">
          No tax-line anomalies found — GST charged matches 18% of the Razorpay fee on every settlement, within tolerance.
        </p>
      ) : (
        <div className="border border-line rounded-md overflow-hidden bg-paperRaised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">UTR</th>
                <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Fee</th>
                <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Tax charged</th>
                <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Expected tax</th>
                <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Variance</th>
              </tr>
            </thead>
            <tbody>
              {flaggedRows.map((r) => (
                <tr key={r.utr} className="border-b border-line last:border-0">
                  <td className="p-3 mono text-xs">{r.utr}</td>
                  <td className="p-3 mono text-xs">₹{r.fee}</td>
                  <td className="p-3 mono text-xs">₹{r.tax_on_fee}</td>
                  <td className="p-3 mono text-xs">₹{r.expected_tax}</td>
                  <td className="p-3 mono text-xs text-exception">₹{r.variance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
