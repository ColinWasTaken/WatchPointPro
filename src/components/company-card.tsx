import { Globe, Mail, Phone } from "lucide-react";
import { brandOf } from "@/lib/brand";
import { CompanyMark } from "./company-mark";

type Company = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

// The home-watch company that manages a homeowner's property, and how to reach them.
export function CompanyCard({ company }: { company: Company }) {
  const linkClass = "flex items-center gap-1.5 hover:text-accent";
  const brand = brandOf(company.brandColor);
  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm ${brand ? "border-l-4" : ""}`}
      style={brand ? { borderLeftColor: brand.color } : undefined}
    >
      <CompanyMark company={company} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-muted">Your home-watch company</p>
        <p className="font-bold text-ink">{company.name}</p>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-ink-muted">
          {company.phone && (
            <a href={`tel:${company.phone}`} className={linkClass}>
              <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {company.phone}
            </a>
          )}
          {company.email && (
            <a href={`mailto:${company.email}`} className={`${linkClass} break-all`}>
              <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {company.email}
            </a>
          )}
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
              <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
