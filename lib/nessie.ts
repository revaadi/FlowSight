// lib/nessie.ts

const BASE = process.env.NESSIE_BASE!;
const KEY  = process.env.NESSIE_KEY!;
const MODE = (process.env.NESSIE_MODE || "customer").toLowerCase() === "enterprise" ? "enterprise" : "customer";

function buildUrl(path: string, params?: Record<string, string | number>) {
  if (!BASE || !KEY) throw new Error("NESSIE_BASE / NESSIE_KEY missing");
  const u = new URL(BASE.replace(/\/$/, "") + path);
  u.searchParams.set("key", KEY);
  if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u;
}

// small helper to normalize arrays (unwrap {results: [...]})
function toArray(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.results)) return x.results;
  if (x && Array.isArray(x.data)) return x.data;
  return [];
}

async function nget(path: string, params?: Record<string, string | number>) {
  const url = buildUrl(path, params);
  const res = await fetch(url.toString(), { cache: "no-store" } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Nessie HTTP error:", res.status, url.toString(), text.slice(0, 200));
    throw new Error(`Nessie GET ${url.pathname} ${res.status} ${text}`);
  }
  const data = await res.json().catch(() => null);
  return data;
}

/** Customers */
export function listCustomers() {
  return MODE === "enterprise" ? nget("/enterprise/customers") : nget("/customers");
}

/** Accounts for a customer */
export async function listAccounts(customerId: string) {
  if (MODE === "enterprise") {
    const data = await nget("/enterprise/accounts", { customer_id: customerId });
    return toArray(data);
  }
  const data = await nget(`/customers/${encodeURIComponent(customerId)}/accounts`);
  return toArray(data);
}

/**
 * Purchases (spend) for an account (robust with fallbacks)
 * enterprise:  /enterprise/purchases?account_id=...
 * customer:    /accounts/:id/purchases
 * fallback enterprise: /enterprise/transactions?account_id=... OR /enterprise/withdrawals?account_id=...
 */
export async function listPurchases(accountId: string) {
  if (MODE === "enterprise") {
    // Try purchases (preferred)
    try {
      const data = await nget("/enterprise/purchases", { account_id: accountId });
      const arr = toArray(data);
      if (arr.length) return arr;
    } catch (e) {
      // continue to fallback
    }
    // Fallback 1: transactions (some Nessie deployments use this collection)
    try {
      const data = await nget("/enterprise/transactions", { account_id: accountId });
      const arr = toArray(data);
      if (arr.length) return arr.map((t: any) => ({ amount: Math.abs(Number(t.amount || 0)) }));
    } catch (e) {
      // continue to fallback
    }
    // Fallback 2: withdrawals (another spend-like stream)
    try {
      const data = await nget("/enterprise/withdrawals", { account_id: accountId });
      const arr = toArray(data);
      if (arr.length) return arr.map((w: any) => ({ amount: Math.abs(Number(w.amount || 0)) }));
    } catch (e) {
      // give up to empty
    }
    return [];
  }

  // Customer mode: nested resource exists
  const data = await nget(`/accounts/${encodeURIComponent(accountId)}/purchases`);
  return toArray(data);
}

/** Bills for a customer */
export async function listBills(customerId: string) {
  if (MODE === "enterprise") {
    const data = await nget("/enterprise/bills", { customer_id: customerId });
    return toArray(data);
  }
  const data = await nget(`/customers/${encodeURIComponent(customerId)}/bills`);
  return toArray(data);
}
