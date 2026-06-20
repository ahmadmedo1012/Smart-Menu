import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavigationProgress from "@/components/shared/NavigationProgress";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
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
  title: {
    default: "الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي",
    template: "%s | المنيو الذكي",
  },
  description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب، برنامج ولاء، وإحصائيات متقدمة",
  keywords: ["منيو رقمي", "Smart Menu", "مطعم", "مقهى", "طلب اونلاين", "واتساب", "قائمة طعام", "الربط الذكي"],
  authors: [{ name: "الربط الذكي" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOMAIN || "https://smart-menu-uz6w.onrender.com"),
  openGraph: {
    title: "الربط الذكي | Smart Menu",
    description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب",
    url: "/",
    siteName: "الربط الذكي",
    locale: "ar_LY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الربط الذكي | Smart Menu",
    description: "منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب",
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
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{
        "--font-body": "'Noto Sans Arabic', system-ui, sans-serif",
        "--font-heading": "'Readex Pro', 'Noto Sans Arabic', system-ui, sans-serif",
      } as React.CSSProperties}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="theme-color" content="#d97706" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Smart Menu" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationProgress />
          <ScrollToTop />
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
