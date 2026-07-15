import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import ServiceWorkerInit from "@/components/shared/ServiceWorkerInit";
import { ReactScanInit } from "@/components/shared/ReactScanInit";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GridPattern } from "@/components/ui/grid-pattern";
import { MotionProvider } from "@/components/shared/MotionProvider";
import "./globals.css";

/* ponytail: next/font replaces Google Fonts CSS link — eliminates render-blocking external CSS round-trip */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي",
    template: "%s | المنيو الذكي",
  },
  description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب، برنامج ولاء، وإحصائيات متقدمة",
  keywords: ["منيو رقمي", "Smart Menu", "مطعم", "مقهى", "طلب اونلاين", "واتساب", "قائمة طعام", "الربط الذكي"],
  authors: [{ name: "الربط الذكي" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOMAIN || "https://smart-link.ly"),
  openGraph: {
    title: "الربط الذكي | Smart Menu",
    description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب",
    url: "/",
    siteName: "الربط الذكي",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
    locale: "ar_LY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الربط الذكي | Smart Menu",
    description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={cairo.variable}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Smart Menu" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
	<link rel="stylesheet" href="/fonts/fonts.css" />
        <link rel="preload" href="/fonts/noto-naskh-arabic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/noto-sans-arabic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/readex-pro.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Cairo handles via next/font/google — no render-blocking external CSS */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "الربط الذكي | Smart Menu",
              "description": "منيو رقمي ذكي للمطاعم والمقاهي",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "LYD" },
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased overflow-x-hidden bg-[var(--background-radial),var(--background)]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-sm focus:bg-orange focus:text-white focus:text-sm focus:font-medium focus:outline-none">
          تخطى إلى المحتوى الرئيسي
        </a>
        <div className="grain-overlay" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <GridPattern
            width={60}
            height={60}
            className="[color:var(--grid-line)] [mask-image:radial-gradient(1200px_circle_at_50%_25%,white_20%,transparent)]"
            style={{ '--grid-fill': 'var(--grid-fill)', '--grid-square': 'var(--grid-square)' } as React.CSSProperties}
          />
          <ScrollToTop />
          <ServiceWorkerInit />
          <ReactScanInit />
          <MotionProvider>
            <main id="main-content">{children}</main>
          </MotionProvider>
          <FloatingWhatsApp />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                animation: "slide-up 0.35s cubic-bezier(0.16, 1, 0.2, 1)",
                borderRadius: "12px",
                padding: "8px",
              },
              className: "border border-border/30 shadow-xl backdrop-blur-xl",
            }}
          />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
