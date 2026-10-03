// Trades people can search for, and which checklist item maps to which trade.

export type Trade = { key: string; label: string; plural: string; query: string };

export const TRADES: Trade[] = [
  { key: "hvac", label: "HVAC", plural: "HVAC contractors", query: "HVAC contractor" },
  { key: "roofing", label: "Roofing", plural: "roofers", query: "roofing contractor" },
  { key: "plumbing", label: "Plumbing", plural: "plumbers", query: "plumber" },
  { key: "electrical", label: "Electrical", plural: "electricians", query: "electrician" },
  { key: "pool", label: "Pool repair", plural: "pool repair services", query: "pool repair service" },
  { key: "generator", label: "Generator repair", plural: "generator repair services", query: "generator repair service" },
  { key: "appliance", label: "Appliance repair", plural: "appliance repair services", query: "appliance repair service" },
  { key: "windows", label: "Windows", plural: "window repair services", query: "window repair service" },
  { key: "doors", label: "Doors", plural: "door repair services", query: "door repair service" },
  { key: "locksmith", label: "Locksmith", plural: "locksmiths", query: "locksmith" },
  { key: "pest", label: "Pest control", plural: "pest control services", query: "pest control service" },
  { key: "landscaping", label: "Landscaping", plural: "landscapers", query: "landscaping service" },
  { key: "painting", label: "Painting", plural: "painters", query: "house painter" },
  { key: "water_damage", label: "Water damage", plural: "water damage restoration services", query: "water damage restoration" },
  { key: "handyman", label: "Handyman", plural: "handymen", query: "handyman" },
];

const ITEM_TRADE: Record<string, string> = {
  ac: "hvac",
  temperature: "hvac",
  humidity: "hvac",
  pool: "pool",
  generator: "generator",
  roof: "roofing",
  plumbing: "plumbing",
  appliances: "appliance",
  doors: "doors",
  windows: "windows",
  landscaping: "landscaping",
  pests: "pest",
  electrical: "electrical",
  water: "plumbing",
  other: "handyman",
};

export const findTrade = (key: string | null | undefined) => TRADES.find((t) => t.key === key);

export const tradeForItem = (itemKey: string): Trade => findTrade(ITEM_TRADE[itemKey]) ?? TRADES[TRADES.length - 1];
