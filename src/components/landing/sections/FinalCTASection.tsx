"use client"

import Link from "next/link"
import { m } from "motion/react"
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { Button } from "@/components/ui/button"
import { springDefault, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toArabicNumber } from "@/lib/format"

export function FinalCTASection({ totalRestaurants }: { totalRestaurants?: number }) {
  // Real count from fetchPublicStats — never fabricate marketing numbers
  // (HeroSection pattern, round 82). Section stays useful even when the
  // count is unknown: the trust line renders without a number.
  const trustCount = totalRestaurants && totalRestaurants > 0 ? totalRestaurants : 0;
  return (
    <SectionContainer className="aurora-wash border-t border-accent-foreground/15">
      {/* ponytail: removed Unsplash external image (caused 500/503 from Next.js Image Optimization).
           Replaced with pure CSS subtle pattern. Upgrade to a localized blurred photo if marketing needs it. */}
      {/* r95: washes orange → accent-foreground tokens */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-accent-foreground/[0.02] via-transparent to-accent-foreground/[0.01]" />

      {/* Ring accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[min(60vmin,720px)] rounded-full border border-accent-foreground/10 pointer-events-none z-0" />

      <div className="relative z-10 text-center">
        <ScrollReveal y={20}>
          <SectionHeader
            title="جهّز مطعمك للانطلاق الرقمي"
            subtitle={
              <>
                {trustCount > 0 ? (
                  <>
                    انطلق الآن. انضم إلى{" "}
                    <span className="font-bold text-foreground">
                      {/* r93-W2a (U3): toArabicNumber بدل toLocaleString("ar") — أرقام غربية
                          (سياسة المنصة/StatsSection) وصياغة SSR-stable بلا اعتماد ICU
                          قد يختلف بين الخادم والعميل عند ≥1000. */}
                      أكثر من {toArabicNumber(trustCount)} مطعم ومقهى
                    </span>
                    .{" "}
                  </>
                ) : (
                  <>انطلق الآن. انضم إلى عائلتنا. </>
                )}
                استقبل الطلبات عبر واتساب وابدأ في دقائق.
              </>
            }
          />
        </ScrollReveal>

        <ScrollReveal y={20} delay={150}>
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springSnappy, delay: 0.4 }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <m.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <Link href="/subscribe">
                <Button variant="flame" size="lg">ابدأ مجاناً <MotionArrowRight className="size-4 sm:size-5 rtl:rotate-180" /></Button>
              </Link>
            </m.div>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                عرض الخطط
              </Button>
            </Link>
          </m.div>
        </ScrollReveal>

        <ScrollReveal y={10} delay={250}>
          <m.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...springDefault, delay: 0.5 }}
            className="text-xs text-muted-foreground/60 mt-6"
          >
            مجاناً بدون بطاقة ائتمان · إلغاء في أي وقت · دعم فني متكامل
          </m.p>
        </ScrollReveal>
      </div>
    </SectionContainer>
  )
}
