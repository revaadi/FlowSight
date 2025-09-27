// app/api/forecast/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listCustomers, listAccounts, listPurchases, listBills } from "@/lib/nessie";
import { buildForecast } from "@/lib/forecast";
import { categorize, rollupCategories } from "@/lib/categories"; // ← NEW

// Unwrap helper in case any endpoint returns { results: [...] }
const toArray = (x: any) =>
  Array.isArray(x) ? x : (x && Array.isArray(x.results) ? x.results : []);

/**
 * GET /api/forecast
 * - Picks a customer (env > customers list)
 * - Selects an account (prefer Checking)
 * - Estimates daily spend from recent purchases
 * - Pulls bills
 * - Returns a 30-day balance forecast with risk window
 * - ALSO returns category rollups
 */
export async function GET() {
  try {
    // 1) Prefer explicit customer id from env
    let customerId = (process.env.NESSIE_CUSTOMER_ID || "").trim();

    // 2) If not provided, try listing customers
    if (!customerId) {
      const customers = toArray(await listCustomers().catch(() => []));
      if (customers.length) {
        customerId = customers[0]._id || customers[0].id || "";
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No customers available for this key." },
        { status: 404 }
      );
    }

    // 3) Accounts for that customer (prefer a Checking account)
    const accounts = toArray(await listAccounts(customerId));
    if (!accounts.length) {
      return NextResponse.json(
        { error: "No accounts found for this customer." },
        { status: 404 }
      );
    }

    const checking =
      accounts.find((a: any) =>
        /checking/i.test(String(a?.type || a?.nickname || ""))
      ) || accounts[0];

    const accountId = checking._id || checking.id;
    const currentBalance = Number(checking?.balance ?? 1000);

    // 4) Daily spend estimate from recent purchases (positive numbers = spend)
    const purchases = toArray(await listPurchases(accountId));
    const outflows = purchases
      .map((p: any) => Number(p.amount ?? p.purchase_amount ?? 0))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    const dailySpendAvg = outflows.length
      ? Math.max(
          10,
          Math.min(
            80,
            outflows.reduce((a: number, b: number) => a + b, 0) /
              Math.max(1, outflows.length)
          )
        )
      : 25;

    // 5) Upcoming bills
    const rawBills = toArray(await listBills(customerId));
    const upcoming = rawBills
      .filter((b: any) =>
        /pending|upcoming|recurring/i.test(String(b?.status || "pending"))
      )
      .map((b: any) => ({
        id: b._id || b.id,
        merchant: b.payee || b.nickname || "Bill",
        amount: Number(b.payment_amount ?? b.amount ?? 0),
        nextDate: String(
          (b.payment_date || b.due_date || new Date().toISOString().slice(0, 10)).slice(
            0,
            10
          )
        ),
        flexible: /utility|subscription|phone|internet|stream/i.test(
          String(b.payee || "").toLowerCase()
        ),
      }));

    // 6) NEW: tag with category + category rollup
    const upcomingWithCategory = upcoming.map((b: any)  => ({
      ...b,
      category: categorize(b.merchant),
    }));
    const categories = rollupCategories(upcomingWithCategory);

    // 7) Build forecast using categorized bills
    const forecast = buildForecast(currentBalance, dailySpendAvg, upcomingWithCategory);

    // 8) Include categories in the response
    return NextResponse.json({
      ...forecast,
      categories,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Nessie error" },
      { status: 500 }
    );
  }
}
