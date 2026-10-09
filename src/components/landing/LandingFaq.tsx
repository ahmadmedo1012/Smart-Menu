import { ChevronDown } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r128 Stage B (F1b) — the compact FAQ that follows the finale, ln-styled
 * per the task mandate, adapted from the golden Smart-Link LandingFaq
 * (commit 7a1fac7). The home's four REAL Q&As move here verbatim (folded
 * from sections/FaqSection.tsx); the interaction is native
 * <details>/<summary>: zero JS, keyboard-native, reduced-motion-safe.
 * No FAQPage JSON-LD — this surface never shipped one (nothing to
 * preserve, nothing invented). */

const FAQS = [
  { q: "هل موقع المنيو الرقمي مجاني؟", a: "نعم، توجد خطة مجانية للأبد مع ميزات أساسية. يمكنك الترقية إلى خطة مدفوعة للحصول على ميزات إضافية مثل أصناف غير محدودة وإحصائيات متقدمة." },
  { q: "كيف يصلني الطلب من العميل؟", a: "الطلب يصل مباشرة على واتساب مطعمك مع تفاصيل الصنف والكمية واسم العميل. لا تحتاج لتطبيقات إضافية." },
  { q: "هل يمكنني تعديل المنيو بنفسي؟", a: "نعم، لوحة التحكم بالكامل بالعربية. يمكنك إضافة وتعديل وحذف الأصناف والأقسام والصورة في أي وقت بدون مساعدة فنية." },
  { q: "ماذا لو احتجت مساعدة؟", a: "فريق الدعم الفني متواجد طوال أيام العمل. نوفر لك تعليمات مصورة ودعماً مباشراً عبر واتساب." },
]

export function LandingFaq() {
  return (
    <section className="ln-faq" aria-label="الأسئلة الشائعة">
      <div className="ln-faq-head">
        <span className="ln-label">{"07 — الأسئلة الشائعة"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          الأسئلة <em>الشائعة</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          إجابات سريعة لأكثر الأسئلة تردداً.
        </RevealCssClass>
      </div>
      <div className="ln-faq-list">
        {FAQS.map((f, i) => (
          <RevealCssClass as="details" className="ln-faq-item" key={f.q} delay={((i % 5) + 1) as 1 | 2 | 3 | 4 | 5}>
            <summary className="ln-faq-q">
              {f.q}
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <p className="ln-faq-a">{f.a}</p>
          </RevealCssClass>
        ))}
      </div>
    </section>
  )
}
