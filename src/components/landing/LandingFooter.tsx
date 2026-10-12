import Link from "next/link"
import { CurrentYear } from "../current-year"

/* r142 (task 2-b) — the landing footer, rebuilt for «المائدة»: a warm
 * paper-2 ground plate (the menu's back matter), hairline seam, four
 * columns of REAL destinations only: the المائدة anchors, the platform's
 * own routes (pricing, login, subscribe — the pages this app actually
 * ships), and the legal routes. Bottom bar signs with the brand + year. */

/* (Phase-4 W1, QA §9/D5) — عمود «منظومة الربط الذكي»: القائمة كانت تعيش
 * معزولة عن أخوتها رغم أنها جزء من منظومة واحدة (نفس النمط الذي أضافه
 * Smart-Order في r144/86fb698). ثلاثة أهداف حقيقية فقط — الأوصاف من هوية
 * كل منتج نفسها لا من الخيال (المائدة نفسها = هذه الصفحة فلا تُذكر). */
const ECOSYSTEM = [
  { href: "https://smart-link.ly", label: "الربط الذكي — منصة الأعمال المتكاملة" },
  { href: "https://bot.smart-link.ly", label: "سمارت بوت — منصة إدارة فيسبوك الذكية" },
  { href: "https://order.smart-link.ly", label: "سمارت أوردر — منصة الطلبات الرقمية" },
]

export function LandingFooter() {
  /* 19-AUDIT-CROSS R8 (r148): the © year was build-frozen (server eval at
   * build → stale between deploys — the exact bug SL closed in r140). The
   * CurrentYear island keeps the server-stamped buildYear for no-JS and
   * patches the live year post-hydration. buildYear is still evaluated at
   * module render on the server and passed as the snapshot seed. */
  const buildYear = new Date().getFullYear()

  return (
    <footer className="landing-footer">
      <div className="marketing-container">
        <div className="landing-footer-grid">
          <div className="landing-footer-col">
            <Link href="/" className="landing-brand" aria-label="الربط الذكي — الرئيسية">
              <span className="landing-brand-mark" aria-hidden="true">م</span>
              <span className="landing-brand-text">
                <span className="landing-brand-name">الربط الذكي</span>
                <span className="landing-brand-sub">المائدة · منيو رقمي</span>
              </span>
            </Link>
            <p className="landing-footer-about">
              المائدة الرقمية لمطعمك: منيو يُقرأ بشهية بصور وأسعار واضحة،
              طلبات مباشرة على واتساب، ولوحة تحكم عربية كاملة — من أول صنف
              حتى برنامج الولاء.
            </p>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">المائدة</div>
            <a href="#menu" className="landing-footer-link">المنيو الحي</a>
            <a href="#journey" className="landing-footer-link">من الطاولة إلى المطبخ</a>
            <a href="#ambience" className="landing-footer-link">أجواء المكان</a>
            <a href="#owner" className="landing-footer-link">لصاحب المطعم</a>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">المنصّة</div>
            <Link href="/subscribe" prefetch={false} className="landing-footer-link">ابدأ مجاناً</Link>
            <Link href="/pricing" prefetch={false} className="landing-footer-link">الباقات والأسعار</Link>
            <Link href="/login" prefetch={false} className="landing-footer-link">تسجيل الدخول</Link>
            <a href="/menu/al-waha-cafe" className="landing-footer-link">منيو تجريبي حي</a>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">المؤسسة</div>
            <Link href="/privacy" prefetch={false} className="landing-footer-link">سياسة الخصوصية</Link>
            <Link href="/terms" prefetch={false} className="landing-footer-link">شروط الاستخدام</Link>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">منظومة الربط الذكي</div>
            {ECOSYSTEM.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© <CurrentYear buildYear={buildYear} /> الربط الذكي | Smart Menu</span>
          <span className="ln-footer-cluster">منيو رقمي · طلبات واتساب</span>
        </div>
      </div>
    </footer>
  )
}
