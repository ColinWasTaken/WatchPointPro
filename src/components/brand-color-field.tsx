"use client";

import { useEffect, useRef, useState } from "react";
import { brandOf } from "@/lib/brand";
import { CompanyMark } from "./company-mark";

const inputClass = "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";

// The brand color in company settings: a picker and the hex code kept in step, and a preview of
// the letterhead homeowners see on reports and emails. The hex field is what's submitted.
export function BrandColorField({ defaultValue, companyName, logoUrl }: { defaultValue: string; companyName: string; logoUrl: string | null }) {
  const [value, setValue] = useState(defaultValue);
  const hex = useRef<HTMLInputElement>(null);
  const brand = brandOf(value);

  // React resets the form after it's submitted; follow the field back to whatever it shows then.
  useEffect(() => {
    const form = hex.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => setValue(hex.current?.value ?? ""));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const set = (next: string) => {
    if (hex.current) hex.current.value = next;
    setValue(next);
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="brandColor" className="font-semibold text-ink">
        Brand color
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={brand?.color ?? "#3e5a49"}
          onChange={(e) => set(e.target.value)}
          aria-label="Pick a brand color"
          className="h-11 w-12 shrink-0 cursor-pointer rounded-2xl border border-border bg-background p-1"
        />
        <input
          ref={hex}
          id="brandColor"
          name="brandColor"
          defaultValue={defaultValue}
          onInput={(e) => setValue(e.currentTarget.value)}
          placeholder="#3e5a49"
          pattern="#[0-9a-fA-F]{6}"
          title="A color code like #3e5a49"
          className={`${inputClass} min-w-0 flex-1`}
        />
        {value && (
          <button type="button" onClick={() => set("")} className="shrink-0 px-2 font-semibold text-ink-muted hover:text-accent">
            Clear
          </button>
        )}
      </div>
      <p className="text-ink-muted">Homeowners see it on their reports and emails, with your logo or your initials.</p>
      <div aria-hidden className="mt-1 rounded-2xl bg-background p-3">
        {brand && <div className="mb-3 h-1.5 rounded-full" style={{ backgroundColor: brand.color }} />}
        <div className="flex items-center gap-3">
          <CompanyMark company={{ name: companyName, logoUrl, brandColor: brand?.color }} />
          <div>
            <p className="font-bold text-ink">{companyName}</p>
            <p className="text-xs text-ink-muted">Powered by WatchPointPro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
