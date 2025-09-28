// lib/forecast.ts

export type Purchase = {
  accountId: string
  amount: number
  purchase_date: string // YYYY-MM-DD
  description: string
  isBill?: boolean
  type: 'income' | 'expense'
}

export function buildForecast(
  startBalance: number,
  purchases: Purchase[],
  startDate: string,
  days = 30
) {
  const byDate = new Map<string, number>()
  for (const p of purchases) {
    const amt = p.type === 'income' ? +p.amount : -Math.abs(+p.amount)
    byDate.set(p.purchase_date, (byDate.get(p.purchase_date) || 0) + amt)
  }

  const day = new Date(startDate)
  const out: { date: string; balance: number }[] = []
  let bal = startBalance
  for (let i = 0; i < days; i++) {
    const key = day.toISOString().slice(0, 10)
    bal += byDate.get(key) || 0
    out.push({ date: key, balance: +bal.toFixed(2) })
    day.setDate(day.getDate() + 1)
  }
  return out
}

export function summarize(
  purchases: Purchase[],
  start: number,
  forecast: { balance: number }[]
) {
  const inflows = purchases.filter(p => p.type === 'income').reduce((s, p) => s + p.amount, 0)
  const outflows = purchases.filter(p => p.type === 'expense').reduce((s, p) => s + p.amount, 0)
  const end = forecast.at(-1)?.balance ?? start
  return { start, inflows, outflows, end }
}

export function analyzeForecast(forecast: { date: string; balance: number }[]) {
  if (!forecast.length) return { safe: 0, runway: 0, min: 0 }
  const next7 = forecast.slice(0, 7).map(f => +f.balance || 0)
  const safe = Math.max(0, Math.min(...next7))
  let runway = forecast.length
  for (let i = 0; i < forecast.length; i++) {
    if ((+forecast[i].balance || 0) < 0) { runway = i; break }
  }
  const min = Math.min(...forecast.map(f => +f.balance || 0))
  return { safe, runway, min }
}

// one-tap plan: delay next bill 1w + split largest bill
export function planStayPositive(bills: Purchase[]) {
  let working = [...bills].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))

  if (working[0]) {
    const d = new Date(working[0].purchase_date)
    d.setDate(d.getDate() + 7)
    working[0] = { ...working[0], purchase_date: d.toISOString().slice(0, 10) }
  }

  const largest = [...working].sort((a, b) => b.amount - a.amount)[0]
  if (largest) {
    const half = largest.amount / 2
    const d = new Date(largest.purchase_date); d.setDate(d.getDate() + 7)
    const later = d.toISOString().slice(0, 10)
    working = working.filter(b => b !== largest).concat(
      { ...largest, amount: half },
      { ...largest, amount: half, purchase_date: later }
    )
  }
  return working
}
