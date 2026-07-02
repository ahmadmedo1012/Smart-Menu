"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

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
      <body>
        <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-background px-6">
          <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
            <div className="size-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="size-12 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4">حدث خطأ غير متوقع</h1>
            <p className="text-lg text-muted-foreground max-w-md mb-8">تعذر تحميل التطبيق. يرجى تحديث الصفحة.</p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-foreground text-background text-base font-medium hover:opacity-90 transition-opacity"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
