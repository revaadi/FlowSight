const BASE_URL = "https://api.reimaginebanking.com";
const API_KEY = process.env.NESSIE_API_KEY || "";
const MODE = process.env.NESSIE_MODE || "customer";

const get = async (path: string) => {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed GET ${path}`);
  return res.json();
};
export async function getAccountBalance(accountId: string): Promise<number> {
    const res = await fetch(`http://api.nessieisreal.com/accounts/${accountId}?key=${process.env.NESSIE_API_KEY}`);
    const data = await res.json();
    return data.balance;
  }
  
  export async function getAccountPurchases(accountId: string) {
    const res = await fetch(`http://api.nessieisreal.com/accounts/${accountId}/purchases?key=${process.env.NESSIE_API_KEY}`);
    const data = await res.json();
    return data;
  }
  
export const getCustomerAccounts = (customerId: string) =>
  get(`${MODE}s/${customerId}/accounts`);

export const getCustomerBills = (customerId: string) =>
  get(`${MODE}s/${customerId}/bills`);

export const getCustomerPurchases = async (customerId: string) => {
  const accounts = await getCustomerAccounts(customerId);
  const allPurchases = await Promise.all(
    accounts.map((acc: any) => get(`accounts/${acc._id}/purchases`).catch(() => []))
  );
  return allPurchases.flat();
};
