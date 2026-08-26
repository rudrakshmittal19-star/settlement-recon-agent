"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
  matches: {
    status: string;
    match_stage: string;
    settlements: { utr: string } | null;
    ledger_entries: { order_id: string } | null;
  } | null;
};

function ActorTag({ actor }: { actor: string }) {
  const label = actor === "deterministic_engine" ? "engine" : actor === "ai_reasoner" ? "ai" : "human";
  const color = actor === "human" ? "text-accent" : actor === "ai_reasoner" ? "text-pending" : "text-ink/60";
  return <span className={`mono text-[0.65rem] uppercase tracking-wide ${color}`}>{label}</span>;
}

export default function AuditLogViewer({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/audit")
      .then((r) => r.json())
      .then((json) => setEntries(json.entries ?? []))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="text-ink/50 text-sm">Loading audit log…</p>;
  if (entries.length === 0)
    return (
      <p className="text-ink/50 text-sm border border-line rounded-md p-4 bg-paperRaised">
        No audit entries yet. Run reconciliation to generate a decision trail.
      </p>
    );

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="ledger-card border border-line rounded-md p-3 bg-paperRaised flex items-start gap-4">
          <ActorTag actor={e.actor} />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{e.action}</span>
              {e.matches?.settlements?.utr && (
                <span className="text-ink/50"> — {e.matches.settlements.utr}</span>
              )}
              {e.matches?.ledger_entries?.order_id && (
                <span className="text-ink/50"> · {e.matches.ledger_entries.order_id}</span>
              )}
            </p>
            {e.detail && <p className="text-xs text-ink/60 mt-1">{e.detail}</p>}
          </div>
          <p className="mono text-[0.65rem] text-ink/35 shrink-0">
            {new Date(e.created_at).toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
}
