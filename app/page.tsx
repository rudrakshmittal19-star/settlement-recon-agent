"use client";

import { useState } from "react";
import ExceptionsPanel from "./components/ExceptionsPanel";
import SummaryStats, { type Summary } from "./components/SummaryStats";

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function runReconciliation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reconcile", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reconciliation failed");
      setSummary(json.summary);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-10 border-b border-line pb-6">
        <p className="mono text-xs uppercase tracking-widest text-ink/50 mb-2">
          Finance Ops · Reconciliation
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Settlement Reconciliation Agent
        </h1>
        <p className="text-ink/60 mt-2 max-w-2xl">
          Matches Razorpay settlement records against the internal order ledger.
          Deterministic matching runs first; ambiguous pairs are escalated to an
          AI reasoning layer. Every decision is logged and reviewable below.
        </p>
      </header>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={runReconciliation}
          disabled={loading}
          className="bg-ink text-paper px-5 py-2.5 rounded-md text-sm font-medium hover:bg-ink/85 transition disabled:opacity-50"
        >
          {loading ? "Running reconciliation…" : "Run reconciliation"}
        </button>
        {error && <p className="text-exception text-sm">{error}</p>}
      </div>

      {summary && <SummaryStats summary={summary} />}

      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-1">Exceptions requiring review</h2>
        <p className="text-ink/60 text-sm mb-4">
          Every row here is something neither the deterministic engine nor the AI
          reasoning layer could confidently resolve on its own.
        </p>
        <ExceptionsPanel refreshKey={refreshKey} />
      </div>
    </main>
  );
}
