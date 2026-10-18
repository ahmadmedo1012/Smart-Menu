import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r142 (task 2-b) — RolesSection «لصاحب المطعم»: the radical rebuild of
 * the three-role ledger into a single asymmetric editorial split aimed
 * at the DECISION MAKER (the owner visiting the page). The start column
 * argues; the end column is a «قائمة دورات» — a printed-menu style list
 * where each benefit is a course with an ember index and dotted leaders.
 *
 * Honesty doctrine (r82): every course is a SHIPPED function —
 *   01 طلبات واتساب      (orders arrive as WhatsApp messages: item/qty/customer)
 *   02 رمز لكل طاولة     (owner QR surface — per-table codes, print-ready sheet)
 *   03 لوحة تحكم عربية   (full Arabic dashboard, items/prices/photos self-serve)
 *   04 ولاء ومكافآت      (loyalty points program, real redemption flow)
 * and the list says so in plain text. The only CTA pair: pricing (the
 * honest «details live there» link) + the free start.
 *
 * Server component: pure markup.
 */

const COURSES = [
  {
    n: "01",
    name: "طلبات على واتساب",
    desc: "الطلب يصل كرسالة كاملة: الصنف والكمية واسم العميل ونوع التناول — من طاولتك أو من بعيد.",
  },
  {
    n: "02",
    /* W6-B3: the old course promised restaurant colors + logo on the QR,
       which the product never shipped (fixed brand copper + a generic glyph
       — the W6-A3 over-claim). Re-worded to what ships now: per-table QR
       generation (G-1) that signs each order with its table number (r135). */
    name: "رمز لكل طاولة",
    desc: "ولّد رمزاً لكل طاولة يحمل رقمها واطبعه والصقه — العميل يفتح المنيو بلا تطبيق، ويصل الطلب موقّعاً برقم طاولته.",
  },
  {
    n: "03",
    name: "لوحة تحكم عربية",
    desc: "أضف وعدّل الأصناف والأسعار والصور والأقسام بنفسك، في أي وقت وبدون مساعدة فنية.",
  },
  {
    n: "04",
    name: "ولاء ومكافآت",
    desc: "نقاط تُجمع لزبائنك الأوفياء مع كل طلب، وتعود إليك زيارات أكثر وطلب أكبر.",
  },
] as const

export function RolesSection() {
  return (
    <section id="owner" className="ln-chapter ln-owner" aria-label="لصاحب المطعم">
      <div className="ln-owner-grid">
        <div className="ln-owner-argue">
          <span className="ln-label">{"05 — لصاحب المطعم"}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            مطعمك يستحق <em>منيوًا يعمل</em>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            هذه ليست قائمة وعود — كل بند فيها وظيفة تعمل اليوم في المنتج،
            من أول رمز يُطبع حتى نقطة الولاء تُحصى. ابدأ مجاناً واقرأ
            المنيو الخاص بك كما سيقرؤه زبائنك.
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-owner-actions" delay={3}>
            <Link href="/pricing" className="ln-btn-ember">
              الباقات والأسعار
              <ArrowLeft size={15} aria-hidden="true" />
            </Link>
            <Link href="/subscribe" className="ln-btn-ghost">
              ابدأ مجاناً
            </Link>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-owner-foot ln-mono" delay={4}>
            الخطة المجانية للأبد · بدون بطاقة ائتمان
          </RevealCssClass>
        </div>

        {/* قائمة الدورات — the owner's benefits as a printed-menu course list */}
        <RevealCssClass as="ol" className="ln-owner-list" delay={2}>
          {COURSES.map((c) => (
            <li key={c.n} className="ln-owner-course">
              <span className="ln-owner-n ln-mono" aria-hidden="true">{c.n}</span>
              <div className="ln-owner-course-body">
                <h3 className="ln-owner-course-name">
                  {c.name}
                  <span className="ln-owner-leader" aria-hidden="true" />
                </h3>
                <p className="ln-owner-course-desc">{c.desc}</p>
              </div>
            </li>
          ))}
        </RevealCssClass>
      </div>
    </section>
  )
}
