import Link from "next/link"
import { Sparkles } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink"

/* r128 Stage B (F1b) — Chapter 06 «الوصول»: the starting point, adapted
 * from the golden Smart-Link FinaleCta (commit 7a1fac7) — the canonical
 * LandingPage.tsx:698-727 anatomy. Converging orbit rings, magnetic gold
 * CTA (useMagnetic(7)) + ghost. Copy folds the home's shipped CTA section
 * (جهّز مطعمك للانطلاق الرقمي / استقبل الطلبات عبر واتساب وابدأ في
 * دقائق / ابدأ مجاناً → /subscribe). */

export function FinaleCta() {
  const year = new Date().getFullYear()

  return (
    <section className="ln-cta" aria-label="ابدأ رحلتك">
      {/* converging orbits */}
      <div className="ln-cta-orbits" aria-hidden="true">
        <span className="ln-cta-orbit o0" />
        <span className="ln-cta-orbit o1" />
        <span className="ln-cta-orbit o2" />
      </div>
      <div className="ln-cta-inner">
        <span className="ln-label">{"06 — الوصول · ACCESS"}</span>
        <RevealCssClass as="h2" className="ln-cta-title" delay={1}>
          مطعمك يبدأ <em>من هنا</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-lede" delay={2}>
          جهّز مطعمك للانطلاق الرقمي — استقبل الطلبات عبر واتساب وابدأ في
          دقائق، مجاناً وبدون بطاقة ائتمان.
        </RevealCssClass>
        <RevealCssClass as="div" className="ln-cta-actions" delay={3}>
          <MagneticGoldLink href="/subscribe" xl withArrow ariaLabel="ابدأ مجاناً — إنشاء حساب">
            ابدأ مجاناً
          </MagneticGoldLink>
          <Link href="/pricing" className="ln-btn-ghost xl">الباقات والأسعار</Link>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-meta" delay={4}>
          <Sparkles size={13} aria-hidden="true" />
          الربط الذكي · Smart Menu · {year}
        </RevealCssClass>
      </div>
    </section>
  )
}
