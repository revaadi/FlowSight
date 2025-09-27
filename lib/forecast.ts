// lib/forecast.ts
export type Point = { date: string; balance: number };
export type RiskWin = { from: string; to: string; min: number };

// Make it generic: T must have amount + nextDate; it can have more fields (e.g. category)
export function buildForecast<T extends { amount: number; nextDate: string }>(
  currentBalance: number,
  dailySpendAvg: number,
  upcomingBills: T[],
  days = 30
) {
  const start = new Date();
  const points: Point[] = [];
  let bal = currentBalance;

  for (let d = 0; d < days; d++) {
    const date = new Date(start.getTime() + d * 86400000);
    const ds = date.toISOString().slice(0, 10);

    // baseline drift
    bal -= dailySpendAvg;

    // subtract any bills due that day
    for (const b of upcomingBills) {
      if (b.nextDate === ds) bal -= b.amount;
    }

    points.push({ date: ds, balance: Number(bal.toFixed(2)) });
  }

  // risk window if balance < 0 at any point
  const dips = points.filter((p) => p.balance < 0);
  const risks: RiskWin[] = dips.length
    ? [
        {
          from: dips[0].date,
          to: dips[dips.length - 1].date,
          min: Math.min(...points.map((p) => p.balance)),
        },
      ]
    : [];

  return {
    start: start.toISOString().slice(0, 10),
    points,
    risks,
    // keep the same objects you passed in (including category)
    upcoming: upcomingBills,
  };
}
