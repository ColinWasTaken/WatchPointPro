// What the public website says about the business. Anything marked `sample` is placeholder copy
// for previewing the design: it shows in development only and stays hidden on the live site
// until real details replace it, so made-up prices or quotes are never published.

export const showSamples = process.env.NODE_ENV !== "production";

export const BUSINESS = {
  name: "WatchPointPro",
  phone: null as string | null, // e.g. "(239) 555-0100"
  email: null as string | null, // e.g. "hello@watchpointpro.com"
};

export const PHOTOS = {
  hero: {
    src: "https://images.unsplash.com/photo-1601041597271-71988152f98b?auto=format&fit=crop&q=80&w=1400",
    alt: "A red-brick house with a white-columned porch and a freshly painted front door",
  },
  interior: {
    src: "https://images.unsplash.com/photo-1631510390389-c1e4fb20ff31?auto=format&fit=crop&q=80&w=1400",
    alt: "A quiet, sunlit living room with sheer curtains and everything in its place",
  },
  entrance: {
    src: "https://images.unsplash.com/photo-1711098256657-f40961037781?auto=format&fit=crop&q=80&w=900",
    alt: "Front entrance of a stone house with two clipped boxwood planters",
  },
  street: {
    src: "https://images.unsplash.com/photo-1779241883587-21546986f21b?auto=format&fit=crop&q=80&w=2000",
    alt: "A quiet residential street under an arch of mature trees",
  },
  // Link previews when the site is shared: the hero photo, cropped to 1200 by 630.
  share: {
    src: "https://images.unsplash.com/photo-1601041597271-71988152f98b?auto=format&fit=crop&q=80&w=1200&h=630",
    alt: "The front porch and door of a red-brick house",
  },
};

export type Plan = { name: string; visits: string; fit: string; price: { amount: number; sample: boolean } | null };

export const PLANS: Plan[] = [
  { name: "Monthly", visits: "One visit a month", fit: "For a house with a neighbor or family nearby", price: { amount: 95, sample: true } },
  { name: "Every two weeks", visits: "Two visits a month", fit: "For most homes left for the season", price: { amount: 170, sample: true } },
  { name: "Weekly", visits: "Four to five visits a month", fit: "For larger homes, pools, and insurance requirements", price: { amount: 310, sample: true } },
];

export type Testimonial = { quote: string; name: string; place: string; sample: boolean };

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "The report arrives before I’ve finished my coffee. After a winter of them I stopped checking the weather back home.",
    name: "Sample client",
    place: "Away November to April",
    sample: true,
  },
  {
    quote: "They noticed a slow drip under the guest bathroom sink, sent photos, and had a plumber in the next morning. I was two thousand miles away.",
    name: "Sample client",
    place: "Second home owner",
    sample: true,
  },
];
