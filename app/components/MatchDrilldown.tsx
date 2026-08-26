"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
  match_id: string;
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
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/audit");
    const json = await res.json();
    const all: AuditEntry[] = json.entries ?? [];
    setEntries(all.filter((e) => e.match_id === matchId));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function addNote() {
    if (!note.trim()) return;
    setSubmitting(true);
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, detail: note.trim() }),
    });
    setNote("");
    await load();
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-6" onClick={onClose}>
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
          <div className="space-y-3 mb-4">
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

        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink/45 uppercase tracking-wide mb-2">Add a note</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Confirmed with merchant, refund was manual and off-system."
            className="w-full border border-line rounded-md p-2 text-sm bg-paper resize-none"
            rows={2}
          />
          <button
            onClick={addNote}
            disabled={submitting || !note.trim()}
            className="mt-2 text-xs bg-accent text-paper px-3 py-1.5 rounded-md hover:opacity-85 transition disabled:opacity-40 font-medium"
          >
            {submitting ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}
