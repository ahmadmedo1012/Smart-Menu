"use client"

import { UserPlus, UtensilsCrossed, QrCode, MessageCircle, Gift } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"
import { useSectionProgress } from "@/hooks/useSectionProgress"
import { JourneyLightPath } from "@/components/landing/JourneyLightPath"

/* r128 Stage B (F1b) — Chapter 02 «الرحلة»: the 5-station journey, adapted
 * from the golden Smart-Link JourneySection (commit 7a1fac7) — the canonical
 * LandingPage.tsx:456-494 anatomy. The stations fold the home's REAL
 * how-it-works/FAQ/features content (3 steps + WhatsApp-order answer + QR
 * + loyalty feature) into Madarek's 5-station rhythm — every desc traces
 * to shipped copy, nothing invented (no kitchen-display or analytics
 * claims: the product ships WhatsApp orders + an Arabic dashboard +
 * loyalty). Client component: useSectionProgress writes --sp on the
 * section, JourneyLightPath's lit thread scrubs with it
 * (stroke-dashoffset: calc(1 - var(--sp))) — pure CSS scrub, native
 * scrolling, no hijacking. */

const STATIONS: Array<{
  n: string
  icon: typeof UserPlus
  title: string
  desc: string
  tag: string
}> = [
  {
    n: "01", icon: UserPlus, title: "أنشئ حسابك المجاني",
    desc: "أدخل بيانات مطعمك وأنشئ حساباً مجاناً بدون بطاقة ائتمان — دقائق معدودة تفصلك عن الانطلاق.",
    tag: "مجاناً",
  },
  {
    n: "02", icon: UtensilsCrossed, title: "صمّم المنيو الخاص بك",
    desc: "أضف الأصناف والفئات والأسعار والصور عبر لوحة تحكم عربية بالكامل — في أي وقت وبدون مساعدة فنية.",
    tag: "الإعداد",
  },
  {
    n: "03", icon: QrCode, title: "شارك منيوك",
    desc: "رابط واحد تشاركه أينما كان، وQR كود مخصص بألوان وشعار مطعمك على الطاولات — العميل يصل بنقرة.",
    tag: "الانطلاق",
  },
  {
    n: "04", icon: MessageCircle, title: "استقبل الطلبات",
    desc: "الطلب يصل مباشرة على واتساب مع تفاصيل الصنف والكمية واسم العميل — داخل المكان أو سفرياً أو توصيلاً.",
    tag: "الطلب",
  },
  {
    n: "05", icon: Gift, title: "كافئ زبائنك",
    desc: "برنامج ولاء ومكافآت لعملائك الأوفياء، وأدوات تمنحك صورة أفضل عن عملك من لوحة واحدة.",
    tag: "الولاء",
  },
]

export function JourneySection() {
  /* --sp on this section scrubs the light path (JourneyLightPath's lit
     thread). r129: the old comment also claimed a "chapter wash" — no
     such rule ships in this port (kit §7 bans the gradient wash), so
     the stale claim is removed. */
  const ref = useSectionProgress<HTMLElement>()

  return (
    <section id="journey" ref={ref} className="ln-chapter ln-journey">
      <div className="ln-chapter-head">
        <span className="ln-label">{"02 — الرحلة"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          من مسح الرمز إلى الطلب — <em>خمس محطات</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          خطّ ضوءٍ واحد يربط محطاتك؛ كل محطة تبني على ما قبلها.
        </RevealCssClass>
      </div>

      <div className="ln-journey-stage">
        {/* the light path — computed from the real station-node layout */}
        <JourneyLightPath />

        <ol className="ln-journey-stations">
          {STATIONS.map((s, i) => (
            <RevealCssClass
              as="li"
              key={s.n}
              className={`ln-station${i % 2 === 0 ? " from-start" : " from-end"}`}
              delay={(i + 1) as 1 | 2 | 3 | 4 | 5}
            >
              <article className="ln-station-card">
                <span className="ln-station-node" aria-hidden="true">
                  <span className="ln-station-node-core" />
                </span>
                <header className="ln-station-head">
                  <span className="ln-mono ln-station-n">{s.n}</span>
                  <span className="ln-station-ico" aria-hidden="true"><s.icon size={20} /></span>
                  <span className="ln-station-tag">{s.tag}</span>
                </header>
                <h3 className="ln-station-title">{s.title}</h3>
                <p className="ln-station-desc">{s.desc}</p>
              </article>
            </RevealCssClass>
          ))}
        </ol>
      </div>
    </section>
  )
}
