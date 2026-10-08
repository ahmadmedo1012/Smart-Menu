import Link from "next/link"

/* r128 Stage B (F1b) — the landing footer (canonical landing.css ground-
 * plate family), adapted from the golden Smart-Link LandingFooter (commit
 * 7a1fac7). Flat ink-2 plate, hairline seam, four columns of REAL
 * destinations only: journey anchors, the platform's own routes (pricing,
 * login, subscribe — the pages this app actually ships), and the legal
 * routes. Bottom bar signs with the brand + year. */

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
                <span className="landing-brand-sub">منيو رقمي للمطاعم</span>
              </span>
            </Link>
            <p className="landing-footer-about">
              منيو رقمي واضح لمطعمك، طلبات مباشرة على واتساب، ولوحة تحكم
              عربية كاملة — من أول صنف حتى برنامج الولاء.
            </p>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">الرحلة</div>
            <a href="#categories" className="landing-footer-link">فئات المنيو</a>
            <a href="#journey" className="landing-footer-link">رحلة الطلب</a>
            <a href="#progress" className="landing-footer-link">قصة التقدّم</a>
            <a href="#restaurants" className="landing-footer-link">المطاعم</a>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">المنصّة</div>
            <Link href="/subscribe" prefetch={false} className="landing-footer-link">ابدأ مجاناً</Link>
            <Link href="/pricing" prefetch={false} className="landing-footer-link">الباقات والأسعار</Link>
            <Link href="/login" prefetch={false} className="landing-footer-link">تسجيل الدخول</Link>
            <a href="#roles" className="landing-footer-link">الأدوار</a>
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
