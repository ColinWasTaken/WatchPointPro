// Small validators for form input. Each returns the cleaned value, or null when invalid.

export const cleanText = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

export function cleanEmail(v: FormDataEntryValue | null): string | null {
  const email = cleanText(v, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function cleanPhone(v: FormDataEntryValue | null): string | null {
  const phone = cleanText(v, 30);
  return /^[0-9+()\-.\sx]{7,30}$/.test(phone) ? phone : null;
}

// Accepts "example.com" or a full URL; only http(s) is allowed since the value is rendered as a link.
export function cleanWebsite(v: FormDataEntryValue | null): string | null {
  const raw = cleanText(v, 200);
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const cleanColor = (v: FormDataEntryValue | null) => {
  const c = cleanText(v, 7);
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null;
};

export const cleanZip = (v: FormDataEntryValue | null) => {
  const z = cleanText(v, 10);
  return /^\d{5}(-\d{4})?$/.test(z) ? z : null;
};

export function cleanCoordinate(v: FormDataEntryValue | null, limit: number): number | null | "invalid" {
  const raw = cleanText(v, 20);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : "invalid";
}

export const fullAddress = (p: { street: string; city: string; state: string; zip: string }) =>
  `${p.street}, ${p.city}, ${p.state} ${p.zip}`;

export const clientName = (c: { firstName: string; lastName: string }) => `${c.firstName} ${c.lastName}`.trim();
