import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Hanken_Grotesk, Libre_Caslon_Display, Libre_Caslon_Text } from "next/font/google";
import { auth } from "@/auth";

const display = Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--font-site-display" });
const caslon = Libre_Caslon_Text({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-site-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-site-sans" });

const PHOTO = {
  src: "https://images.unsplash.com/photo-1601041597271-71988152f98b?auto=format&fit=crop&q=80&w=1400",
  alt: "A red-brick house with a white-columned porch and a freshly painted front door",
};

// One way in: a row with a title and a line about what's behind it.
function Door({ href, title, text, delay }: { href: string; title: string; text: string; delay: string }) {
  return (
    <Link
      href={href}
      className="site-rise group flex items-center justify-between gap-6 border-b border-hairline py-4 transition-colors first:border-t"
      style={{ animationDelay: delay }}
    >
      <span>
        <span className="block font-caslon text-[24px] leading-tight text-harbor transition-colors group-hover:text-boxwood">{title}</span>
        <span className="mt-1.5 block text-[16px] leading-relaxed text-slate-text">{text}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-text transition-colors group-hover:text-boxwood" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

// The front door to WatchPointPro: homeowners and homewatchers each find their way in.
export default async function HomePage() {
  const session = await auth();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  return (
    <div className={`${display.variable} ${caslon.variable} ${sans.variable} site min-h-screen bg-paper font-site text-harbor antialiased`}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1180px] items-center gap-8 px-6 py-8 md:px-10 lg:grid-cols-12 lg:gap-12 lg:py-12">
        <main className="lg:col-span-6">
          <p className="flex items-center gap-3">
            <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-[10px]" priority />
            <span className="font-display text-[24px] text-harbor">WatchPointPro</span>
          </p>
          <h1 className="site-rise mt-8 font-display text-[44px] leading-[1.05] text-balance text-harbor sm:text-[56px] lg:mt-12 lg:text-[64px]">
            Who&rsquo;s checking in today?
          </h1>
          <p className="site-rise mt-4 max-w-[30rem] text-[18px] leading-[1.65] text-balance text-slate-text" style={{ animationDelay: "120ms" }}>
            Home-check reports, photos, and updates, shared between home-watch companies and the homeowners they look after.
          </p>
          <nav aria-label="Sign in" className="mt-7 max-w-[32rem]">
            {session ? (
              <Door
                href="/dashboard"
                title={firstName ? `Continue as ${firstName}` : "Continue to your dashboard"}
                text="You’re signed in. Pick up where you left off."
                delay="240ms"
              />
            ) : (
              <>
                <Door href="/login?role=homeowner" title="I’m a homeowner" text="See the reports and photos from every visit to your home." delay="240ms" />
                <Door href="/login?role=homewatcher" title="I’m a homewatcher" text="Run your home checks, clients, and team in one place." delay="320ms" />
              </>
            )}
          </nav>
          {!session && (
            <p className="site-rise mt-4 text-[15px] text-slate-text" style={{ animationDelay: "400ms" }}>
              Choose one to sign in or create an account.
            </p>
          )}
        </main>
        <div className="lg:col-span-6">
          <div className="site-reveal relative aspect-[16/10] overflow-hidden bg-mist lg:aspect-[4/5]">
            <Image src={PHOTO.src} alt={PHOTO.alt} fill priority sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
