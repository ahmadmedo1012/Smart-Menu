import Link from "next/link"
import type { Metadata } from "next"
import { FileQuestion, Store, Star, LayoutDashboard, MessageCircle, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { LazyMotionProvider } from "@/components/motion/LazyMotionProvider"
import { MotionConfig } from "motion/react"

export const metadata: Metadata = {
  title: "404 - الصفحة غير موجودة",
  description: "الرابط الذي تبحث عنه غير صحيح أو تم نقله.",
}

const SUGGESTIONS = [
  { href: "/", label: "الرئيسية", icon: Store },
  { href: "/pricing", label: "الخطط والأسعار", icon: Star },
  { href: "/login", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/menu/al-waha-cafe", label: "منيو تجريبي", icon: MessageCircle },
]

export default function NotFound() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* round87-B5: the root 404 boundary compiles into EVERY route's client
          manifest — importing the full landing Header here shipped Header code
          in the sync chunks of all menu/QR pages (~10KB gz each). A minimal
          Link-based top bar serves the same navigation need at zero cost. */}
      <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-8 h-16">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="الرئيسية">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
            <UtensilsCrossed className="size-5" aria-hidden="true" />
          </span>
          {/* r93-W2a (U8): توحيد تسمية العلامة — «الربط الذكي» هي الصيغة الأكثر
              استخدامًا في المشروع (21+ موضعًا) واللاتينية «Smart Menu» ثانوية؛
              كانت هذه الصفحة وحدها تستخدم صيغة عربية ثالثة مختلفة. */}
          <span className="font-bold text-lg text-foreground">الربط الذكي</span>
        </Link>
        {/* round88-A1: the root 404 boundary renders outside both route-group
            root layouts, so it gets no MotionProvider — mount the shared
            LazyMotionProvider here so ThemeToggle's m.* components keep
            animating exactly as before the LazyMotion migration.
            round88-E8: plus MotionConfig reducedMotion="user" — the ONE gap the
            reduced-motion audit found: without it, ThemeToggle's whileHover/
            whileTap scale+rotate transforms on this page ignored the user's
            prefers-reduced-motion (the root layouts carry this config everywhere
            else). useAnimate-based icons already read the hook themselves. */}
        <LazyMotionProvider>
          <MotionConfig reducedMotion="user">
            <ThemeToggle />
          </MotionConfig>
        </LazyMotionProvider>
      </header>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-orange/5" />
      <div className="absolute top-10 left-10 size-56 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 size-64 rounded-full bg-orange/5 blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 right-1/4 size-40 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in">
        <div className="relative mb-8">
          <div className="size-24 rounded-full glass flex items-center justify-center mx-auto animate-float">
            <FileQuestion className="size-12 text-primary" />
          </div>
          <div className="absolute -inset-2 rounded-full bg-primary/10 blur-xl -z-10" />
        </div>
        <div className="text-8xl md:text-9xl font-bold text-foreground leading-none mb-4 select-none" aria-hidden="true">404</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">الصفحة غير موجودة</h1>
        <p className="text-lg text-muted-foreground max-w-md mb-6 leading-relaxed">
          الرابط الذي تبحث عنه غير صحيح أو تم نقله
        </p>

        {/* Suggestions */}
        <nav aria-label="اقتراحات التنقل" className="flex flex-wrap justify-center gap-3 mb-8">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.href} href={s.href}>
                <Button variant="outline" size="sm" className="gap-2 h-10">
                  <Icon className="size-4" aria-hidden="true" />
                  {s.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button size="lg" className="text-base px-8 h-12">
              العودة إلى الرئيسية
            </Button>
          </Link>
        </div>

        <p className="mt-16 text-xs text-muted-foreground/50 select-none">
          الربط الذكي &mdash; Smart Menu
        </p>
      </div>
    </main>
  )
}
