import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Hind } from "next/font/google";
import "./globals.css";

// Every page reads live data (prices, stock, settings), and the same Docker image
// runs in test and production, so nothing is pre-rendered at build time.
export const dynamic = "force-dynamic";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700", "800"] });
const body = Hind({ subsets: ["latin", "devanagari"], variable: "--font-body", weight: ["400", "500", "600"] });

const isTest = process.env.APP_ENV === "test";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "Shree Ram Trading Company – Dry fruits for homes & businesses", template: "%s | Shree Ram Trading Co." },
  description:
    "Almonds, cashews, pistachios, walnuts, raisins and dates at trader prices. Retail packs delivered across India and bulk supply for corporates with GST invoices.",
  robots: isTest ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: { type: "website", siteName: "Shree Ram Trading Company", locale: "en_IN" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2F4A2A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clarity = process.env.CLARITY_ID;
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        {clarity && !isTest ? (
          <Script id="clarity" strategy="lazyOnload">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity.replace(/[^a-z0-9]/gi, "")}");`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
