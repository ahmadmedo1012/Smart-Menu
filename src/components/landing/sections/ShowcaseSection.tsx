"use client"

import { useRef } from "react"
import Image from "next/image"
import { m, useScroll, useTransform } from "motion/react"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { ClipPathReveal } from "@/components/ui/clip-path-reveal"

export function ShowcaseSection() {
        const ref = useRef<HTMLDivElement>(null)
        const { scrollYProgress } = useScroll({
                target: ref,
                offset: ["start end", "end start"],
        })

        const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 0.92])
        const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40])

        return (
                <SectionContainer ref={ref}>
                        <ScrollReveal y={20}>
                                {/* r95: الإيقاع الموحد — رأس مركزي (SectionHeader يتكفل بالفاصل المتدرج) */}
                                <SectionHeader
                                        title="منيو يشرح نفسه"
                                        subtitle="تجربة رقمية واضحة تعرض أصنافك وتوصل الطلب إلى واتساب دون خطوات مربكة."
                                />
                        </ScrollReveal>

                        <ScrollReveal y={30} delay={100}>
                                <ClipPathReveal direction="up" duration={800}>
                                        <div className="relative bg-foreground/[0.035] dark:bg-white/[0.045] p-1.5 sm:p-2 rounded-2xl ring-1 ring-foreground/10 dark:ring-white/10">
                                                {/* r96-W4a: الظل الداخلي الرمزي — color-mix من --foreground
                                                    (يعمل في الوضعين: داكن = خط فاتح يشابه الأصل؛ فاتح = خط داكن) */}
                                                <div className="relative overflow-hidden rounded-[calc(1rem-0.375rem)] sm:rounded-[calc(1rem-0.5rem)] shadow-[inset_0_1px_1px_color-mix(in_oklab,var(--foreground)_15%,transparent)]">
                                                        <m.div style={{ scale: imageScale, y: imageY }}>
                                                                <Image
                                                                        src="/main21.webp"
                                                                        alt="معاينة المنيو الرقمي الذكي من الربط الذكي"
                                                                        width={1536}
                                                                        height={1024}
                                                                        className="w-full h-[360px] sm:h-[460px] md:h-[560px] object-cover"
                                                                        priority
                                                                />
                                                        </m.div>

                                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/25" />
                                                </div>
                                        </div>
                                </ClipPathReveal>

                                {/* r95: توهج أرضي — token accent بدل orange */}
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-48 sm:size-64 rounded-full bg-accent-foreground/10 blur-[80px] pointer-events-none" />
                        </ScrollReveal>
                </SectionContainer>
        )
}
