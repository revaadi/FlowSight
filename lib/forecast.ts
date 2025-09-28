// /lib/forecast.ts
import { categorize } from "@/lib/categories";

interface Purchase {
  amount: number;
  purchase_date: string; // format: YYYY-MM-DD
  type?: "income" | "expense"; // 👈 add support for incomes
  description: string;
}

export function forecastNext30Days(balance: number, purchases: Purchase[]) {
  const forecast: { date: string; balance: number }[] = [];
  const today = new Date();
  const purchaseMap = new Map<string, number>();

  // Group purchases by date (income vs expense aware)
  for (const p of purchases) {
    if (!p.purchase_date) continue;
    const amt = purchaseMap.get(p.purchase_date) || 0;

    if (p.type === "income") {
      // income should increase balance → store as negative
      purchaseMap.set(p.purchase_date, amt - p.amount);
    } else {
      // expense should decrease balance → store as positive
      purchaseMap.set(p.purchase_date, amt + p.amount);
    }
  }

  // Build forecast for next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const dateStr = date.toISOString().slice(0, 10);
    const netChange = purchaseMap.get(dateStr) || 0;

    balance -= netChange; // subtracting a negative adds income
    forecast.push({ date: dateStr, balance: Math.max(0, +balance.toFixed(2)) });
  }

  return forecast;
}

export function groupByCategory(purchases: Purchase[]) {
  const totals: Record<string, number> = {};
  for (const p of purchases) {
    const category = categorize(p.description);
    totals[category] = (totals[category] || 0) + p.amount;
  }
  return Object.entries(totals).map(([category, total]) => ({
    category,
    total,
  }));
}
