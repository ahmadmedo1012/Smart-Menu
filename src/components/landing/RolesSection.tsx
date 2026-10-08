import { Store, ChefHat, User } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r128 Stage B (F1b) — Chapter 05 «المجتمع»: the roles ledger, adapted
 * from the golden Smart-Link RolesSection (commit 7a1fac7) — the canonical
 * LandingPage.tsx:616-676 anatomy, Smart-Menu slot mapping owner/staff/
 * diner. Desc + quote fold shipped copy (features grid, FAQ answers);
 * nothing invented — the staff row traces to the shipped WhatsApp-order
 * claim (الصنف والكمية واسم الزبون), the diner row to the
 * no-registration/no-install claims. */

const ROLES = [
  {
    icon: Store, tone: "gold", name: "صاحب المطعم", index: "01",
    desc: "منيو رقمي بصور وأسعار، لوحة تحكم عربية كاملة، والطلبات تصل مباشرة على واتساب.",
    quote: "لوحة التحكم بالكامل بالعربية — أضف وعدّل واحذف الأصناف والأقسام والصور في أي وقت بدون مساعدة فنية.",
  },
  {
    icon: ChefHat, tone: "azure", name: "طاقم المطعم", index: "02",
    desc: "طلبات منظمة تصل على واتساب لحظة إرسالها: الصنف، الكمية، واسم الزبون — جاهزة للتحضير.",
    quote: "الطلب يصل مباشرة على واتساب مع تفاصيل الصنف والكمية واسم الزبون. لا تحتاج لتطبيقات إضافية.",
  },
  {
    icon: User, tone: "mist", name: "الزبون", index: "03",
    desc: "يطلب باسم ورقم الجوال فقط — بدون حسابات ولا خطوات إضافية، ويعمل المنيو من المتصفح.",
    quote: "تجربة تصفح سريعة وسلسة على جميع الأجهزة — بدون تثبيت وبدون تسجيل.",
  },
]

export function RolesSection() {
  return (
    <section id="roles" className="ln-chapter ln-roles">
      <div className="ln-chapter-head">
        <span className="ln-label">{"05 — المجتمع"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          ثلاثة أطراف <em>وتجربة واحدة</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          كل طرف يجد أدواته جاهزة بالعربية — من أول مسح للرمز حتى الطلب على واتساب.
        </RevealCssClass>
      </div>

      <ul className="ln-roles-list">
        {ROLES.map((r, i) => (
          <RevealCssClass as="li" key={r.name} className="ln-role-row" delay={(i + 1) as 1 | 2 | 3}>
            <span className="ln-role-key">
              <span className={`ln-role-ico ${r.tone}`} aria-hidden="true">
                <r.icon size={26} strokeWidth={1.7} />
              </span>
              <span className="ln-role-name">{r.name}</span>
              <span className="ln-role-index ln-mono">{r.index}</span>
            </span>
            <div>
              <p className="ln-role-desc">{r.desc}</p>
              <blockquote className="ln-role-quote">
                <span className="ln-role-quote-mark" aria-hidden="true">”</span>
                {r.quote}
              </blockquote>
            </div>
          </RevealCssClass>
        ))}
      </ul>
    </section>
  )
}
