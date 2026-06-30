"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { error as logError } from "@/lib/logger"

export default function TermsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { logError(error?.message || "Terms page client error") }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="size-16 rounded-full glass flex items-center justify-center mb-6">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">حدث خطأ في تحميل الصفحة</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">تعذر تحميل شروط الاستخدام. قد يكون هناك خلل مؤقت.</p>
      <Button onClick={() => reset()}>إعادة المحاولة</Button>
    </div>
  )
}
