// A company's brand color, made safe to show to its homeowners. Anything written on the color is
// in white or black, whichever contrasts more, so even a pale yellow brand stays readable: the
// better of the two is always at least 4.58:1, above the 4.5:1 that small text needs.

export type Brand = { color: string; ink: string };

const WHITE = "#ffffff";
const BLACK = "#000000";

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

// WCAG contrast ratio between two #rrggbb colors, from 1 to 21.
export const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

export function brandOf(color: string | null | undefined): Brand | null {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  const c = color.toLowerCase();
  return { color: c, ink: contrast(c, WHITE) >= contrast(c, BLACK) ? WHITE : BLACK };
}

// "Coastal Home Watch" → "CH", "Acme" → "A".
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("") || "?";
