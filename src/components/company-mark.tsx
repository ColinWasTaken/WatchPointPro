import Image from "next/image";
import { Building2 } from "lucide-react";
import { brandOf, initials } from "@/lib/brand";

type Company = { name: string; logoUrl: string | null; brandColor?: string | null };

const SIZES = {
  xs: { px: 20, box: "h-5 w-5 rounded-md text-[9px]", icon: "h-3 w-3" },
  md: { px: 44, box: "h-11 w-11 rounded-2xl text-sm", icon: "h-5 w-5" },
  lg: { px: 64, box: "h-16 w-16 rounded-2xl text-xl", icon: "h-7 w-7" },
};

// How a company appears to its homeowners: its logo, or its initials on its brand color, or a
// building if it has neither. Always shown next to the company's name, so it's decorative.
export function CompanyMark({ company, size = "md" }: { company: Company; size?: keyof typeof SIZES }) {
  const { px, box, icon } = SIZES[size];
  if (company.logoUrl) {
    return <Image src={company.logoUrl} alt="" width={px} height={px} className={`${box} shrink-0 object-cover`} />;
  }
  const brand = brandOf(company.brandColor);
  if (brand) {
    return (
      <span aria-hidden className={`${box} flex shrink-0 items-center justify-center font-bold`} style={{ backgroundColor: brand.color, color: brand.ink }}>
        {initials(company.name)}
      </span>
    );
  }
  return (
    <span aria-hidden className={`${box} flex shrink-0 items-center justify-center bg-accent-soft text-accent`}>
      <Building2 className={icon} strokeWidth={1.75} />
    </span>
  );
}
