import Link from "next/link"

/* r142 (task 2-b) — the landing footer, rebuilt for «المائدة»: a warm
 * paper-2 ground plate (the menu's back matter), hairline seam, four
 * columns of REAL destinations only: the المائدة anchors, the platform's
 * own routes (pricing, login, subscribe — the pages this app actually
 * ships), and the legal routes. Bottom bar signs with the brand + year. */

export function LandingFooter() {
  const year = new Date().getFullYear()

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
        </div>
        <div className="landing-footer-bottom">
          <span>© {year} الربط الذكي | Smart Menu</span>
          <span className="ln-footer-cluster">منيو رقمي · طلبات واتساب</span>
        </div>
      </div>
    </footer>
  )
}
