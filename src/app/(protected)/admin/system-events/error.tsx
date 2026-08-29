"use client"

import { useEffect } from "react"
import { error as logError } from "@/lib/logger"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminSystemEventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { logError(error?.message || "Client error") }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="relative mb-6">
        <div className="size-16 rounded-full glass flex items-center justify-center">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10" />
      </div>
      <h1 className="text-xl font-bold mb-2">حدث خطأ في أحداث النظام</h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        تعذر تحميل سجل الأحداث. حاول مرة أخرى.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>
          إعادة المحاولة
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/admin"}>
          العودة للوحة الإدارة
        </Button>
      </div>
    </div>
  )
}
