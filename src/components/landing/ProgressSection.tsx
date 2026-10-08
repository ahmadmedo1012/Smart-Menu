"use client"

import { RevealCssClass } from "@/hooks/useReveal"
import { useSectionProgress } from "@/hooks/useSectionProgress"
import { CountUp } from "@/components/ui/CountUp"
import type { PublicStats } from "./landing-data"

/* r128 Stage B (F1b) — Chapter 03 «التقدّم»: the progress story, adapted
 * from the golden Smart-Link ProgressSection (commit 7a1fac7) — the
 * canonical LandingPage.tsx:498-555 anatomy. A SECOND useSectionProgress
 * instance scrubs the expanding ring system (scale / ring opacity / violet
 * core growth / milestone ignition, all pure CSS on --sp), while CountUp
 * carries the platform's REAL live figures — the two values the public
 * stats surface actually publishes (مطعم مسجل / حساب نشط, from
 * /api/public/stats + the ISR page's server query). NEVER Madarek's or
 * Smart-Link's numbers; when the live payload is unavailable the cells
 * degrade honestly (no fabricated figures — r82 honesty policy). */

export function ProgressSection({ stats }: { stats: PublicStats | null }) {
  /* the second --sp — written on #progress, consumed by the ring system. */
  const ref = useSectionProgress<HTMLElement>()

  const cells: Array<{ value: string; label: string; note: string }> = stats
    ? [
        { value: `+${stats.totalRestaurants}`, label: "مطعم مسجل", note: "يستخدمون المنيو الرقمي" },
        { value: `+${stats.totalUsers}`, label: "حساب نشط", note: "أصحاب مطاعم ومقاهٍ على المنصة" },
      ]
    : [
        { value: "—", label: "مطعم مسجل", note: "أرقام حية من قاعدة بيانات المنصة" },
        { value: "—", label: "حساب نشط", note: "تُحدَّث لحظة بلحظة" },
      ]

  return (
    <section id="progress" ref={ref} className="ln-chapter ln-progress">
      <div className="ln-progress-grid">
        <div className="ln-progress-visual" aria-hidden="true">
          <div className="ln-progress-orbits">
            {/* expanding orbit system — scale / ring opacity / core growth /
                milestone ignition are all scrubbed by the section's --sp */}
            <span className="ln-progress-ring r0" />
            <span className="ln-progress-ring r1" />
            <span className="ln-progress-ring r2" />
            <span className="ln-progress-ring r3" />
            <span className="ln-progress-core" />
            <span className="ln-progress-milestone m0" />
            <span className="ln-progress-milestone m1" />
            <span className="ln-progress-milestone m2" />
            <span className="ln-progress-milestone m3" />
            <span className="ln-progress-label"><span className="ln-mono">GROW · قاعدة المطاعم تتّسع</span></span>
          </div>
        </div>

        <div className="ln-progress-copy">
          <span className="ln-label">{"03 — التقدّم"}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            مطعمك يكبر مع <em>كلّ طلب</em>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            لوحة تحكم عربية تمنحك صورة أفضل عن عملك: طلبات المنيو لحظة
            بلحظة، وفئاتك وأصنافك تحت سيطرتك الكاملة — أرقام حقيقية،
            بصياغة تخدم قرارك.
          </RevealCssClass>

          <div className="ln-progress-stats">
            {cells.map((s, i) => (
              <RevealCssClass as="div" className="ln-stat" key={s.label} delay={(i + 1) as 1 | 2}>
                <div className="ln-stat-value"><CountUp value={s.value} /></div>
                <div className="ln-stat-label">{s.label}</div>
                <div className="ln-stat-note">{s.note}</div>
              </RevealCssClass>
            ))}
          </div>

          <RevealCssClass as="p" className="ln-progress-source" delay={4}>
            أرقام حية من قاعدة بيانات المنصة — لا أرقام تسويقية.
          </RevealCssClass>
        </div>
      </div>
    </section>
  )
}
