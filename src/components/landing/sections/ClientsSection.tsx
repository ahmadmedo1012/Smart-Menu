"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {Quote} from 'lucide-react';
import { MotionChevronLeft } from '@/components/ui/motion-icons';
import AnimatedStar from '@/components/ui/star-icon';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { AvatarInitials } from "@/components/ui/AvatarInitials"
import { springGentle, springSnappy } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Partner data ── */
const PARTNERS = [
  { name: "مقهى الواحة" }, { name: "مطعم الأصيل" }, { name: "بيتزا روما" },
  { name: "SOHO" }, { name: "Telepizza" }, { name: "The Cheese" },
  { name: "Empire" }, { name: "Kubaba" },
]

/* ── Testimonials ── */
const TESTIMONIALS = [
  { quote: "المنصة سهلت علينا عملية الطلب بشكل كبير. عملاؤنا صاروا يطلبون بضغطة زر والطلبات تصلنا منظمة بدون أخطاء.", name: "SOHO", designation: "مقهى، طرابلس" },
  { quote: "نظام المنيو الرقمي والواتساب المتكامل خلى طلبات التيك أوي أسرع وأدق. صارت الأخطاء أقل بكثير.", name: "Telepizza", designation: "مطعم بيتزا، بنغازي" },
  { quote: "برنامج الولاء حفز عملاءنا على الطلب المتكرر. النقاط والمكافآت صارت جزءاً من تجربتهم معنا.", name: "The Cheese", designation: "مطعم برغر، مصراتة" },
  { quote: "سهولة استخدام المنيو الرقمي وربطه بالواتساب وفر علينا وقت وجهد كبيرين. تجربة ممتازة.", name: "Empire", designation: "مقهى، طرابلس" },
  { quote: "الإحصائيات والتقارير ساعدتنا نفهم سلوك الزبائن ونطور الخدمة بثقة.", name: "Kubaba", designation: "مطعم، بنغازي" },
  { quote: "الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا. الطلبات تصل مرتبة وواضحة.", name: "أحمد المبروك", designation: "مقهى الواحة، طرابلس" },
  { quote: "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. لاحظنا فرقاً واضحاً في المبيعات.", name: "عمر بن عاشور", designation: "بيتزا روما، مصراتة" },
]

/* ── Partner marquee ── */
function PartnerMarquee() {
  return (
    <div className="mb-12 sm:mb-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 sm:grid-cols-4">
      {PARTNERS.map((p) => (
        <div key={p.name} className="bg-card px-4 py-5 text-center text-sm font-semibold text-muted-foreground/80">
          {p.name}
        </div>
      ))}
    </div>
  )
}

/* ── Testimonial card ── */
function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="text-center"
    >
      {/* Quote mark */}
      <Quote className="size-6 sm:size-7 mx-auto mb-3 sm:mb-4 text-orange/30" />

      {/* Stars */}
      <div className="flex justify-center gap-1 mb-4">
        {[...Array(5)].map((_, j) => (
          <AnimatedStar key={j} className="size-[13px] sm:size-[14px] fill-orange text-orange/80" />
        ))}
      </div>

      <blockquote className="text-[0.9rem] sm:text-[1rem] leading-[1.75] text-muted-foreground/85 mb-5 sm:mb-6 font-[430] max-w-lg mx-auto">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <div className="flex items-center justify-center gap-3">
        <AvatarInitials name={t.name} />
        <div className="text-right rtl:text-left">
          <p className="text-sm font-[500] text-foreground/90">{t.name}</p>
          <p className="text-[0.75rem] text-muted-foreground/60 mt-0.5">{t.designation}</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Navigation pills ── */
function NavPill({
  i, active, onClick,
}: {
  i: number; active: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full transition-[width,height,background-color] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]",
        i === active ? "w-6 h-[5px] bg-orange" : "w-[5px] h-[5px] bg-border/50 hover:bg-orange/40",
      )}
      aria-label={`التقييم ${i + 1}`}
    />
  )
}

/* ── Root ── */
export function ClientsSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const n = TESTIMONIALS.length

  const goTo = useCallback((i: number) => setActive(((i % n) + n) % n), [n])
  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const prev = useCallback(() => goTo(active - 1), [active, goTo])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(next, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [next, paused])

  const activeT = TESTIMONIALS[active]

  return (
    <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.012] to-background">
      <SectionHeader title="تجارب من المطاعم" subtitle="ما يقوله أصحاب المطاعم عن إدارة المنيو والطلبات يومياً." />

      {/* Partner strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...springGentle, delay: 0.05 }}
      >
        <PartnerMarquee />
      </motion.div>

      {/* Testimonial panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ ...springGentle, delay: 0.1 }}
        className="max-w-lg mx-auto"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative rounded-[20px] bg-card ring-1 ring-border/40 p-6 sm:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            <TestimonialCard key={active} t={activeT} />
          </AnimatePresence>

          {/* Navigation */}
          {n > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-border/30">
              <button
                onClick={prev}
                className="group size-9 rounded-full bg-background/80 border border-border/40 flex items-center justify-center hover:bg-orange hover:border-orange/50 hover:text-white transition-[color,background-color,border-color] duration-300 text-muted-foreground/50"
                aria-label="السابق"
              >
                <MotionChevronRight className="size-4 group-hover:text-white transition-colors" />
              </button>
              <div className="flex gap-1.5">
                {TESTIMONIALS.map((_, i) => (
                  <NavPill key={i} i={i} active={active} onClick={() => goTo(i)} />
                ))}
              </div>
              <button
                onClick={next}
                className="group size-9 rounded-full bg-background/80 border border-border/40 flex items-center justify-center hover:bg-orange hover:border-orange/50 hover:text-white transition-[color,background-color,border-color] duration-300 text-muted-foreground/50"
                aria-label="التالي"
              >
                <MotionChevronLeft className="size-4 group-hover:text-white transition-colors" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trust badge — social proof */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...springSnappy, delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10 text-xs text-muted-foreground/50"
      >
        {["متجر رسمي", "دعم فني متكامل", "تحديثات مستمرة", "ضمان استرداد"].map((label) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-orange/50" />
            {label}
          </span>
        ))}
      </motion.div>
    </SectionContainer>
  )
}
