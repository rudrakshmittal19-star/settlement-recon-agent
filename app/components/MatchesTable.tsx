"use client";

import { useEffect, useState } from "react";
import MatchDrilldown from "./MatchDrilldown";
import { downloadCsv } from "@/lib/csv";

type MatchRow = {
  id: string;
  match_stage: string;
  status: string;
  confidence: number | null;
  reasoning: string | null;
  settlements: { utr: string; net_amount: number; settled_at: string } | null;
  ledger_entries: { order_id: string; amount: number; order_date: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "matched" ? "text-matched" : status === "exception" ? "text-exception" : "text-pending";
  return <span className={`stamp ${styles}`}>{status}</span>;
}

export default function MatchesTable({ refreshKey }: { refreshKey: number }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/matches")
      .then((r) => r.json())
      .then((json) => setMatches(json.matches ?? []))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = matches.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (!search) return true;
    const haystack = `${m.settlements?.utr ?? ""} ${m.ledger_entries?.order_id ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  function exportCsv() {
    downloadCsv(
      "matches.csv",
      filtered.map((m) => ({
        status: m.status,
        stage: m.match_stage,
        confidence: m.confidence,
        settlement_utr: m.settlements?.utr ?? "",
        settlement_amount: m.settlements?.net_amount ?? "",
        ledger_order_id: m.ledger_entries?.order_id ?? "",
        ledger_amount: m.ledger_entries?.amount ?? "",
        reasoning: m.reasoning ?? "",
      }))
    );
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading matches…</p>;
  if (matches.length === 0)
    return (
      <p className="text-ink/50 text-sm border border-line rounded-md p-4 bg-paperRaised">
        No matches yet. Run reconciliation to generate results.
      </p>
    );

  return (
    <>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search UTR or order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-line rounded-md px-3 py-1.5 text-sm bg-paperRaised flex-1 min-w-[180px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-line rounded-md px-3 py-1.5 text-sm bg-paperRaised"
        >
          <option value="all">All statuses</option>
          <option value="matched">Matched</option>
          <option value="exception">Exception</option>
        </select>
        <button
          onClick={exportCsv}
          className="text-xs bg-accentBg text-accent px-3 py-1.5 rounded-md hover:opacity-80 transition font-medium"
        >
          Export CSV
        </button>
      </div>

      <div className="border border-line rounded-md overflow-hidden bg-paperRaised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Status</th>
              <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Stage</th>
              <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Settlement</th>
              <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Ledger</th>
              <th className="p-3 text-[0.65rem] uppercase tracking-wide text-ink/45">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                onClick={() => setSelected(m.id)}
                className="border-b border-line last:border-0 cursor-pointer hover:bg-line/20 transition"
              >
                <td className="p-3"><StatusBadge status={m.status} /></td>
                <td className="p-3 mono text-xs text-ink/60">{m.match_stage}</td>
                <td className="p-3 mono text-xs">
                  {m.settlements ? `${m.settlements.utr} · ₹${m.settlements.net_amount}` : <span className="text-ink/35 italic">none</span>}
                </td>
                <td className="p-3 mono text-xs">
                  {m.ledger_entries ? `${m.ledger_entries.order_id} · ₹${m.ledger_entries.amount}` : <span className="text-ink/35 italic">none</span>}
                </td>
                <td className="p-3 mono text-xs">
                  {m.confidence !== null ? `${(m.confidence * 100).toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink/40 mt-2">
        Showing {filtered.length} of {matches.length}. Click any row for its full decision trail.
      </p>

      {selected && <MatchDrilldown matchId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
