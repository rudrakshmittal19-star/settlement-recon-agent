"use client";

import { useState } from "react";
import ExceptionsPanel from "../components/ExceptionsPanel";
import MatchesTable from "../components/MatchesTable";
import AuditLogViewer from "../components/AuditLogViewer";
import SummaryStats, { type Summary } from "../components/SummaryStats";
import ReconciliationChart from "../components/ReconciliationChart";
import ImpactBanner from "../components/ImpactBanner";
import TaxCheckPanel from "../components/TaxCheckPanel";

type Tab = "exceptions" | "matches" | "audit" | "tax";

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<Tab>("exceptions");

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "exceptions", label: "Exceptions" },
    { id: "matches", label: "All matches" },
    { id: "audit", label: "Audit log" },
    { id: "tax", label: "Tax check" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-10 -mx-6 px-6 py-8 bg-accent text-paper rounded-b-lg">
        <p className="mono text-xs uppercase tracking-widest opacity-70 mb-2">
          Finance Ops · Reconciliation
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Settlement Reconciliation Agent
        </h1>
        <p className="opacity-80 mt-2 max-w-2xl">
          Matches Razorpay settlement records against the internal order ledger.
          Deterministic matching runs first; ambiguous pairs are escalated to an
          AI reasoning layer. Every decision is logged and reviewable below.
        </p>
      </header>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={runReconciliation}
          disabled={loading}
          className="bg-ink text-paper px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-85 transition disabled:opacity-50"
        >
          {loading ? "Running reconciliation…" : "Run reconciliation"}
        </button>
        {error && <p className="text-exception text-sm">{error}</p>}
      </div>

      {summary && (
        <>
          <SummaryStats summary={summary} />
          <div className="mt-6">
            <ImpactBanner summary={summary} />
          </div>
        </>
      )}

      <div className="mt-2">
        <ReconciliationChart refreshKey={refreshKey} />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-1 border-b border-line mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                tab === t.id ? "border-ink text-ink" : "border-transparent text-ink/45 hover:text-ink/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "exceptions" && (
          <>
            <p className="text-ink/60 text-sm mb-4">
              Every row here is something neither the deterministic engine nor the AI
              reasoning layer could confidently resolve on its own.
            </p>
            <ExceptionsPanel refreshKey={refreshKey} />
          </>
        )}

        {tab === "matches" && (
          <>
            <p className="text-ink/60 text-sm mb-4">
              Every settlement/ledger pair processed in the most recent run, matched or not.
            </p>
            <MatchesTable refreshKey={refreshKey} />
          </>
        )}

        {tab === "audit" && (
          <>
            <p className="text-ink/60 text-sm mb-4">
              The full decision trail — every action taken by the deterministic engine,
              the AI reasoner, or a human reviewer.
            </p>
            <AuditLogViewer refreshKey={refreshKey} />
          </>
        )}

        {tab === "tax" && (
          <>
            <p className="text-ink/60 text-sm mb-4">
              A second, independent reconciliation dimension: checks that GST charged on
              Razorpay's fee equals 18% of that fee, within tolerance — catches a
              different class of error than settlement/ledger matching alone.
            </p>
            <TaxCheckPanel refreshKey={refreshKey} />
          </>
        )}
      </div>
    </main>
  );
}
