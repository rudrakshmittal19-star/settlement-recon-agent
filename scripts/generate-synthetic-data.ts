/**
 * Generates synthetic settlement + ledger data with realistic mismatches, so the
 * matching engine has genuine work to do. Run with: npm run seed
 *
 * Design intent (don't lose this when editing):
 * - ~60 "clean" pairs that should match deterministically (amount/date/ref line up
 *   once you account for Razorpay's fee deduction).
 * - ~15 pairs with a REALISTIC discrepancy that a human/AI can still explain:
 *     - partial refund after settlement
 *     - settlement date 2-4 days after order date (normal payout lag)
 *     - order_ref garbled/truncated on the settlement side
 * - ~8 genuine exceptions that should NOT resolve cleanly:
 *     - ledger entry with no matching settlement at all (payment never settled)
 *     - settlement with no matching ledger entry (possible test transaction / stray)
 *     - amount mismatch with no plausible explanation (data error to flag, not explain away)
 *
 * This mix matters for the "the bar" requirement: an honest exception list, not a
 * cherry-picked demo. Don't remove the genuine-exception cases even though they make
 * your match rate look less than 100%.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FIRST_NAMES = ["Ananya", "Rohit", "Priya", "Karan", "Sneha", "Aditya", "Meera", "Vikram", "Divya", "Arjun"];
const LAST_NAMES = ["Sharma", "Verma", "Reddy", "Iyer", "Nair", "Gupta", "Kapoor", "Menon", "Chopra", "Rao"];

function randomName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${
    LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  }`;
}

function pad(n: number, width = 5) {
  return n.toString().padStart(width, "0");
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Razorpay-style fee: 2% + 18% GST on that fee, rounded to 2 decimals.
function computeFee(gross: number) {
  const fee = Math.round(gross * 0.02 * 100) / 100;
  const tax = Math.round(fee * 0.18 * 100) / 100;
  const net = Math.round((gross - fee - tax) * 100) / 100;
  return { fee, tax, net };
}

type Settlement = {
  utr: string;
  order_ref: string | null;
  gross_amount: number;
  fee: number;
  tax_on_fee: number;
  net_amount: number;
  settled_at: string;
};

type LedgerEntry = {
  order_id: string;
  customer_name: string;
  amount: number;
  order_date: string;
  refund_amount: number;
  status: string;
};

async function main() {
  const settlements: Settlement[] = [];
  const ledgerEntries: LedgerEntry[] = [];

  const baseDate = new Date("2026-07-01");
  let orderCounter = 1000;

  // --- 1. ~60 clean pairs (deterministic match expected) ---
  for (let i = 0; i < 60; i++) {
    orderCounter++;
    const orderId = `ORD-${pad(orderCounter)}`;
    const gross = Math.round((Math.random() * 4500 + 300) * 100) / 100;
    const orderDate = addDays(baseDate, i % 25);
    const settleDate = addDays(orderDate, 1); // normal T+1 payout
    const { fee, tax, net } = computeFee(gross);

    ledgerEntries.push({
      order_id: orderId,
      customer_name: randomName(),
      amount: gross,
      order_date: isoDate(orderDate),
      refund_amount: 0,
      status: "completed",
    });

    settlements.push({
      utr: `UTR${pad(orderCounter, 8)}`,
      order_ref: orderId,
      gross_amount: gross,
      fee,
      tax_on_fee: tax,
      net_amount: net,
      settled_at: isoDate(settleDate),
    });
  }

  // --- 2. ~15 explainable-discrepancy pairs ---
  for (let i = 0; i < 15; i++) {
    orderCounter++;
    const orderId = `ORD-${pad(orderCounter)}`;
    const gross = Math.round((Math.random() * 4500 + 300) * 100) / 100;
    const orderDate = addDays(baseDate, (i % 25) + 1);
    const { fee, tax, net } = computeFee(gross);

    const variant = i % 3;

    if (variant === 0) {
      // Partial refund after settlement: ledger shows a refund_amount, settlement predates it.
      const refund = Math.round(gross * 0.3 * 100) / 100;
      ledgerEntries.push({
        order_id: orderId,
        customer_name: randomName(),
        amount: gross,
        order_date: isoDate(orderDate),
        refund_amount: refund,
        status: "partial_refund",
      });
      settlements.push({
        utr: `UTR${pad(orderCounter, 8)}`,
        order_ref: orderId,
        gross_amount: gross,
        fee,
        tax_on_fee: tax,
        net_amount: net,
        settled_at: isoDate(addDays(orderDate, 1)),
      });
    } else if (variant === 1) {
      // Payout lag longer than normal (T+4 instead of T+1) — still explainable.
      ledgerEntries.push({
        order_id: orderId,
        customer_name: randomName(),
        amount: gross,
        order_date: isoDate(orderDate),
        refund_amount: 0,
        status: "completed",
      });
      settlements.push({
        utr: `UTR${pad(orderCounter, 8)}`,
        order_ref: orderId,
        gross_amount: gross,
        fee,
        tax_on_fee: tax,
        net_amount: net,
        settled_at: isoDate(addDays(orderDate, 4)),
      });
    } else {
      // Garbled/truncated order_ref on the settlement side — forces fuzzy matching.
      ledgerEntries.push({
        order_id: orderId,
        customer_name: randomName(),
        amount: gross,
        order_date: isoDate(orderDate),
        refund_amount: 0,
        status: "completed",
      });
      settlements.push({
        utr: `UTR${pad(orderCounter, 8)}`,
        order_ref: orderId.replace("ORD-", "OD").slice(0, 7), // truncated/garbled
        gross_amount: gross,
        fee,
        tax_on_fee: tax,
        net_amount: net,
        settled_at: isoDate(addDays(orderDate, 1)),
      });
    }
  }

  // --- 3. ~8 genuine exceptions (should NOT resolve) ---
  for (let i = 0; i < 4; i++) {
    // Ledger entry with no matching settlement (payment never settled — e.g. dispute hold)
    orderCounter++;
    const orderId = `ORD-${pad(orderCounter)}`;
    const gross = Math.round((Math.random() * 4500 + 300) * 100) / 100;
    ledgerEntries.push({
      order_id: orderId,
      customer_name: randomName(),
      amount: gross,
      order_date: isoDate(addDays(baseDate, i + 2)),
      refund_amount: 0,
      status: "completed",
    });
    // deliberately no corresponding settlement pushed
  }

  for (let i = 0; i < 3; i++) {
    // Settlement with no matching ledger entry (stray/test transaction)
    orderCounter++;
    const gross = Math.round((Math.random() * 2000 + 300) * 100) / 100;
    const { fee, tax, net } = computeFee(gross);
    settlements.push({
      utr: `UTR${pad(orderCounter, 8)}`,
      order_ref: null,
      gross_amount: gross,
      fee,
      tax_on_fee: tax,
      net_amount: net,
      settled_at: isoDate(addDays(baseDate, i + 5)),
    });
  }

  {
    // Amount mismatch with no plausible explanation — a genuine data error.
    orderCounter++;
    const orderId = `ORD-${pad(orderCounter)}`;
    const gross = 1200.0;
    const wrongGross = 950.0; // doesn't match any refund/fee logic
    const { fee, tax, net } = computeFee(wrongGross);
    ledgerEntries.push({
      order_id: orderId,
      customer_name: randomName(),
      amount: gross,
      order_date: isoDate(addDays(baseDate, 10)),
      refund_amount: 0,
      status: "completed",
    });
    settlements.push({
      utr: `UTR${pad(orderCounter, 8)}`,
      order_ref: orderId,
      gross_amount: wrongGross,
      fee,
      tax_on_fee: tax,
      net_amount: net,
      settled_at: isoDate(addDays(baseDate, 11)),
    });
  }

  // --- 4. ~3 deliberate tax-line mismatches (GST charged != 18% of fee) ---
  for (let i = 0; i < 3; i++) {
    orderCounter++;
    const orderId = `ORD-${pad(orderCounter)}`;
    const gross = Math.round((Math.random() * 3000 + 300) * 100) / 100;
    const orderDate = addDays(baseDate, 15 + i);
    const { fee } = computeFee(gross);

    const wrongRate = i === 0 ? 0.12 : i === 1 ? 0.28 : 0.05;
    const wrongTax = Math.round(fee * wrongRate * 100) / 100;
    const net = Math.round((gross - fee - wrongTax) * 100) / 100;

    ledgerEntries.push({
      order_id: orderId,
      customer_name: randomName(),
      amount: gross,
      order_date: isoDate(orderDate),
      refund_amount: 0,
      status: "completed",
    });
    settlements.push({
      utr: `UTR${pad(orderCounter, 8)}`,
      order_ref: orderId,
      gross_amount: gross,
      fee,
      tax_on_fee: wrongTax,
      net_amount: net,
      settled_at: isoDate(addDays(orderDate, 1)),
    });
  }

  console.log(`Inserting ${ledgerEntries.length} ledger entries...`);
  const { error: ledgerErr } = await supabase.from("ledger_entries").insert(ledgerEntries);
  if (ledgerErr) throw ledgerErr;

  console.log(`Inserting ${settlements.length} settlement records...`);
  const { error: settleErr } = await supabase.from("settlements").insert(settlements);
  if (settleErr) throw settleErr;

  console.log("Done. Seeded", ledgerEntries.length, "ledger entries and", settlements.length, "settlements.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
