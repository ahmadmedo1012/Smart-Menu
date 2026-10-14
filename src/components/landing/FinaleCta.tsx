import Link from "next/link"
import { RevealCssClass } from "@/hooks/useReveal"
import { MagneticGoldLink } from "@/components/landing/MagneticGoldLink"

/* r142 (task 2-b) — FinaleCta «الختام»: the back cover. The one inversion
 * of the whole المائدة world — the final spread flips to deep espresso
 * ink with paper text (every other chapter is cream paper), the way a
 * printed menu closes. The huge line is the mandate's own: «اجعل قائمتك
 * تتحدث» (P9/E2: الصياغة الملكية العامّية للمنيو استُبدلت بصياغة مهنية —
 * نفس الخط، نفس الموضع، القافية النسائية للقائمة). The live stats line folds the
 * platform's two REAL public figures (passed down from HomePage — same
 * payload, same honest fallback: "—" when the live numbers are
 * unavailable, never fabricated, r82). The FAQ spread follows immediately
 * on paper (LandingFaq) — the two together read as the menu's last opened
 * page.
 *
 * Server component: pure markup.
 */
export function FinaleCta({ stats }: { stats: { totalRestaurants: number; totalUsers: number } | null }) {
  const year = new Date().getFullYear()

  return (
    <section className="ln-cta" aria-label="اجعل قائمتك تتحدث">
      <div className="ln-cta-inner">
        <span className="ln-label">{"06 — الختام"}</span>
        <RevealCssClass as="h2" className="ln-cta-title" delay={1}>
          اجعل قائمتك <em>تتحدث</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-lede" delay={2}>
          أنشئ قائمتك الرقمية اليوم — أصناف تُشرح بصورها وأسعارها، وطلبات
          تصل على واتساب. ابدأ في دقائق، مجاناً وبدون بطاقة ائتمان.
        </RevealCssClass>
        <RevealCssClass as="div" className="ln-cta-actions" delay={3}>
          <MagneticGoldLink href="/subscribe" xl withArrow ariaLabel="ابدأ مجاناً — إنشاء حساب">
            ابدأ مجاناً
          </MagneticGoldLink>
          <Link href="/pricing" className="ln-btn-ghost xl">الباقات والأسعار</Link>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-stats ln-mono" delay={4}>
          {/* r143 (Phase-4 W1 D6): «حساب نشط» → «صاحب مطعم» — العدّ صار
              role:owner (stats-queries.countPublicStats) فالتسمية تتبع
              ما يُحتسب فعلًا (نفس توحيد شريط الثقة في HomePage). */}
          {stats
            ? `+${stats.totalRestaurants} مطعم مسجل · +${stats.totalUsers} صاحب مطعم على المنصة`
            : "أرقام المنصّة تُجلب الآن من قاعدة البيانات…"}
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-cta-meta ln-mono" delay={5}>
          الربط الذكي · Smart Menu · {year}
        </RevealCssClass>
      </div>
    </section>
  )
}
