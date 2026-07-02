"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in" aria-live="assertive">
      <AlertCircle className="size-10 text-destructive" />
      <p className="text-lg font-medium">حدث خطأ</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset} className="gap-2">
        <RefreshCw className="size-4" /> إعادة المحاولة
      </Button>
    </div>
  )
}
