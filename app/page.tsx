'use client'

import { useMemo, useState, type ReactNode } from 'react'

export default function Dashboard() {
  const [forecast, setForecast] = useState<any[]>([])
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)

  const isEmpty = !loading && !error && !summary && forecast.length === 0

  const handleDelayBill = (bill: any) => {
    const newDate = new Date(bill.purchase_date)
    newDate.setDate(newDate.getDate() + 7)
    const updatedBill = { ...bill, purchase_date: newDate.toISOString().slice(0, 10) }
    const newBills = upcomingBills.map(b => (b === bill ? updatedBill : b))
    setUpcomingBills(newBills)
  }

  const handleSplitBill = (bill: any) => {
    const half = bill.amount / 2
    const date1 = bill.purchase_date
    const newDate = new Date(bill.purchase_date)
    newDate.setDate(newDate.getDate() + 7)
    const date2 = newDate.toISOString().slice(0, 10)
    const splitBills = [
      { ...bill, amount: half, purchase_date: date1 },
      { ...bill, amount: half, purchase_date: date2 },
    ]
    const newBills = upcomingBills.filter(b => b !== bill).concat(splitBills)
    setUpcomingBills(newBills)
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
              <h2 className="text-xl font-semibold">Upcoming Bills</h2>
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

/* ---------- Empty state (now with THREE demo accounts) ---------- */
function EmptyState({ onPick }: { onPick: (id: string) => void }) {
  return (
    <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-[fadeIn_.4s_ease-out]">
      <p className="text-base sm:text-lg uppercase tracking-[0.2em] text-emerald-700/90">Welcome</p>
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
