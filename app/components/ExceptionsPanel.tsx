"use client";

import { useEffect, useState } from "react";
import { SkeletonList } from "./Skeleton";

type ExceptionRow = {
  id: string;
  match_stage: string;
  confidence: number | null;
  reasoning: string | null;
  amount_delta: number | null;
  settlements: {
    utr: string;
    order_ref: string | null;
    gross_amount: number;
    net_amount: number;
    settled_at: string;
  } | null;
  ledger_entries: {
    order_id: string;
    customer_name: string | null;
    amount: number;
    order_date: string;
    status: string;
  } | null;
};

export default function ExceptionsPanel({ refreshKey }: { refreshKey: number }) {
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/exceptions");
    const json = await res.json();
    setExceptions(json.exceptions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function override(matchId: string, status: "matched" | "exception") {
    setOverriding(matchId);
    await fetch("/api/exceptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        new_status: status,
        reason: `Human reviewer marked as ${status}`,
      }),
    });
    await load();
    setOverriding(null);
  }

  if (loading) return <SkeletonList count={3} />;
  if (exceptions.length === 0)
    return (
      <p className="text-ink/50 text-sm border border-line rounded-md p-4 bg-paperRaised">
        No exceptions right now. Run reconciliation to generate results.
      </p>
    );

  return (
    <div className="space-y-3">
      {exceptions.map((ex) => (
        <div key={ex.id} className="ledger-card border border-line rounded-md p-4 bg-paperRaised">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="stamp text-exception">{ex.match_stage}</span>
                {ex.confidence !== null && (
                  <span className="mono text-xs text-ink/40">
                    confidence {(ex.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-2.5">
                <div>
                  <p className="text-ink/45 text-[0.65rem] uppercase tracking-wide mb-0.5">Settlement</p>
                  {ex.settlements ? (
                    <p className="mono text-[0.85rem]">
                      {ex.settlements.utr} · ₹{ex.settlements.net_amount} · {ex.settlements.settled_at}
                    </p>
                  ) : (
                    <p className="text-ink/35 italic">none</p>
                  )}
                </div>
                <div>
                  <p className="text-ink/45 text-[0.65rem] uppercase tracking-wide mb-0.5">Ledger entry</p>
                  {ex.ledger_entries ? (
                    <p className="mono text-[0.85rem]">
                      {ex.ledger_entries.order_id} · ₹{ex.ledger_entries.amount} · {ex.ledger_entries.order_date}
                    </p>
                  ) : (
                    <p className="text-ink/35 italic">none</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-ink/70">{ex.reasoning}</p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => override(ex.id, "matched")}
                disabled={overriding === ex.id}
                className="text-xs bg-matchedBg text-matched px-3 py-1.5 rounded-md hover:opacity-80 transition disabled:opacity-50 font-medium"
              >
                Approve as match
              </button>
              <button
                onClick={() => override(ex.id, "exception")}
                disabled={overriding === ex.id}
                className="text-xs bg-exceptionBg text-exception px-3 py-1.5 rounded-md hover:opacity-80 transition disabled:opacity-50 font-medium"
              >
                Keep as exception
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
