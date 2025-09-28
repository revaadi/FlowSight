// /app/api/forecast/route.ts

import { NextRequest, NextResponse } from "next/server";
import rawData from "@/lib/sampleData.json";
import { forecastNext30Days } from "@/lib/forecast";
import { groupByCategory } from "@/lib/forecast";

// Define types for accounts and purchases
interface Account {
  id: string;
  balance: number;
  customerId: string;
}

interface Purchase {
  accountId: string;
  amount: number;
  purchase_date: string;
  description: string;
  isBill?: boolean;
  type?: "income" | "expense";
}

interface SampleData {
  accounts: Account[];
  purchases: Purchase[];
}

// Tell TS what rawData really is
const data: SampleData = rawData as SampleData;

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();

    // Find the account in local JSON
    const account = data.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const balance = account.balance;

    // Filter purchases for this account
    const accountPurchases = data.purchases.filter(
      (p) => p.accountId === accountId
    );

    const forecast = forecastNext30Days(balance, accountPurchases);
    const categories = groupByCategory(accountPurchases);
    const today = new Date().toISOString().slice(0, 10)
    const upcomingBills = accountPurchases.filter(
    (p) => p.isBill && p.purchase_date >= today
    )
    const inflows = accountPurchases.filter(p => p.type === "income").reduce((a,b) => a + b.amount, 0);
    const outflows = accountPurchases.filter(p => !p.type || p.type === "expense").reduce((a,b) => a + b.amount, 0);
    const summary = {
      start: account.balance,
      inflows,
      outflows,
      end: forecast[forecast.length - 1]?.balance || account.balance
    };


   return NextResponse.json({ forecast, categories, upcomingBills, summary });;
  } catch (err: any) {
    console.error("Forecast failed:", err);
    return NextResponse.json({ error: "Forecast failed" }, { status: 500 });
  }
}
