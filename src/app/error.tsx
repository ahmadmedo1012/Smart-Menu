"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-background to-primary/5" />

      {/* Decorative floating orbs */}
      <div className="absolute top-10 right-10 size-56 rounded-full bg-destructive/5 blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 size-64 rounded-full bg-primary/5 blur-3xl animate-float-delayed" />
      <div className="absolute bottom-1/3 left-1/4 size-40 rounded-full bg-destructive/3 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in">
        {/* Icon */}
        <div className="relative mb-8">
          <div className="size-24 rounded-full glass flex items-center justify-center mx-auto">
            <AlertTriangle className="size-12 text-destructive" />
          </div>
          {/* Glow ring */}
          <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10 animate-pulse-glow" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          حدث خطأ غير متوقع
        </h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          يرجى المحاولة مرة أخرى
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="text-base px-8 h-12"
            onClick={() => reset()}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>

      {/* Footer text */}
      <p className="relative z-10 mt-16 text-xs text-muted-foreground/50 select-none">
        الربط الذكي &mdash; Smart Menu
      </p>
    </div>
  )
}
