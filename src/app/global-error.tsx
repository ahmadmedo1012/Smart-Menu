"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

// r111-F13: global-error REPLACES the root layout when it renders, so Tailwind
// utility classes (bg-background, text-muted-foreground, …) were inert here —
// no layout meant no globals.css. Importing the stylesheet directly keeps the
// catastrophic-error screen styled with the real design tokens. The fonts
// <link> below stays: it re-attaches Cairo, which globals.css does not load.
import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* r97-X2 [12]: global-error replaces the root layout, so the Cairo
            stylesheet linked there is gone — re-attach it or the Arabic text
            falls back to a system font on this screen. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="font-arabic">
        <main className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-background px-6">
          <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
            <div className="size-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="size-12 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4">حدث خطأ غير متوقع</h1>
            <p className="text-lg text-muted-foreground max-w-md mb-8">تعذر تحميل التطبيق. يرجى تحديث الصفحة.</p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-foreground text-background text-base font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
            >
              تحديث الصفحة
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
