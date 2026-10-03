import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Hanken_Grotesk, Libre_Caslon_Display, Libre_Caslon_Text } from "next/font/google";
import { auth } from "@/auth";
import { BookingForm } from "@/components/site/booking-form";
import { VisitReportSpecimen } from "@/components/site/visit-report";
import { BUSINESS, PHOTOS, PLANS, TESTIMONIALS, showSamples } from "@/components/site/content";

const display = Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--font-site-display" });
const caslon = Libre_Caslon_Text({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-site-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-site-sans" });

const TITLE = `${BUSINESS.name}: home watch while you’re away`;
const DESCRIPTION =
  "While you’re away, we visit your home on the schedule you choose, look after it inside and out, and send a full report with photos after every visit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: PHOTOS.share.src, width: 1200, height: 630, alt: PHOTOS.share.alt }],
  },
  twitter: { card: "summary_large_image" },
};

const SERVICES = [
  { name: "Scheduled home checks", text: "Visits inside and out on the schedule you choose: weekly, every other week, or monthly." },
  { name: "After storms and outages", text: "An extra visit after severe weather or a power cut, to make sure everything came through." },
  { name: "Arriving and leaving", text: "We open the house before you return and close it down properly when you go." },
  { name: "Contractors and deliveries", text: "We let in the plumber, the cleaner, or the pool service, stay while they work, and lock up after." },
  { name: "Keys and access", text: "Your keys stay with us, labeled and kept safe, so someone can always get in when it matters." },
];

const VISIT = [
  { time: "9:00", title: "We arrive when we said we would", text: "Every visit is booked ahead, so you always know when someone was at the house." },
  { time: "9:05", title: "Around the outside", text: "Roof line, gutters, windows, doors, the garden and pool, and anything left on the doorstep." },
  { time: "9:15", title: "Through every room", text: "Ceilings and floors for water, windows for drafts or damage, corners for signs of pests." },
  { time: "9:35", title: "Systems and climate", text: "AC and thermostat, indoor temperature and humidity, the water heater. Taps run and toilets flushed." },
  { time: "9:45", title: "Locking up", text: "Doors and windows checked twice, the alarm set, and your keys back in safekeeping." },
  { time: "9:50", title: "Your report", text: "Photos, readings, and notes in your inbox before we’ve left the street." },
];

const INCLUDED = [
  "The date, the time, and who visited",
  "Every room and system, marked good or flagged",
  "Indoor temperature and humidity, so you can see the trend",
  "Photos of anything unusual, and of the house as you left it",
  "Anything that needs attention, with what we recommend",
  "A history of every visit in your client account",
];

function SampleNote() {
  return (
    <p className="mt-6 text-[13px] text-[#8a6420]">
      Sample content for this preview. It&rsquo;s hidden on the live site until real details replace it.
    </p>
  );
}

export default async function HomePage() {
  const session = await auth();
  const plans = PLANS.map((p) => ({ ...p, price: p.price && (!p.price.sample || showSamples) ? p.price : null }));
  const testimonials = TESTIMONIALS.filter((t) => !t.sample || showSamples);
  const container = "mx-auto w-full max-w-[1180px] px-6 md:px-10";

  return (
    <div className={`${display.variable} ${caslon.variable} ${sans.variable} site min-h-screen bg-paper font-site text-harbor antialiased`}>
      <header className={`${container} flex items-center justify-between py-6`}>
        <a href="#top" className="font-display text-[22px] text-harbor">
          {BUSINESS.name}
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-8 text-[15px] text-slate-text lg:flex">
          <a href="#services" className="hover:text-harbor">Services</a>
          <a href="#visit" className="hover:text-harbor">A visit</a>
          <a href="#report" className="hover:text-harbor">Reports</a>
          <a href="#plans" className="hover:text-harbor">Plans</a>
          <a href="#contact" className="hover:text-harbor">Contact</a>
        </nav>
        <Link
          href={session ? "/dashboard" : "/login"}
          className="rounded-full border border-hairline px-4 py-2 text-[14px] text-harbor transition-colors hover:border-harbor"
        >
          {session ? "Your dashboard" : "Client sign in"}
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section id="top" className={`${container} grid items-center gap-12 pb-24 pt-6 lg:grid-cols-12 lg:gap-16 lg:pb-32 lg:pt-10`}>
          <div className="lg:col-span-6">
            <h1 className="site-rise font-display text-[46px] leading-[1.04] text-balance text-harbor sm:text-[60px] lg:text-[72px]">
              Your home, watched like it&rsquo;s our own.
            </h1>
            <p className="site-rise mt-8 max-w-[33rem] text-[19px] leading-[1.65] text-slate-text" style={{ animationDelay: "150ms" }}>
              While you&rsquo;re away, we visit on the schedule you choose, look after the house inside and out, and send you a
              full report with photos before we&rsquo;ve left the street.
            </p>
            <div className="site-rise mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ animationDelay: "300ms" }}>
              <a
                href="#contact"
                className="rounded-full bg-boxwood px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-boxwood-deep"
              >
                Book a consultation
              </a>
              <a href="#report" className="text-[16px] text-harbor underline decoration-hairline underline-offset-[6px] transition-colors hover:decoration-harbor">
                See a sample report
              </a>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="site-reveal relative aspect-[4/5] overflow-hidden bg-mist">
              <Image src={PHOTOS.hero.src} alt={PHOTOS.hero.alt} fill priority sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-6 border-t border-hairline">
          <div className={`${container} grid gap-12 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">What we look after</h2>
              <p className="mt-6 max-w-[30rem] text-[18px] leading-[1.65] text-pretty text-slate-text">
                Everything a good neighbor would do while you&rsquo;re gone, done properly and written down.
              </p>
              <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden bg-mist lg:block">
                <Image src={PHOTOS.interior.src} alt={PHOTOS.interior.alt} fill sizes="440px" className="object-cover" />
              </div>
            </div>
            <dl className="m-0 lg:col-span-7 lg:pt-3">
              {SERVICES.map((s) => (
                <div key={s.name} className="border-b border-hairline py-7 first:pt-0">
                  <dt className="font-caslon text-[23px] leading-snug text-harbor">{s.name}</dt>
                  <dd className="m-0 mt-2 max-w-[36rem] text-[17px] leading-[1.65] text-pretty text-slate-text">{s.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* A visit, in order */}
        <section id="visit" className="scroll-mt-6 bg-mist">
          <div className={`${container} grid gap-12 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32`}>
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-12">
                <h2 className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">A visit, start to finish</h2>
                <p className="mt-6 max-w-[30rem] text-[18px] leading-[1.65] text-pretty text-slate-text">
                  The same careful routine every time, in the order we do it. A typical morning looks like this.
                </p>
              </div>
            </div>
            {/* On phones the time sits above each step; from sm up it moves into its own column left of the line. */}
            <ol className="m-0 list-none p-0 lg:col-span-7 lg:pt-3">
              {VISIT.map((step, i) => (
                <li
                  key={step.time}
                  className={`relative ml-1 border-l border-hairline pl-7 sm:ml-[7.5rem] sm:pl-8 ${i === VISIT.length - 1 ? "pb-0" : "pb-10"}`}
                >
                  <span className="absolute -left-[5px] top-[0.6rem] h-[9px] w-[9px] rounded-full bg-boxwood" aria-hidden />
                  <span className="block font-caslon text-[17px] tabular-nums text-boxwood sm:absolute sm:-left-[7.5rem] sm:top-1 sm:text-[18px]">
                    {step.time}
                  </span>
                  <h3 className="mt-1 font-caslon text-[22px] leading-snug text-balance text-harbor sm:mt-0">{step.title}</h3>
                  <p className="mt-2 max-w-[34rem] text-[17px] leading-[1.65] text-pretty text-slate-text">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The report */}
        <section id="report" className="scroll-mt-6">
          <div className={`${container} grid gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">After every visit, a full report</h2>
              <p className="mt-6 max-w-[30rem] text-[18px] leading-[1.65] text-pretty text-slate-text">
                You shouldn&rsquo;t have to wonder how the house is doing. Each report tells you plainly, with the evidence
                attached.
              </p>
              <ul className="mt-10 list-none space-y-4 p-0">
                {INCLUDED.map((item) => (
                  <li key={item} className="grid grid-cols-[1.25rem_1fr] gap-3 text-[17px] leading-[1.55] text-harbor">
                    <span className="mt-[0.7rem] h-px w-3 bg-boxwood" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7">
              <VisitReportSpecimen />
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="scroll-mt-6 border-t border-hairline">
          <div className={`${container} py-24 lg:py-32`}>
            <h2 className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">Plans</h2>
            <p className="mt-6 max-w-[38rem] text-[18px] leading-[1.65] text-pretty text-slate-text">
              Every plan includes the full visit, the report, a check after any storm, and keeping your keys. You choose how
              often we come by.
            </p>
            <div className="mt-14 grid border-t border-harbor/80 md:grid-cols-3">
              {plans.map((p, i) => (
                <div key={p.name} className={`border-b border-hairline py-8 md:border-b-0 md:py-10 ${i > 0 ? "md:border-l md:pl-10" : ""} md:pr-10`}>
                  <h3 className="font-caslon text-[26px] text-harbor">{p.name}</h3>
                  <p className="mt-1 text-[16px] text-slate-text">{p.visits}</p>
                  {p.price && (
                    <p className="mt-8 font-display text-[40px] leading-none text-harbor">
                      ${p.price.amount}
                      <span className="ml-1 font-site text-[16px] text-slate-text">a month</span>
                    </p>
                  )}
                  <p className="mt-6 text-[16px] leading-[1.6] text-slate-text">{p.fit}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 max-w-[38rem] text-[17px] leading-[1.65] text-pretty text-slate-text">
              {plans.some((p) => p.price)
                ? "A larger property, a longer absence, or something unusual? "
                : "Prices depend on the house and what it needs, so we quote after a walkthrough. "}
              <a href="#contact" className="text-harbor underline decoration-hairline underline-offset-[5px] hover:decoration-harbor">
                Tell us about the house
              </a>{" "}
              and we&rsquo;ll put a plan together.
            </p>
            {plans.some((p) => p.price?.sample) && <SampleNote />}
          </div>
        </section>

        {/* What clients say */}
        {testimonials.length > 0 && (
          <section aria-labelledby="clients" className="bg-mist">
            <div className={`${container} py-24 lg:py-28`}>
              <h2 id="clients" className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">
                From the people whose keys we hold
              </h2>
              <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-16">
                {testimonials.map((t) => (
                  <figure key={t.quote} className="m-0">
                    <blockquote className="m-0 -indent-[0.42em] font-caslon text-[23px] leading-[1.55] text-pretty text-harbor">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="mt-5 text-[15px] text-slate-text">
                      {t.name}, {t.place}
                    </figcaption>
                  </figure>
                ))}
              </div>
              {testimonials.some((t) => t.sample) && <SampleNote />}
            </div>
          </section>
        )}

        {/* The neighborhood */}
        <section aria-label="A quiet street" className="relative h-[52vh] min-h-[320px] w-full overflow-hidden bg-mist lg:h-[68vh]">
          <Image src={PHOTOS.street.src} alt={PHOTOS.street.alt} fill sizes="100vw" className="object-cover" />
        </section>

        {/* Booking */}
        <section id="contact" className="scroll-mt-6">
          <div className={`${container} grid gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 className="font-display text-[38px] leading-[1.1] text-balance text-harbor sm:text-[48px]">Book a consultation</h2>
              <p className="mt-6 max-w-[28rem] text-[18px] leading-[1.65] text-pretty text-slate-text">
                Tell us about your home and when you&rsquo;ll be away. We&rsquo;ll arrange a walkthrough, meet you at the house,
                and agree on a plan before you leave.
              </p>
              {(BUSINESS.phone || BUSINESS.email) && (
                <div className="mt-10 space-y-1 text-[17px]">
                  {BUSINESS.phone && (
                    <a href={`tel:${BUSINESS.phone.replace(/[^\d+]/g, "")}`} className="block text-harbor hover:text-boxwood">
                      {BUSINESS.phone}
                    </a>
                  )}
                  {BUSINESS.email && (
                    <a href={`mailto:${BUSINESS.email}`} className="block text-harbor hover:text-boxwood">
                      {BUSINESS.email}
                    </a>
                  )}
                </div>
              )}
              <p className="mt-10 text-[16px] text-slate-text">
                Already a client?{" "}
                <Link href="/login" className="text-harbor underline decoration-hairline underline-offset-[5px] hover:decoration-harbor">
                  Sign in to see your reports
                </Link>
                .
              </p>
            </div>
            <div className="lg:col-span-7">
              <BookingForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className={`${container} flex flex-col gap-6 py-12 text-[15px] text-slate-text md:flex-row md:items-end md:justify-between`}>
          <div>
            <p className="font-display text-[22px] text-harbor">{BUSINESS.name}</p>
            <p className="mt-1">Home watch for owners who are away.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Link href="/login" className="hover:text-harbor">
              Client sign in
            </Link>
            <Link href="/login?role=homewatcher" className="hover:text-harbor">
              For home-watch professionals
            </Link>
            <span>&copy; {new Date().getFullYear()} {BUSINESS.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
