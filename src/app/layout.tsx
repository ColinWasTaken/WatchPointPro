import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Libre_Caslon_Display, Libre_Caslon_Text } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistration } from "@/components/offline";
import "./globals.css";

// Hanken Grotesk for text; Libre Caslon (Display for titles, Text below that) for headings.
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-site-sans" });
const display = Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--font-site-display" });
const serif = Libre_Caslon_Text({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-site-serif" });

export const metadata: Metadata = {
  title: "WatchPointPro",
  description: "Digital home checks for home-watch companies and the homeowners they serve.",
  appleWebApp: { capable: true, title: "WatchPointPro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f1f1ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-ink">
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
