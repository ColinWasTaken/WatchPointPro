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
};

// Items a company added itself (or the standard "Other", renamed) have no fixed trade, so it's
// guessed from the item's name. The first match wins: "Pool leak" is pool repair, "Water heater"
// is plumbing, "Freezer temperature" is appliance repair.
const NAME_TRADE: [RegExp, string][] = [
  [/mold|mildew|flood/i, "water_damage"],
  [/pool|\bspa\b|hot tub|jacuzzi/i, "pool"],
  [/plumb|leak|water heater|toilet|faucet|sink|shower|\btub\b|pipe|drain|sewer|septic|softener|\bwell\b/i, "plumbing"],
  [/generator/i, "generator"],
  [/appliance|fridge|refrigerator|freezer|wine cooler|dishwasher|washer|dryer|oven|stove|\brange\b|ice maker|microwave/i, "appliance"],
  [/\bac\b|a\/c|hvac|air condition|thermostat|furnace|heat pump|\bducts?\b|humidi|temperature/i, "hvac"],
  [/roof|gutter|chimney|skylight/i, "roofing"],
  [/electric|breaker|outlet|wiring|\blights?\b|lighting|smoke (detector|alarm)|carbon monoxide/i, "electrical"],
  [/window|shutter|screen|glass/i, "windows"],
  [/\blocks?\b|lockbox|deadbolt/i, "locksmith"],
  [/door|gate/i, "doors"],
  [/pest|termite|rodent|mouse|mice|insect|\bants?\b|\bbugs?\b/i, "pest"],
  [/lawn|landscap|garden|irrigation|sprinkler|\btrees?\b|yard|\bplants?\b|hedge/i, "landscaping"],
  [/paint|stucco/i, "painting"],
];

export const findTrade = (key: string | null | undefined) => TRADES.find((t) => t.key === key);

export const tradeForItem = (itemKey: string, name?: string | null): Trade =>
  findTrade(ITEM_TRADE[itemKey] ?? NAME_TRADE.find(([pattern]) => name && pattern.test(name))?.[1]) ?? TRADES[TRADES.length - 1];
