import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "N5Deal — M&A opportunities and financial assets",
  description:
    "Marketplace prototype for buying and selling licensed financial businesses: listings, buyer mandates, AI matching and moderation.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <I18nProvider locale={locale}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
