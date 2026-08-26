# Settlement Reconciliation Agent

Built for the **Razorpay AI Buildathon — Track 04: AI Finance Controller**.

Reconciles Razorpay settlement records against a merchant's internal order ledger.
Deterministic matching handles the ~80% of cases that are simple arithmetic; an AI
reasoning layer is escalated only for genuinely ambiguous pairs (partial refunds,
payout timing gaps, fee mismatches); anything neither pass can resolve becomes a
human-reviewable exception with a plain-English reason and a full audit trail.

## Why this design

The brief's bar is explicit: *"throughput plus measured accuracy plus an honest
exception list. One cherry-picked match proves nothing."* This project is built
around that:

- **Deterministic-first, AI-second.** The LLM is never asked to do arithmetic it
  could get wrong — it's only called for pairs where a human would genuinely need
  to use judgment. This keeps cost and latency down and keeps the AI's role
  explainable.
- **Every decision is logged.** `matches` + `audit_log` tables record which stage
  resolved each pair, the confidence score, and the plain-English reasoning —
  whether that reasoning came from the deterministic engine or the AI layer.
- **Honest exceptions, not a cherry-picked demo.** The synthetic data generator
  deliberately includes ~8 pairs that should NOT resolve cleanly (orphaned
  settlements, orphaned ledger entries, an unexplainable amount mismatch), so the
  match rate reported is real, not manufactured.
- **Human override, always available.** Every match — AI-resolved or not — can be
  overridden by a human reviewer, and that override is itself logged.

## Architecture

```
Synthetic data (settlements + ledger_entries)
        │
        ▼
Deterministic matching pass (lib/matching.ts)
   ├── exact order_ref + amount within tolerance → MATCHED
   ├── ref matches but amount doesn't           → escalate to AI
   ├── no ref match, single amount/date candidate → escalate to AI
   └── no plausible candidate at all            → EXCEPTION (no LLM call)
        │
        ▼
AI reasoning pass (lib/reasoning.ts) — Gemini, structured JSON output
   ├── plausible explanation (refund/lag/fee)   → MATCHED, reasoning logged
   └── no plausible explanation                 → EXCEPTION, reasoning logged
        │
        ▼
matches + audit_log tables (Supabase)
        │
        ▼
Dashboard (Next.js) — match rate, value reconciled, exception review + override
```

## Stack

- Next.js 14 (App Router), deployed on Vercel
- Supabase (Postgres) for settlements, ledger, matches, audit log
- GRroq API for the reasoning layer
- Tailwind CSS for the dashboard

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in real keys
```

Run the schema in Supabase SQL editor: `supabase/schema.sql`.

Seed synthetic data:
```bash
npm run seed
```

Run locally:
```bash
npm run dev
```

Open http://localhost:3000, click **Run reconciliation**, review exceptions.

## What's a known limitation (said honestly, not hidden)

- Fuzzy candidate matching (when `order_ref` doesn't match exactly) uses a loose
  amount+date window rather than string-distance matching on garbled refs. A
  stronger version would add Levenshtein distance on `order_ref` for the
  "truncated reference" case in the synthetic data.
- The AI reasoning layer calls Gemini once per ambiguous pair sequentially. For a
  much larger batch, this should be batched/parallelized.
- No retry/backoff around the Gemini call yet — a transient API failure currently
  falls through to "exception, needs human review," which is a safe default but
  not optimal for throughput.
