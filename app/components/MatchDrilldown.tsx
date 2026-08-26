"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
};

function ActorTag({ actor }: { actor: string }) {
  const label = actor === "deterministic_engine" ? "engine" : actor === "ai_reasoner" ? "ai" : "human";
  const color = actor === "human" ? "text-accent" : actor === "ai_reasoner" ? "text-pending" : "text-ink/60";
  return <span className={`mono text-[0.65rem] uppercase tracking-wide ${color}`}>{label}</span>;
}

export default function MatchDrilldown({
  matchId,
  onClose,
}: {
  matchId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/audit")
      .then((r) => r.json())
      .then((json) => {
        const all: (AuditEntry & { match_id: string })[] = json.entries ?? [];
        setEntries(all.filter((e) => e.match_id === matchId));
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-paperRaised border border-line rounded-md max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-lg">Decision trail</p>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm">
            close
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-ink/50">No audit entries found for this match.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="ledger-card border-l-2 border-line pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <ActorTag actor={e.actor} />
                  <span className="text-xs text-ink/40 mono">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium">{e.action}</p>
                {e.detail && <p className="text-xs text-ink/60 mt-1">{e.detail}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
