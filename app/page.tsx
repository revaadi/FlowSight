// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Point = { date: string; balance: number };
type Bill = {
  id: string;
  merchant: string;
  amount: number;
  nextDate: string;
  flexible: boolean;
};
type Forecast = {
  start: string;
  points: Point[];
  risks: { from: string; to: string; min: number }[];
  upcoming: Bill[];
};

const fmtCurrency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function Home() {
  const [data, setData] = useState<Forecast | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/forecast")
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const minBalance = useMemo(
    () => (data ? Math.min(...data.points.map((p) => p.balance)) : 0),
    [data]
  );

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">FlowSight</h1>
        <p className="text-sm opacity-70">30-day cash flow forecast</p>
      </header>

      {loading && <p>Loading…</p>}
      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <b>Error:</b> {err}
        </div>
      )}

      {data && (
        <>
          {/* Chart */}
          <section className="rounded-xl border border-zinc-200/10 p-4 sm:p-6">
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer>
                <AreaChart data={data.points}>
                  <XAxis dataKey="date" hide />
                  <YAxis
                    tickFormatter={(v) => fmtCurrency(Number(v))}
                    width={70}
                    domain={["dataMin", "dataMax"]}
                  />
                  <Tooltip
                    formatter={(value) => [fmtCurrency(Number(value)), "Balance"]}
                    labelFormatter={(l) => `Date: ${l}`}
                  />
                  {/* zero line */}
                  <ReferenceLine y={0} strokeOpacity={0.4} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#64748b"
                    fill="#64748b"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {data.risks.length > 0 && (
              <p className="mt-3 text-sm text-red-600">
                Risk window: {data.risks[0].from} → {data.risks[0].to} (min{" "}
                {fmtCurrency(data.risks[0].min)})
              </p>
            )}
          </section>

          {/* Upcoming bills */}
          <section className="rounded-xl border border-zinc-200/10 p-4 sm:p-6">
            <h2 className="text-lg font-medium mb-3">Upcoming bills</h2>
            {data.upcoming.length === 0 ? (
              <p className="text-sm opacity-70">No bills detected.</p>
            ) : (
              <ul className="divide-y divide-zinc-200/10">
                {data.upcoming.slice(0, 12).map((b) => (
                  <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{b.merchant}</p>
                      <p className="text-xs opacity-70">{b.nextDate}</p>
                    </div>
                    <div className="text-right font-medium">{fmtCurrency(b.amount)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <footer className="pt-2 text-xs opacity-60">
        Data from Nessie (Capital One hackathon API). Demo app for HackGT.
      </footer>
    </main>
  );
}
