'use client'

import { useState } from 'react'

export default function Dashboard() {
  const [forecast, setForecast] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleForecast = async () => {
    setLoading(true)
    setError('')
    setForecast([])

    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: '68d836479683f20dd519695c' }),
      })
      

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const data = await res.json()
      setForecast(data.forecast || [])
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
          placeholder="Enter Customer ID"
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
          className="border px-3 py-2 rounded mr-2 w-full"
        />
        <button
          onClick={handleForecast}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={loading || !customerId}
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
    </div>
  )
}
