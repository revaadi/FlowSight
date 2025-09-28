'use client'

import { useState } from 'react'

export default function Dashboard() {
  const [forecast, setForecast] = useState<any[]>([])
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)

  const handleDelayBill = (bill: any) => {
  const newDate = new Date(bill.purchase_date)
  newDate.setDate(newDate.getDate() + 7)

  const updatedBill = { ...bill, purchase_date: newDate.toISOString().slice(0, 10) }

  const newBills = upcomingBills.map(b =>
    b === bill ? updatedBill : b
  )

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
      { ...bill, amount: half, purchase_date: date2 }
    ]

    const newBills = upcomingBills.filter(b => b !== bill).concat(splitBills)
    setUpcomingBills(newBills)
  }

  const handleForecast = async () => {
    setLoading(true)
    setError('')
    setForecast([])

    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accountId || 'acc_1' }),
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

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

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">30-Day Cash Forecast</h1>

      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Enter Account ID (e.g., acc_1)"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="border px-3 py-2 rounded mr-2 w-full"
        />
        <button
          onClick={handleForecast}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={loading || !accountId}
        >
          {loading ? 'Loading...' : 'Forecast'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 mb-4">
          ⚠️ {error}
        </div>
      )}

      {forecast.length > 0 && (
        <div className="bg-gray-100 rounded p-4">
          <h2 className="font-bold mb-2">Forecasted Balances</h2>
          <ul className="space-y-1 text-sm">
            {forecast.map((f, idx) => (
              <li key={idx}>
                <strong>{f.date}:</strong> ${f.balance}
              </li>
            ))}
          </ul>
        </div>
      )}

      {categories.length > 0 && (
        <div className="bg-gray-100 rounded p-4 mt-4">
          <h2 className="font-bold mb-2">Spending by Category</h2>
          <ul className="space-y-1 text-sm">
            {categories.map((c) => (
              <li key={c.category}>
                <strong>{c.category}:</strong> ${c.total}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcomingBills.length > 0 && (
        <div className="bg-gray-100 rounded p-4 mt-4">
          <h2 className="font-bold mb-2">Upcoming Bills</h2>
          <ul className="space-y-1 text-sm">
            {upcomingBills.map((b, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  <strong>{b.description}</strong> – ${b.amount} due {b.purchase_date}
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleDelayBill(b)}
                    className="text-blue-600 underline"
                  >
                    Delay 1w
                  </button>
                  <button
                    onClick={() => handleSplitBill(b)}
                    className="text-green-600 underline"
                  >
                    Split 2x
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}


      {summary && (
        <div className="bg-gray-100 rounded p-4 mt-4">
          <h2 className="font-bold mb-2">Cash Flow Summary</h2>
          <ul className="space-y-1 text-sm">
            <li><strong>Starting Balance:</strong> ${summary.start}</li>
            <li><strong>Total Inflows:</strong> ${summary.inflows}</li>
            <li><strong>Total Outflows:</strong> ${summary.outflows}</li>
            <li><strong>Projected End Balance:</strong> ${summary.end}</li>
          </ul>
        </div>
      )}

    </div>
  )
}
