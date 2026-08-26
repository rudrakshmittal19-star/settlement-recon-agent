import Link from "next/link";

const STATS = [
  { value: "84.5%", label: "match rate, real run" },
  { value: "16", label: "AI + human resolved" },
  { value: "9", label: "honest exceptions, not hidden" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <p className="mono text-xs uppercase tracking-widest text-ink/45 mb-4">
          Finance Ops · AI Reconciliation
        </p>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 anim-rise">
          Every rupee, <span className="text-accent">accounted for</span> —
          or explained why not.
        </h1>
        <p className="text-lg text-ink/65 max-w-xl mb-8 anim-rise" style={{ animationDelay: "80ms" }}>
          Settlement records rarely match the ledger perfectly. This agent
          reconciles them automatically, escalates genuine judgment calls to
          AI, and never pretends a mismatch is fine when it isn&apos;t.
        </p>
        <div className="flex items-center gap-4 anim-rise" style={{ animationDelay: "160ms" }}>
          <Link
            href="/dashboard"
            className="bg-ink text-paper px-6 py-3 rounded-md text-sm font-medium hover:opacity-85 transition"
          >
            Open the dashboard
          </Link>
          <a href="#how" className="text-sm text-ink/60 hover:text-ink transition">
            How it works ↓
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="ledger-card border border-line rounded-md bg-paperRaised py-5 anim-rise"
              style={{ animationDelay: `${240 + i * 80}ms` }}
            >
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-ink/55 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="border-t border-line pt-10">
          <p className="mono text-xs uppercase tracking-widest text-ink/45 mb-6">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                t: "Deterministic pass",
                d: "Exact reference and amount matches close instantly — no AI needed for arithmetic.",
              },
              {
                n: "02",
                t: "AI reasoning, only when ambiguous",
                d: "Refunds, payout lag, fee variance — judgment calls get a plain-English explanation, not a guess.",
              },
              {
                n: "03",
                t: "Honest exceptions",
                d: "What nobody can confidently resolve goes to a human, with the full decision trail attached.",
              },
            ].map((step) => (
              <div key={step.n}>
                <p className="mono text-xs text-accent mb-2">{step.n}</p>
                <p className="font-medium mb-1">{step.t}</p>
                <p className="text-sm text-ink/60">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
