'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'

export default function Dashboard() {
  const [forecast, setForecast] = useState<any[]>([])
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)

  const isEmpty = !loading && !error && !summary && forecast.length === 0

  // --- basic bill actions ---
  const handleDelayBill = (bill: any) => {
    setUpcomingBills(prev => {
      const next = prev.map(b => {
        if (b === bill) {
          const d = new Date(b.purchase_date)
          d.setDate(d.getDate() + 7)
          return { ...b, purchase_date: d.toISOString().slice(0, 10) }
        }
        return b
      })
      return next
    })
  }

  const handleSplitBill = (bill: any) => {
    setUpcomingBills(prev => {
      const half = bill.amount / 2
      const d = new Date(bill.purchase_date)
      d.setDate(d.getDate() + 7)
      const later = d.toISOString().slice(0, 10)
      const without = prev.filter(b => b !== bill)
      return without.concat(
        { ...bill, amount: half },
        { ...bill, amount: half, purchase_date: later }
      )
    })
  }

  // --- idempotent “Stay Positive Plan” used by AI coach and header button ---
  const prevBillsRef = useRef<any[] | null>(null)
  function applyStayPositivePlan() {
    setUpcomingBills(prev => {
      prevBillsRef.current = prev
      const bills = [...prev].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))

      // 1) Delay earliest bill once
      if (bills[0] && !(bills[0] as any)._delayedByPlan) {
        const d = new Date(bills[0].purchase_date)
        d.setDate(d.getDate() + 7)
        bills[0] = { ...bills[0], purchase_date: d.toISOString().slice(0, 10) } as any
        ;(bills[0] as any)._delayedByPlan = true
      }

      // 2) Split largest bill only if not already split into halves
      if (bills.length) {
        let li = 0
        for (let i = 1; i < bills.length; i++) {
          if (bills[i].amount > bills[li].amount) li = i
        }
        const largest = bills[li]
        const half = largest.amount / 2
        const sameDesc = (b: any) => b.description === largest.description
        const halves = bills.filter(b => sameDesc(b) && b.amount === half)
        if (halves.length < 2) {
          bills.splice(li, 1) // remove by index (safer than identity)
          const later = new Date(largest.purchase_date)
          later.setDate(later.getDate() + 7)
          bills.push(
            { ...largest, amount: half },
            { ...largest, amount: half, purchase_date: later.toISOString().slice(0, 10) }
          )
        }
      }

      bills.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
      return bills
    })
  }

  function undoStayPositivePlan() {
    if (prevBillsRef.current) setUpcomingBills(prevBillsRef.current)
  }

  // accept optional id so “Use acc_X” buttons always work
  const handleForecast = async (id?: string) => {
    const useId = id || accountId || 'acc_1'
    setLoading(true)
    setError('')
    setForecast([])
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: useId }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setForecast(data.forecast || [])
      setCategories(data.categories || [])
      setUpcomingBills(data.upcomingBills || [])
      setSummary(data.summary || null)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // --- presentation helpers ---
  const balances = useMemo(() => forecast.map((f: any) => Number(f.balance || 0)), [forecast])
  const start = balances[0] ?? 0
  const end = balances.at(-1) ?? 0

  const mood = cashWeather(summary)
  const ribbonColor =
    mood === 'storm'
      ? 'rgba(244,63,94,0.12)' // rose
      : mood === 'rain'
      ? 'rgba(16,185,129,0.10)' // emerald light
      : 'rgba(16,185,129,0.14)' // slightly stronger emerald

  // --- tiny AI coach tips (rule-based, fast, offline) ---
  const coachTips = useMemo(() => {
    return cashCoachAI({
      forecast,
      // Pass in what you have locally. If you later return full purchases from the API,
      // pass them here for even smarter tips.
      purchases: upcomingBills,
      summary,
    })
  }, [forecast, upcomingBills, summary])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-emerald-50/30">
      {/* subtle flowing gradient ribbon (color reacts to mood) */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-32 h-64 animate-[flow_12s_linear_infinite]"
        style={{ background: `radial-gradient(1200px 120px at 50% 50%, ${ribbonColor}, transparent 60%)` }}
      />

      {/* header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">30-Day Cash Forecast</h1>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter Account ID (e.g., acc_1)"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className={[
                'w-56 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400',
                isEmpty ? 'ring-2 ring-emerald-300 animate-[pulseRing_1.2s_ease-in-out_infinite]' : '',
              ].join(' ')}
            />
            {isEmpty && (
              <span className="hidden sm:inline-flex items-center gap-1 text-sm text-emerald-600 animate-bounce select-none pointer-events-none">
                Start here <ArrowRight className="h-7 w-7" />
              </span>
            )}
            <button
              onClick={() => handleForecast()}
              disabled={loading || !accountId}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[.98] hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Running…
                </span>
              ) : (
                'Forecast'
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 space-y-8">
        {/* Mood banner */}
        {summary && (
          <div className="w-fit animate-[fadeIn_.4s_ease] rounded-xl bg-white/70 px-3 py-2 ring-1 ring-emerald-100 flex items-center gap-2">
            <WeatherIcon
              kind={mood === 'sunny' ? 'sun' : mood === 'storm' ? 'storm' : mood === 'rain' ? 'rain' : mood === 'partly' ? 'partly' : 'rainbow'}
              className="h-6 w-6"
            />
            <span className="text-sm text-slate-600">
              Cash outlook:&nbsp;<strong className="capitalize">{mood}</strong>
            </span>
          </div>
        )}

        {isEmpty && (
          <EmptyState
            onPick={(id) => {
              setAccountId(id)
              handleForecast(id)
            }}
          />
        )}

        {summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Starting"
              value={money(summary.start)}
              icon={<WeatherIcon kind="partly" className="h-10 w-10" />}
            />
            <Stat
              label="Inflows"
              value={money(summary.inflows)}
              tone="positive"
              icon={<WeatherIcon kind="sun" className="h-10 w-10" />}
            />
            <Stat
              label="Outflows"
              value={money(summary.outflows)}
              tone="negative"
              icon={<WeatherIcon kind="rain" className="h-10 w-10" />}
            />
            <Stat
              label="Projected End"
              value={money(summary.end)}
              tone="highlight"
              icon={<WeatherIcon kind="rainbow" className="h-10 w-10" />}
            />
          </div>
        )}

        {/* --- Cash Coach (AI) --- */}
        {summary && coachTips.length > 0 && (
          <CoachCard tips={coachTips} onApplyPlan={applyStayPositivePlan} onUndo={undoStayPositivePlan} />
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {forecast.length > 0 && (
            <Card className="lg:col-span-2 animate-[fadeIn_.4s_ease-out]">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Forecasted Balances</h2>
                  <p className="text-base text-slate-500">Daily projection for the next 30 days</p>
                </div>
                <div className="text-right">
                  <Sparkline values={balances} className="h-10 w-40 text-emerald-500" />
                  <p className="mt-1 text-xs text-slate-500">
                    {money(start)} → <span className="font-medium text-slate-700">{money(end)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-base">
                  <tbody>
                    {forecast.map((f, idx) => (
                      <tr key={idx} className="even:bg-emerald-50/30">
                        <td className="px-4 py-2 font-medium text-slate-700">{f.date}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{money(f.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {categories.length > 0 && (
            <Card className="animate-[fadeIn_.4s_.05s_both]">
              <h2 className="text-xl font-semibold">Spending by Category</h2>
              <ul className="mt-4 space-y-3">
                {categories.map((c: any) => (
                  <li key={c.category} className="flex items-center justify-between text-base">
                    <span className="text-slate-600">{c.category}</span>
                    <span className="font-medium">{money(c.total)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {upcomingBills.length > 0 && (
            <Card className="lg:col-span-3 animate-[fadeIn_.4s_.1s_both]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming Bills</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applyStayPositivePlan}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                  >
                    Stay Positive Plan
                  </button>
                  <button
                    onClick={undoStayPositivePlan}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Undo
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-base">
                  <thead className="bg-emerald-50/50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Bill</th>
                      <th className="px-4 py-2 text-left font-semibold">Due</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                      <th className="px-4 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBills.map((b: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{b.description}</td>
                        <td className="px-4 py-2">{b.purchase_date}</td>
                        <td className="px-4 py-2 text-right">{money(b.amount)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDelayBill(b)}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[.98]"
                              type="button"
                            >
                              Delay 1w
                            </button>
                            <button
                              onClick={() => handleSplitBill(b)}
                              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[.98]"
                              type="button"
                            >
                              Split 2x
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* keyframes */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, .35) }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0) }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0) }
        }
        @keyframes flow { 
          0% { transform: translateX(-30%) }
          100% { transform: translateX(30%) }
        }
        @keyframes drop { 
          0% { transform: translateY(0); opacity: .9 }
          90% { opacity: .9 }
          100% { transform: translateY(12px); opacity: 0 }
        }
        @keyframes flash {
          0%, 100% { opacity: .6 }
          50% { opacity: 1 }
        }
      `}</style>
    </div>
  )
}

/* ---------- Cash weather classifier ---------- */
function cashWeather(summary: any) {
  if (!summary) return 'unknown' as const
  const delta = (summary.end ?? 0) - (summary.start ?? 0)
  const spend = summary.outflows ?? 0
  const inflow = summary.inflows ?? 0
  const vol = Math.abs(inflow - spend)

  if (delta > 800 && inflow >= spend) return 'sunny'
  if (delta > 0 && vol > 600)      return 'partly'
  if (delta <= 0 && spend > inflow && vol > 800) return 'storm'
  if (delta <= 0)                  return 'rain'
  return 'rainbow'
}

/* ---------- Empty state (three demo accounts) ---------- */
function EmptyState({ onPick }: { onPick: (id: string) => void }) {
  return (
    <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-[fadeIn_.4s_ease-out]">
      <p className="text-base sm:text-lg uppercase tracking-[0.2em] text-emerald-700/90">WELCOME</p>
      <h2 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">
        Check your cash flow for the month
      </h2>
      <p className="mt-3 text-lg text-slate-500">
        Enter an account ID above or try one of these demo accounts:
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onPick('acc_1')}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[.98]"
        >
          Use acc_1
        </button>
        <button
          onClick={() => onPick('acc_2')}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-[.98]"
        >
          Use acc_2
        </button>
        <button
          onClick={() => onPick('acc_3')}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-[.98]"
        >
          Use acc_3
        </button>
      </div>
    </section>
  )
}

/* ---------- Cash Coach (AI) ---------- */
type CoachTip = {
  title: string
  detail: string
  impact?: string
  confidence: number // 0–1
  action?: 'apply-plan' | 'none'
}

function cashCoachAI({
  forecast,
  purchases,
  summary
}: {
  forecast: { date: string; balance: number }[]
  purchases: { amount: number; description: string; isBill?: boolean; type?: 'income'|'expense'; purchase_date: string }[]
  summary: { start: number; inflows: number; outflows: number; end: number } | null
}): CoachTip[] {
  if (!summary || forecast.length === 0) return []

  const minBal = Math.min(...forecast.map(f => +f.balance || 0))
  const idxToNeg = forecast.findIndex(f => (+f.balance || 0) < 0)
  const daysToZero = idxToNeg === -1 ? Infinity : idxToNeg

  const spendByDesc = new Map<string, number>()
  const spendByCat = new Map<string, number>()
  const catOf = (d: string) => {
    const x = d.toLowerCase()
    if (x.includes('netflix') || x.includes('spotify') || x.includes('subscription')) return 'Subscriptions'
    if (x.includes('uber') || x.includes('bus') || x.includes('gas')) return 'Transport'
    if (x.includes('grocery') || x.includes('market')) return 'Groceries'
    if (x.includes('rent')) return 'Housing'
    if (x.includes('util')) return 'Utilities'
    if (x.includes('coffee') || x.includes('restaurant') || x.includes('dining') || x.includes('fast')) return 'Dining'
    return 'Other'
  }

  for (const p of purchases) {
    if (p.type === 'expense' || !p.type) {
      spendByDesc.set(p.description, (spendByDesc.get(p.description) || 0) + p.amount)
      const c = catOf(p.description)
      spendByCat.set(c, (spendByCat.get(c) || 0) + p.amount)
    }
  }

  const tips: CoachTip[] = []

  if (daysToZero !== Infinity && daysToZero <= 14) {
    tips.push({
      title: `Risk of negative balance in ${daysToZero} day${daysToZero === 1 ? '' : 's'}`,
      detail: `Your forecast dips below $0 soon (min ${money(minBal)}). Try delaying the next bill and splitting your largest bill.`,
      impact: `Raises near-term cushion via deferral & split`,
      confidence: 0.9,
      action: 'apply-plan',
    })
  }

  const likelySubs = [...spendByDesc.entries()]
    .filter(([d]) => /netflix|spotify|hulu|prime|subscription/i.test(d))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  for (const [desc, amt] of likelySubs) {
    tips.push({
      title: `Review subscription: ${desc}`,
      detail: `Recurring charge detected. Pausing or downgrading ${desc} could free up ${money(amt)} this month.`,
      impact: `+${money(amt)} cushion`,
      confidence: 0.75,
      action: 'none',
    })
  }

  const worstCat = [...spendByCat.entries()].sort((a, b) => b[1] - a[1])[0]
  if (worstCat) {
    const [cat, amt] = worstCat
    if (cat === 'Dining' || cat === 'Other') {
      const suggestedCut = Math.round(amt * 0.2 / 5) * 5 // ~20% rounded to $5
      if (suggestedCut >= 10) {
        tips.push({
          title: `Trim ${cat} by ${money(suggestedCut)} this month`,
          detail: `Set a weekly cap and auto-move leftover cash to savings.`,
          impact: `Projected end +${money(suggestedCut)}`,
          confidence: 0.65,
          action: 'none',
        })
      }
    }
  }

  if (summary.end - summary.start >= 500) {
    const safeSave = Math.min(150, Math.floor((summary.end - summary.start) * 0.25 / 25) * 25)
    if (safeSave >= 50) {
      tips.push({
        title: `Auto-save ${money(safeSave)} now`,
        detail: `You’re on track to grow cash this month. Lock in ${money(safeSave)} to a rainy-day fund.`,
        impact: `Builds emergency cushion`,
        confidence: 0.7,
        action: 'none',
      })
    }
  }

  return tips.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

function CoachCard({
  tips,
  onApplyPlan,
  onUndo,
}: {
  tips: CoachTip[]
  onApplyPlan?: () => void
  onUndo?: () => void
}) {
  if (!tips || tips.length === 0) return null
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100 animate-[fadeIn_.4s_ease]">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">AI</span>
        <h2 className="text-xl font-semibold">Cash Coach</h2>
      </div>
      <ul className="space-y-3">
        {tips.map((t, i) => (
          <li key={i} className="rounded-xl border border-emerald-100 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{t.title}</p>
              <span className="text-xs text-slate-500">conf {Math.round(t.confidence * 100)}%</span>
            </div>
            <p className="mt-1 text-slate-600">{t.detail}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-emerald-700 text-sm">{t.impact}</span>
              <div className="flex gap-2">
                {t.action === 'apply-plan' && onApplyPlan && (
                  <button
                    onClick={onApplyPlan}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Apply plan
                  </button>
                )}
                {onUndo && (
                  <button
                    onClick={onUndo}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- tiny presentational components ---------- */
function Card(props: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${props.className ?? ''}`}>
      {props.children}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'highlight'
  icon?: ReactNode
}) {
  const tones =
    tone === 'highlight'
      ? 'bg-emerald-600 text-white'
      : tone === 'positive'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : tone === 'negative'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : 'bg-white text-slate-900'
  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ${tones} flex items-center justify-between`}>
      <div>
        <p className={`text-base ${tone === 'highlight' ? 'text-white/80' : 'text-slate-500'}`}>{label}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold tabular-nums">{value}</p>
      </div>
      {icon && <div className="ml-4">{icon}</div>}
    </div>
  )
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-[2px] border-white/70 border-t-transparent" />
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values || values.length < 2) return null
  const w = 160
  const h = 40
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 6) + 3
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className}>
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    </svg>
  )
}

function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M12.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" />
    </svg>
  )
}

/* ---------- Weather icons ---------- */
function WeatherIcon({ kind, className = '' }: { kind: 'sun'|'rain'|'rainbow'|'storm'|'partly'; className?: string }) {
  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 64 64" className={className}>
        <g className="origin-center animate-[spin_8s_linear_infinite]">
          {[...Array(8)].map((_,i)=>(
            <rect key={i} x="30" y="2" width="4" height="12" rx="2" fill="#10b981" transform={`rotate(${i*45} 32 32)`}/>
          ))}
        </g>
        <circle cx="32" cy="32" r="12" fill="#34d399" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 64 64" className={className}>
        <ellipse cx="34" cy="26" rx="16" ry="10" fill="#a7f3d0"/>
        <ellipse cx="22" cy="28" rx="14" ry="9" fill="#d1fae5"/>
        {[20,28,36,44].map((x,i)=>(
          <line key={i} x1={x} y1="38" x2={x-2} y2="52" stroke="#10b981" strokeWidth="3"
                className="animate-[drop_1.2s_ease-in-out_infinite]" style={{animationDelay:`${i*0.15}s`}}/>
        ))}
      </svg>
    )
  }
  if (kind === 'rainbow') {
    return (
      <svg viewBox="0 0 64 64" className={className}>
        {['#10b981','#34d399','#6ee7b7'].map((c,i)=>(
          <path key={i} d={`M12 ${44+i*4}a20 20 0 0 1 40 0`} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"/>
        ))}
        <circle cx="49" cy="44" r="5" fill="#fff"/>
        <circle cx="15" cy="44" r="6" fill="#fff"/>
      </svg>
    )
  }
  if (kind === 'storm') {
    return (
      <svg viewBox="0 0 64 64" className={className}>
        <ellipse cx="32" cy="26" rx="18" ry="11" fill="#c7d2fe"/>
        <polygon points="28,34 22,48 30,46 25,58 40,40 32,42" fill="#ef4444"
                className="animate-[flash_1.2s_ease-in-out_infinite]" />
      </svg>
    )
  }
  // partly sunny
  return (
    <svg viewBox="0 0 64 64" className={className}>
      <circle cx="24" cy="24" r="9" fill="#fcd34d"/>
      <ellipse cx="38" cy="32" rx="16" ry="10" fill="#e5e7eb"/>
    </svg>
  )
}

/* ---------- utils ---------- */
function money(n: number | string) {
  const v = typeof n === 'string' ? Number(n) : n
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
