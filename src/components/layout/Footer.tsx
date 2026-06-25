import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
  partnerSlug?: string
}

export function Footer({ className, partnerSlug = "al-waha-cafe" }: FooterProps) {
  return (
    <footer className={cn("border-t border-border/30 pt-12 pb-10 bg-background", className)}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 md:gap-6 mb-12">
          <div className="md:col-span-2">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto mb-4" loading="lazy" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed border-r-2 border-gold/40 pr-3">
              منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">روابط سريعة</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <Link href="/pricing" className="block w-fit hover:text-foreground transition-colors">الخطط</Link>
              <Link href={`/menu/${partnerSlug}`} className="block w-fit hover:text-foreground transition-colors">منيو تجريبي</Link>
              <Link href="/login" className="block w-fit hover:text-foreground transition-colors">تسجيل الدخول</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">تواصل معنا</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="hover:text-foreground transition-colors cursor-default">واتساب: +218 91 111 1111</p>
              <p className="hover:text-foreground transition-colors cursor-default">بريد: info@rabtzaki.ly</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/60">&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4 text-xs text-muted-foreground/60">
            <span className="cursor-default hover:text-foreground transition-colors">شروط الاستخدام</span>
            <span className="cursor-default hover:text-foreground transition-colors">سياسة الخصوصية</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
