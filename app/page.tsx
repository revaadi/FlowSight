// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

type CategoryRow = { category: string; total: number; count: number };
type ForecastResp = {
  start: string;
  points: { date: string; balance: number }[];
  risks: { from: string; to: string; min: number }[];
  upcoming: {
    id: string;
    merchant: string;
    amount: number;
    nextDate: string;
    flexible: boolean;
    category?: string;
  }[];
  categories: CategoryRow[];
};

const HORIZON_DEFAULT = 60;
const LIMIT_DEFAULT = 15;

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (ds: string) => {
  const d = new Date(ds);
  if (Number.isNaN(d.getTime())) return ds;
  return d.toISOString().slice(0, 10);
};

export default async function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const limit = Math.min(100, Number(searchParams?.limit ?? LIMIT_DEFAULT));
  const horizon = Math.max(
    7,
    Math.min(180, Number(searchParams?.horizon ?? HORIZON_DEFAULT))
  );
  const selectedCat = String(searchParams?.cat ?? "");

  const h = headers();
  const host = (h as any).get("host") ?? "localhost:3000";
  const proto =
    process.env.VERCEL || process.env.NODE_ENV === "production"
      ? "https"
      : "http";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/forecast`, { cache: "no-store" });
  if (!res.ok) throw new Error(`/api/forecast ${res.status}`);
  const data = (await res.json()) as ForecastResp;

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const totalAll = categories.reduce((a, c) => a + (c.total || 0), 0);
  const sortedCats = [...categories].sort(
    (a, b) => (b.total || 0) - (a.total || 0)
  );

  const now = new Date();
  const end = new Date(now.getTime() + horizon * 86400000);
  const upcomingWindow = (data.upcoming || [])
    .filter((b) => {
      const d = new Date(b.nextDate);
      return !Number.isNaN(d.getTime()) && d >= now && d <= end;
    })
    .sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));

  const baseBills = upcomingWindow.length
    ? upcomingWindow
    : [...(data.upcoming || [])].sort((a, b) =>
        a.nextDate < b.nextDate ? -1 : 1
      );

  const filtered = selectedCat
    ? baseBills.filter(
        (b) =>
          (b.category || "").toLowerCase() === selectedCat.toLowerCase()
      )
    : baseBills;

  const billsToShow = filtered.slice(0, limit);
  const risk = data.risks?.[0];

  const totalBillsWindow = billsToShow.reduce(
    (a, b) => a + (b.amount || 0),
    0
  );
  const kpi = [
    {
      label: "Current balance",
      value: fmtCurrency(data.points?.[0]?.balance ?? 0),
    },
    {
      label: `Next ${horizon}d bills`,
      value: fmtCurrency(totalBillsWindow),
    },
    {
      label: "Projected min",
      value: risk ? `${fmtCurrency(risk.min)} on ${risk.from}` : "—",
    },
    { label: "Bills in window", value: String(billsToShow.length) },
  ];

  const horizons = [30, 60, 90];

  return (
    <div className="min-h-screen text-black bg-white">
      <header className="max-w-5xl mx-auto px-6 pt-10 pb-4 flex items-center gap-3">
        <Image src="/next.svg" alt="Next.js" width={70} height={16} />
        <h1 className="text-2xl font-semibold">FlowSight</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24 space-y-10">
        {/* Spending header */}
        <section className="flex items-center justify-between">
          <h2 className="text-lg text-zinc-700">Spending by category</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">Horizon:</span>
            {horizons.map((h) => (
              <Link
                key={h}
                href={`/?horizon=${h}&limit=${limit}${
                  selectedCat ? `&cat=${encodeURIComponent(selectedCat)}` : ""
                }`}
                className={`px-2 py-1 rounded-md border ${
                  h === horizon
                    ? "border-zinc-400 bg-zinc-100"
                    : "border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {h}d
              </Link>
            ))}
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpi.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-xs text-zinc-600">{k.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {k.value}
              </div>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section>
          <div className="grid md:grid-cols-2 gap-4">
            {sortedCats.map((c) => {
              const pct =
                totalAll > 0 ? Math.max(0.1, (c.total / totalAll) * 100) : 0;
              return (
                <div
                  key={c.category}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between text-sm text-zinc-700 mb-2">
                    <span className="capitalize">{c.category}</span>
                    <span className="tabular-nums">
                      {fmtCurrency(c.total)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-zinc-100 overflow-hidden">
                    <div
                      className="h-2 bg-zinc-600"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="text-[12px] text-zinc-600 mt-1">
                    {pct.toFixed(1)}% of total • {c.count} bill
                    {c.count === 1 ? "" : "s"}
                  </div>
                </div>
              );
            })}
            {!sortedCats.length && (
              <div className="text-zinc-600 text-sm col-span-2">
                No categorized spending yet. Add bills or refresh.
              </div>
            )}
          </div>
        </section>

        {/* Risk */}
        {risk && (
          <section className="text-sm text-red-600">
            Risk window: {risk.from} → {risk.to} (min {fmtCurrency(risk.min)})
          </section>
        )}

        {/* Bills */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-zinc-700">Upcoming bills</h2>
            <div className="flex flex-wrap gap-2">
              {sortedCats.slice(0, 10).map((c) => (
                <Link
                  key={c.category}
                  href={`/?cat=${encodeURIComponent(
                    c.category
                  )}&horizon=${horizon}&limit=${limit}`}
                  className={`px-2 py-1 rounded-full border text-xs ${
                    selectedCat === c.category
                      ? "border-zinc-400 bg-zinc-100"
                      : "border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {c.category}
                </Link>
              ))}
              {selectedCat && (
                <Link
                  href={`/?horizon=${horizon}&limit=${limit}`}
                  className="px-2 py-1 rounded-full border border-zinc-200 text-xs hover:bg-zinc-100"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>

          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 overflow-hidden">
            {billsToShow.map((b) => {
              const inRisk =
                risk &&
                new Date(b.nextDate) >= new Date(risk.from) &&
                new Date(b.nextDate) <= new Date(risk.to);
              return (
                <div
                  key={`${b.id}-${b.nextDate}`}
                  className="p-4 flex items-center justify-between bg-white hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {b.merchant}
                      {inRisk && (
                        <span className="text-[10px] text-red-600">
                          ⚠ may overdraft
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-zinc-600">
                      {fmtDate(b.nextDate)}
                    </div>
                    {b.category && (
                      <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                        {b.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-medium tabular-nums">
                    {fmtCurrency(b.amount)}
                  </div>
                </div>
              );
            })}
            {!billsToShow.length && (
              <div className="p-6 text-sm text-zinc-600">No bills to show.</div>
            )}
          </div>

          <div className="text-[12px] text-zinc-500">
            Showing {billsToShow.length} of {filtered.length} filtered bills
            {selectedCat ? ` in “${selectedCat}”` : ""}. Window: next {horizon}{" "}
            days.
          </div>

          {billsToShow.length < filtered.length && (
            <div className="pt-2">
              <Link
                href={`/?limit=${Math.min(
                  100,
                  billsToShow.length + 15
                )}&horizon=${horizon}${
                  selectedCat ? `&cat=${encodeURIComponent(selectedCat)}` : ""
                }`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-sm"
              >
                Show more
              </Link>
            </div>
          )}
        </section>

        <footer className="text-[12px] text-zinc-500 pt-4">
          Data from Nessie (Capital One hackathon API). Demo app for HackGT.
        </footer>
      </main>
    </div>
  );
}
