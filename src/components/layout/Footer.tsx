import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
  partnerSlug?: string
}

export function Footer({ className, partnerSlug = "al-waha-cafe" }: FooterProps) {
  return (
    <footer className={cn("border-t border-border/40 pt-16 pb-12 bg-background", className)}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Gradient brand separator line */}
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/20" />
          </div>
          <div className="relative flex justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-9 w-auto mb-4" loading="lazy" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">روابط سريعة</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <Link href="/pricing" className="block w-fit hover:text-foreground transition-all duration-200 hover:translate-x-0.5">الخطط</Link>
              <Link href={`/menu/${partnerSlug}`} className="block w-fit hover:text-foreground transition-all duration-200 hover:translate-x-0.5">منيو تجريبي</Link>
              <Link href="/login" className="block w-fit hover:text-foreground transition-all duration-200 hover:translate-x-0.5">تسجيل الدخول</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground">تواصل معنا</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="hover:text-foreground transition-colors duration-200 cursor-default">واتساب: +218 91 111 1111</p>
              <p className="hover:text-foreground transition-colors duration-200 cursor-default">بريد: info@rabtzaki.ly</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/20 pt-6 text-center text-xs text-muted-foreground/70">
          <p>&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
