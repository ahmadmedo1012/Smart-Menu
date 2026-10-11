import { ChevronDown } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"

/* r142 (task 2-b) — LandingFaq «قبل أول طلب»: the compact FAQ that merges
 * into the finale spread (the الختام chapter continues on paper after the
 * espresso back-cover). Same four REAL Q&As, verbatim from the shipped
 * home copy — the interaction stays native <details>/<summary>: zero JS,
 * keyboard-native, reduced-motion-safe.
 * r143 (Phase-4 W1 #9): the four Q&As are now exported and mirrored as a
 * FAQPage JSON-LD on / (page.tsx) — the crawler-visible twin of this
 * details/summary surface (inventory §4.7). Also: «أصناف غير محدودة» in
 * the free-plan answer joined the r92 truth law — every cap names its
 * enforced number (TEXT follows ENFORCEMENT), so the benefit reads
 * «أصناف أكثر». */

export const FAQS = [
  { q: "هل موقع المنيو الرقمي مجاني؟", a: "نعم، توجد خطة مجانية للأبد مع ميزات أساسية. يمكنك الترقية إلى خطة مدفوعة للحصول على ميزات إضافية مثل أصناف أكثر وإحصائيات متقدمة." },
  { q: "كيف يصلني الطلب من العميل؟", a: "الطلب يصل مباشرة على واتساب مطعمك مع تفاصيل الصنف والكمية واسم العميل. لا تحتاج لتطبيقات إضافية." },
  { q: "هل يمكنني تعديل المنيو بنفسي؟", a: "نعم، لوحة التحكم بالكامل بالعربية. يمكنك إضافة وتعديل وحذف الأصناف والأقسام والصورة في أي وقت بدون مساعدة فنية." },
  { q: "ماذا لو احتجت مساعدة؟", a: "فريق الدعم الفني متواجد طوال أيام العمل. نوفر لك تعليمات مصورة ودعماً مباشراً عبر واتساب." },
]

export function LandingFaq() {
  return (
    <section className="ln-faq" aria-label="الأسئلة الشائعة">
      <div className="ln-faq-head">
        <span className="ln-label">{"07 — قبل أول طلب"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          الأسئلة <em>الشائعة</em>
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
