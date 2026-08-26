"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

type MatchRow = {
  status: string;
  match_stage: string;
  settlements: { net_amount: number } | null;
};

const STAGE_COLORS: Record<string, string> = {
  deterministic: "#0E6B4E",
  ai_reasoning: "#9C7A17",
  unresolved: "#9A3324",
};

export default function ReconciliationChart({ refreshKey }: { refreshKey: number }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/matches")
      .then((r) => r.json())
      .then((json) => setMatches(json.matches ?? []))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading || matches.length === 0) return null;

  const stageCounts: Record<string, number> = {};
  let valueMatched = 0;
  let valueException = 0;

  for (const m of matches) {
    stageCounts[m.match_stage] = (stageCounts[m.match_stage] ?? 0) + 1;
    const amt = m.settlements?.net_amount ?? 0;
    if (m.status === "matched") valueMatched += amt;
    else valueException += amt;
  }

  const pieData = Object.entries(stageCounts).map(([stage, count]) => ({
    name: stage,
    value: count,
  }));

  const barData = [
    { name: "Reconciled", value: Math.round(valueMatched) },
    { name: "Unresolved", value: Math.round(valueException) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="border border-line rounded-md bg-paperRaised p-4">
        <p className="mono text-[0.65rem] uppercase tracking-widest text-ink/45 mb-3">
          Resolution by stage
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={STAGE_COLORS[entry.name] ?? "#999"} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center mt-2 flex-wrap">
          {pieData.map((entry, i) => (
            <span key={i} className="mono text-[0.65rem] flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: STAGE_COLORS[entry.name] ?? "#999" }}
              />
              {entry.name} ({entry.value})
            </span>
          ))}
        </div>
      </div>

      <div className="border border-line rounded-md bg-paperRaised p-4">
        <p className="mono text-[0.65rem] uppercase tracking-widest text-ink/45 mb-3">
          Value: reconciled vs unresolved
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`}
              contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="value" radius={4}>
              <Cell fill="#0E6B4E" />
              <Cell fill="#9A3324" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
