import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://udharwaale.vercal.app"),
  title: "Udharwale by Naeem Navjivan - Smart Digital Debt Ledger & Khata Book",
  description: "Track your personal and business debts easily. Record credits (money you'll get) and debits (money you owe), send WhatsApp reminders, and settle balances dynamically with instant calculations.",
  openGraph: {
    title: "Udharwale - Smart Digital Debt Ledger",
    description: "Remove friction from shared bills, friend balances, and loan tracking with clean cards, auto logs, and instant WhatsApp reminders.",
    url: "https://udharwaale.vercal.app",
    siteName: "Udharwale",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Udharwale - Smart Digital Debt Ledger",
    description: "Track your personal and business debts easily.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
