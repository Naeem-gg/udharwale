import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "./theme-provider";
import PwaProvider from "./components/PwaProvider";
import { DEFAULT_DESCRIPTION, SITE_CREATOR, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1210" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} by ${SITE_CREATOR} — Digital Khata`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_CREATOR, url: SITE_URL }],
  creator: SITE_CREATOR,
  publisher: SITE_CREATOR,
  keywords: [
    "Udharwale",
    "khata book",
    "digital ledger",
    "debt tracker",
    "udhar tracker",
    "personal finance",
    "WhatsApp payment reminder",
    "money lent borrowed",
    "Naeem Navjivan",
  ],
  category: "finance",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} by ${SITE_CREATOR} — Personal khata for everyday balances`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Digital Khata`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} by ${SITE_CREATOR} — Digital Khata`,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
    creator: SITE_CREATOR,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/icon", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    author: {
      "@type": "Person",
      name: SITE_CREATOR,
    },
  };

  return (
    <html
      lang="en"
      className={`${manrope.variable} min-h-dvh antialiased light`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var s=localStorage.getItem('udharwale-theme');var t=s==='dark'?'dark':'light';var r=document.documentElement;r.classList.remove(t==='light'?'dark':'light');r.classList.add(t);r.dataset.theme=t;r.style.colorScheme=t;}catch(e){}`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          {children}
          <PwaProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
