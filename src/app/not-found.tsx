import Link from "next/link"
import type { Metadata } from "next"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "404 - الصفحة غير موجودة",
  description: "الرابط الذي تبحث عنه غير صحيح أو تم نقله.",
}

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-amber-500/5" />

      {/* Decorative floating orbs */}
      <div className="absolute top-10 left-10 size-56 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 size-64 rounded-full bg-amber-500/5 blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 right-1/4 size-40 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in">
        {/* Icon */}
        <div className="relative mb-8">
          <div className="size-24 rounded-full glass flex items-center justify-center mx-auto animate-float">
            <FileQuestion className="size-12 text-primary" />
          </div>
          {/* Glow ring */}
          <div className="absolute -inset-2 rounded-full bg-primary/10 blur-xl -z-10 animate-pulse-glow" />
        </div>

        {/* Status code */}
        <div className="text-8xl md:text-9xl font-bold text-gradient leading-none mb-4 select-none">
          404
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          الصفحة غير موجودة
        </h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          الرابط الذي تبحث عنه غير صحيح
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button size="lg" className="text-base px-8 h-12 animate-pulse-glow">
              العودة إلى الرئيسية
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer text */}
      <p className="relative z-10 mt-16 text-xs text-muted-foreground/50 select-none">
        الربط الذكي &mdash; Smart Menu
      </p>
    </div>
  )
}
