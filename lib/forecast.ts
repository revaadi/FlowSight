// /lib/forecast.ts

interface Purchase {
  amount: number
  purchase_date: string // format: YYYY-MM-DD
}

export function forecastNext30Days(balance: number, purchases: Purchase[]) {
  const forecast: { date: string; balance: number }[] = []

  const today = new Date()
  const purchaseMap = new Map<string, number>()

  // Group purchases by date
  for (const p of purchases) {
    if (!p.purchase_date) continue
    const amt = purchaseMap.get(p.purchase_date) || 0
    purchaseMap.set(p.purchase_date, amt + p.amount)
  }

  // Build forecast for next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const dateStr = date.toISOString().slice(0, 10)
    const dailySpending = purchaseMap.get(dateStr) || 0

    if (i === 0) {
      balance -= dailySpending
    } else {
      balance -= dailySpending
    }

    forecast.push({ date: dateStr, balance: Math.max(0, +balance.toFixed(2)) })
  }

  return forecast
}
