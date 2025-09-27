// lib/categories.ts

export type Bill = {
    id: string;
    merchant: string;
    amount: number;
    nextDate: string;
    flexible?: boolean;
    category?: string;
  };
  
  export type CategoryRow = {
    category: string;
    total: number;
    count: number;
  };
  
  function norm(s: string) {
    return (s || "")
      .toLowerCase()
      .replace(/[\.\-_,']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  /**
   * Map a merchant/payee to a category.
   * Add/adjust rules as you see more data.
   */
  export function categorize(merchant: string): string {
    const m = norm(merchant);
  
    // Telecom / Internet / Cable
    if (
      /\b(verizon|at&t|att|t[-\s]?mobile|tmobile|sprint|wireless)\b/.test(m) ||
      /\b(comcast|xfinity|spectrum|cox|centurylink|cable|internet|broadband)\b/.test(m)
    ) return "Telecom";
  
    // Utilities (power, water, gas)
    if (
      /\b(power|electric|electricity|utility|utilities|water|sewer|gas)\b/.test(m) ||
      /\b(dominion|georgia power|washington gas|dc water|pepc o|coned|pg&e|pge)\b/.test(m)
    ) return "Utilities";
  
    // Debt / Credit
    if (/\b(credit\s*card|loan|mortgage|auto\s*loan|student\s*loan|debt|financ(e|ing))\b/.test(m))
      return "Debt";
  
    // Subscriptions / Streaming
    if (/\b(netflix|spotify|hulu|disney\+?|max|hbomax|youtube premium|apple music|prime video)\b/.test(m))
      return "Subscriptions";
  
    // Housing / Rent
    if (/\b(rent|landlord|property\s*management|apartment|mortgage)\b/.test(m))
      return "Housing";
  
    // Insurance
    if (/\b(insurance|geico|state farm|allstate|progressive|usaa)\b/.test(m))
      return "Insurance";
  
    // Transportation
    if (/\b(uber|lyft|gasoline|fuel|shell|chevron|exxon|metro|transit|parking|toll)\b/.test(m))
      return "Transportation";
  
    // Groceries
    if (/\b(whole foods|trader joe'?s|kroger|safeway|albertsons|publix|heb|costco|sam'?s club|aldi)\b/.test(m))
      return "Groceries";
  
    // Dining
    if (/\b(starbucks|mcdonald'?s|chipotle|chick[-\s]?fil[-\s]?a|doordash|ubereats|grubhub|restaurant|cafe)\b/.test(m))
      return "Dining";
  
    // Health
    if (/\b(pharmacy|walgreens|cvs|rite aid|clinic|hospital|dental|vision)\b/.test(m))
      return "Health";
  
    // Shopping / Retail
    if (/\b(amazon|walmart|target|best buy|ikea|home depot|lowe'?s)\b/.test(m))
      return "Shopping";
  
    // Travel
    if (/\b(airlines?|hotel|marriott|hilton|airbnb|booking\.com|expedia)\b/.test(m))
      return "Travel";
  
    // Fallbacks based on very generic merchant names
    if (/misc|miscellaneous/.test(m)) return "Other";
    if (/credit\s*card/.test(m)) return "Debt";
    if (/cable/.test(m)) return "Telecom";
    if (/power|utility|water|gas/.test(m)) return "Utilities";
  
    return "Other";
  }
  
  /** Sum up totals per category from an array of bills that already have `category` */
  export function rollupCategories(items: Bill[]): CategoryRow[] {
    const buckets = new Map<string, { total: number; count: number }>();
    for (const it of items) {
      const cat = it.category || "Other";
      const b = buckets.get(cat) || { total: 0, count: 0 };
      b.total += Number(it.amount) || 0;
      b.count += 1;
      buckets.set(cat, b);
    }
    return Array.from(buckets, ([category, v]) => ({ category, total: v.total, count: v.count }));
  }
  