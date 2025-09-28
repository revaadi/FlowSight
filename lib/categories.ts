// lib/categories.ts

import type { Purchase } from './forecast'

export function categoriesFromPurchases(purchases: Purchase[]) {
  const map = new Map<string, number>()
  for (const p of purchases) {
    if (p.type === 'income') continue
    const key =
      /rent/i.test(p.description) ? 'Rent' :
      /utilit/i.test(p.description) ? 'Utilities' :
      'Other'
    map.set(key, (map.get(key) || 0) + p.amount)
  }
  return Array.from(map, ([category, total]) => ({ category, total }))
}

export const categorize = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes("grocery")) return "Groceries";
    if (desc.includes("rent")) return "Rent";
    if (desc.includes("utilities")) return "Utilities";
    if (desc.includes("netflix") || desc.includes("entertainment")) return "Entertainment";
    if (desc.includes("uber") || desc.includes("lyft")) return "Transport";
    return "Other";
  };
  