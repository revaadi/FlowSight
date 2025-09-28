// app/api/forecast/route.ts
import { NextRequest, NextResponse } from 'next/server'
import rawData from '@/lib/sampleData.json'
import { buildForecast, summarize, type Purchase } from '@/lib/forecast'
import { categoriesFromPurchases } from '@/lib/categories'

type Account = { id: string; balance: number; customerId: string }
type SampleData = { accounts: Account[]; purchases: Purchase[] }

// Tell TS what the JSON looks like
const data = rawData as SampleData

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { accountId?: string }
    const accountId = body?.accountId || 'acc_1'

    // Find account
    const account = data.accounts.find(a => a.id === accountId)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Filter this account’s purchases
    const purchases = data.purchases.filter(p => p.accountId === accountId)

    const today = new Date().toISOString().slice(0, 10)

    // Build pieces with your new helpers
    const forecast = buildForecast(account.balance, purchases, today, 30)
    const categories = categoriesFromPurchases(purchases)
    const upcomingBills = purchases
      .filter(p => p.isBill && p.purchase_date >= today)
      .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
    const summary = summarize(purchases, account.balance, forecast)

    return NextResponse.json({ forecast, categories, upcomingBills, summary })
  } catch (err) {
    console.error('Forecast failed:', err)
    return NextResponse.json({ error: 'Forecast failed' }, { status: 500 })
  }
}
