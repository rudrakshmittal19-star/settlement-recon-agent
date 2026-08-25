-- Settlement Reconciliation Agent — schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) before seeding data.

-- 1. Razorpay-side settlement records (simulates the settlement report/export)
create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  utr text not null,                    -- unique transaction reference from Razorpay
  order_ref text,                       -- may be missing/garbled in some rows (realistic noise)
  gross_amount numeric(12,2) not null,  -- amount before fees
  fee numeric(12,2) not null default 0,
  tax_on_fee numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null,    -- what actually settles
  settled_at date not null,
  created_at timestamptz default now()
);

-- 2. Merchant's internal order ledger (simulates their own DB/ERP export)
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  customer_name text,
  amount numeric(12,2) not null,        -- what the customer was charged
  order_date date not null,
  refund_amount numeric(12,2) default 0,
  status text default 'completed',      -- completed | refunded | partial_refund
  created_at timestamptz default now()
);

-- 3. Reconciliation results — one row per attempted match
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid references settlements(id),
  ledger_entry_id uuid references ledger_entries(id),
  match_stage text not null,            -- 'deterministic' | 'ai_reasoning' | 'unresolved'
  confidence numeric(4,3),              -- 0.000–1.000
  status text not null,                 -- 'matched' | 'exception' | 'pending_review'
  reasoning text,                       -- plain-English explanation (esp. for AI-resolved cases)
  amount_delta numeric(12,2),           -- gross discrepancy, if any
  reviewed_by_human boolean default false,
  human_override_status text,           -- if a human overrides the AI/deterministic call
  created_at timestamptz default now()
);

-- 4. Audit log — every decision the system made, for explainability
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  actor text not null,                  -- 'deterministic_engine' | 'ai_reasoner' | 'human'
  action text not null,                 -- e.g. 'matched', 'flagged_exception', 'overridden'
  detail text,
  created_at timestamptz default now()
);

create index if not exists idx_matches_status on matches(status);
create index if not exists idx_settlements_utr on settlements(utr);
create index if not exists idx_ledger_order_id on ledger_entries(order_id);
