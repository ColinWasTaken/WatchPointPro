import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeWatch",
  description: "Home-watching coordination for homeowners and homewatchers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
