/**
 * AI reasoning layer.
 *
 * Only called for pairs the deterministic pass flagged as `ai_candidate` — i.e.
 * a plausible pairing exists but the amounts don't line up on simple arithmetic.
 * The model's job is narrow and specific: given ONE settlement and ONE ledger
 * entry, decide whether the discrepancy has a plausible business explanation
 * (partial refund, payout lag, fee miscalculation) or whether it should be
 * flagged as a genuine exception for a human to look at.
 *
 * Uses Gemini (matches the model the author already has production experience
 * with, from MediAssist). Swap the client below for Claude/OpenAI if preferred —
 * the prompt and output contract stay the same.
 *
 * IMPORTANT: this function must return structured, parseable output. We ask for
 * strict JSON and validate it — never trust free-form text as a routing signal.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MatchResult } from "./matching";

const apiKey = process.env.GEMINI_API_KEY;

export type ReasoningVerdict = {
  verdict: "match" | "exception";
  confidence: number; // 0-1
  reasoning: string; // plain-English, shown to the merchant in the audit trail
};

const SYSTEM_PROMPT = `You are a reconciliation analyst assistant for an Indian payments merchant.
You are given ONE settlement record (from the payment gateway) and ONE candidate ledger entry
(from the merchant's internal order records) that a deterministic matcher flagged as a possible
pair, but whose amounts don't line up on simple arithmetic.

Decide if the discrepancy has a plausible, ordinary business explanation. Plausible explanations
include: a partial or full refund reducing the settled amount, a longer-than-usual payout delay,
a fee/tax rate slightly different from the standard 2% + 18% GST, or minor rounding.

NOT plausible: amount differences that don't correspond to any refund/fee logic, or where the
ledger entry's own data (status field) doesn't support the explanation you're proposing.

Respond with STRICT JSON only, no markdown, no commentary, matching exactly this shape:
{"verdict": "match" | "exception", "confidence": <number 0-1>, "reasoning": "<one or two sentences, plain English, for a non-technical merchant to read>"}`;

export async function reasonAboutCandidate(candidate: MatchResult): Promise<ReasoningVerdict> {
  if (!apiKey) {
    // Fail safe: if no API key configured, never silently "match" — always defer to a human.
    return {
      verdict: "exception",
      confidence: 0,
      reasoning: "AI reasoning layer not configured (missing GEMINI_API_KEY) — routed to human review.",
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const userPrompt = `Settlement record:
${JSON.stringify(
    {
      utr: candidate.settlement?.utr,
      order_ref: candidate.settlement?.order_ref,
      gross_amount: candidate.settlement?.gross_amount,
      fee: candidate.settlement?.fee,
      tax_on_fee: candidate.settlement?.tax_on_fee,
      net_amount: candidate.settlement?.net_amount,
      settled_at: candidate.settlement?.settled_at,
    },
    null,
    2
  )}

Candidate ledger entry:
${JSON.stringify(
    {
      order_id: candidate.ledger?.order_id,
      amount: candidate.ledger?.amount,
      refund_amount: candidate.ledger?.refund_amount,
      status: candidate.ledger?.status,
      order_date: candidate.ledger?.order_date,
    },
    null,
    2
  )}

Raw amount delta computed by the deterministic engine: ${candidate.amountDelta}

Decide: match or exception. Return strict JSON only.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
    generationConfig: { temperature: 0.1 },
  });

  const raw = result.response.text().trim();

  try {
    const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      (parsed.verdict === "match" || parsed.verdict === "exception") &&
      typeof parsed.confidence === "number" &&
      typeof parsed.reasoning === "string"
    ) {
      return parsed as ReasoningVerdict;
    }
    throw new Error("Response JSON did not match expected shape");
  } catch (err) {
    // Never let a malformed model response silently become a false "match."
    // Bounded failure: default to exception + human review.
    return {
      verdict: "exception",
      confidence: 0,
      reasoning: `AI reasoning layer returned an unparseable response — routed to human review. Raw output: ${raw.slice(
        0,
        200
      )}`,
    };
  }
}
