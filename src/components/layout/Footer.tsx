import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
  partnerSlug?: string
}

export function Footer({ className, partnerSlug = "al-waha-cafe" }: FooterProps) {
  return (
    <footer className={cn("border-t border-border/40 py-12 bg-background", className)}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <Image src="/logo.png" alt="الربط الذكي" width={1989} height={791} className="h-8 w-auto mb-3" loading="lazy" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">روابط سريعة</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link href="/pricing" className="block hover:text-foreground transition-colors">الخطط</Link>
              <Link href={`/menu/${partnerSlug}`} className="block hover:text-foreground transition-colors">منيو تجريبي</Link>
              <Link href="/login" className="block hover:text-foreground transition-colors">تسجيل الدخول</Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">تواصل معنا</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>واتساب: +218 91 111 1111</p>
              <p>بريد: info@rabtzaki.ly</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/30 pt-6 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
