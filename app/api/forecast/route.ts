// /app/api/forecast/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { forecastNext30Days } from '@/lib/forecast'

const NESSIE_API_KEY = process.env.NESSIE_API_KEY
const BASE_URL = 'http://api.nessieisreal.com'

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json()

    // Fetch account data
    const accountRes = await fetch(
      `${BASE_URL}/accounts/${accountId}?key=${NESSIE_API_KEY}`
    )
    const account = await accountRes.json()
    const balance = account?.balance || 0

    // Fetch purchases
    const purchasesRes = await fetch(
      `${BASE_URL}/accounts/${accountId}/purchases?key=${NESSIE_API_KEY}`
    )
    const purchasesRaw = await purchasesRes.json()
    const purchases = Array.isArray(purchasesRaw) ? purchasesRaw : []

    // Forecast
    const forecast = forecastNext30Days(balance, purchases)

    return NextResponse.json({ forecast })
  } catch (err: any) {
    console.error('Forecast failed:', err)
    return NextResponse.json({ error: 'Forecast failed' }, { status: 500 })
  }
}
