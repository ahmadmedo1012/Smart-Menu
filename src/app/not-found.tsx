import Link from "next/link"
import type { Metadata } from "next"
import { FileQuestion, Store, Star, LayoutDashboard, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "404 - الصفحة غير موجودة",
  description: "الرابط الذي تبحث عنه غير صحيح أو تم نقله.",
}

const SUGGESTIONS = [
  { href: "/", label: "الرئيسية", icon: Store },
  { href: "/pricing", label: "الخطط والأسعار", icon: Star },
  { href: "/login", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/menu/pizza-roma", label: "منيو تجريبي", icon: MessageCircle },
]

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-amber-500/5" />
      <div className="absolute top-10 left-10 size-56 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 size-64 rounded-full bg-amber-500/5 blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 right-1/4 size-40 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in">
        <div className="relative mb-8">
          <div className="size-24 rounded-full glass flex items-center justify-center mx-auto animate-float">
            <FileQuestion className="size-12 text-primary" />
          </div>
          <div className="absolute -inset-2 rounded-full bg-primary/10 blur-xl -z-10 animate-pulse-glow" />
        </div>
        <div className="text-8xl md:text-9xl font-bold text-gradient leading-none mb-4 select-none">404</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">الصفحة غير موجودة</h1>
        <p className="text-lg text-muted-foreground max-w-md mb-6 leading-relaxed">
          الرابط الذي تبحث عنه غير صحيح أو تم نقله
        </p>

        {/* Suggestions */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.href} href={s.href}>
                <Button variant="outline" size="sm" className="rounded-full gap-2 h-10">
                  <Icon className="size-4" />
                  {s.label}
                </Button>
              </Link>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button size="lg" className="text-base px-8 h-12 animate-pulse-glow">
              العودة إلى الرئيسية
            </Button>
          </Link>
        </div>
      </div>

      <p className="relative z-10 mt-16 text-xs text-muted-foreground/50 select-none">
        الربط الذكي &mdash; Smart Menu
      </p>
    </div>
  )
}
