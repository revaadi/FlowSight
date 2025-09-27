export const categorize = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes("grocery")) return "Groceries";
    if (desc.includes("rent")) return "Rent";
    if (desc.includes("utilities")) return "Utilities";
    if (desc.includes("netflix") || desc.includes("entertainment")) return "Entertainment";
    if (desc.includes("uber") || desc.includes("lyft")) return "Transport";
    return "Other";
  };
  