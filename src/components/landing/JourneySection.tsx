"use client"

import { QrCode, UtensilsCrossed, MessageCircle, Star } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"
import { useSectionProgress } from "@/hooks/useSectionProgress"

/* r142 (task 2-b) — JourneySection «من الطاولة إلى المطبخ»: the radical
 * rebuild of the 5-station Madarek journey into a horizontal cinematic
 * strip of FOUR numbered editorial frames — the real diner's journey the
 * product actually ships, one frame per shipped function:
 *   01 امسح الرمز   — the per-table QR (owner QR surface: a code per table,
 *                     each signing the order with its table number)
 *   02 يتصفح ويطلب  — the public menu + cart (menu/[slug] + cart)
 *   03 المطبخ يستقبل — the WhatsApp order message (item/qty/customer)
 *   04 العميل يقيّم  — the post-order review (ReviewSheet → owner reviews)
 * Nothing invented (r82): every frame's desc traces to a shipped surface.
 *
 * The ember thread: one SVG hairline across the frames' heads, scrubbed
 * by the section's --sp (useSectionProgress — rAF-coalesced, RM snaps to
 * 1, no scroll hijacking): stroke-dashoffset: calc(1 - var(--sp, 0)) on
 * a pathLength=1 line, the same pure-CSS scrub grammar the retired light
 * path used. ≤920px the strip stacks vertically and the thread hides —
 * the frame numbers carry the order alone.
 */

const FRAMES: Array<{
  n: string
  icon: typeof QrCode
  title: string
  desc: string
}> = [
  {
    n: "01",
    icon: QrCode,
    title: "امسح الرمز",
    /* W6-B3: same over-claim repair as RolesSection — the old desc promised
       restaurant colors + logo the QR never shipped (W6-A3); the shipped
       truth since G-1 is a per-table code whose scan signs the order with
       the table. */
    desc: "رمز QR لكل طاولة يحمل رقمها — العميل يفتح المنيو في متصفحه فوراً، بدون تطبيق وبدون تسجيل، ويصل الطلب موقّعاً برقم الطاولة.",
  },
  {
    n: "02",
    icon: UtensilsCrossed,
    title: "يتصفح ويطلب",
    desc: "الأصناف بصورها وأسعارها واضحة أمام العميل، والسلة تجمع الطلب وتُرسل بضغطة واحدة — داخل المكان أو سفري أو توصيل.",
  },
  {
    n: "03",
    icon: MessageCircle,
    title: "المطبخ يستقبل",
    desc: "الطلب يصل على واتساب المطعم كاملاً: الصنف والكمية واسم العميل — جاهز للتحضير من اللحظة الأولى.",
  },
  {
    n: "04",
    icon: Star,
    title: "العميل يقيّم",
    desc: "بعد الطلب يقيّم العميل تجربته من نفس الرابط، والتقييمات تُجمع في لوحتك لتصحّ قراراتك في المنيو والخدمة.",
  },
]

export function JourneySection() {
  /* --sp on this section scrubs the ember thread. */
  const ref = useSectionProgress<HTMLElement>()

  return (
    <section id="journey" ref={ref} className="ln-chapter ln-journey">
      <div className="ln-chapter-head">
        <span className="ln-label">{"03 — الرحلة"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          من الطاولة <em>إلى المطبخ</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          أربع لحظات حقيقية يقطعها طلبك — كل إطار فيها مبنٍى على وظيفة تعمل
          اليوم في المنتج، لا على قصة تسويقية.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" className="ln-journey-strip-wrap" delay={2}>
        {/* the ember thread — one hairline across the four frames, scrubbed */}
        <svg className="ln-journey-thread" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <line className="ln-journey-thread-base" x1="0" y1="2" x2="1000" y2="2" pathLength="1" />
          <line className="ln-journey-thread-ink" x1="0" y1="2" x2="1000" y2="2" pathLength="1" />
        </svg>

        <ol className="ln-journey-frames">
          {FRAMES.map((f) => (
            <li key={f.n} className="ln-frame">
              <span className="ln-frame-n ln-mono" aria-hidden="true">{f.n}</span>
              <span className="ln-frame-ico" aria-hidden="true">
                <f.icon size={20} strokeWidth={1.8} />
              </span>
              <h3 className="ln-frame-title">{f.title}</h3>
              <p className="ln-frame-desc">{f.desc}</p>
            </li>
          ))}
        </ol>
      </RevealCssClass>
    </section>
  )
}
