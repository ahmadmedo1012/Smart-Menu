"use client"

import Link from "next/link"
import { motion } from "motion/react"
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import { Button } from "@/components/ui/button"
import { springDefault, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { GlowPool } from "@/components/ui/GlowPool"

export function FinalCTASection({ totalRestaurants }: { totalRestaurants?: number }) {
  // Real count from fetchPublicStats — never fabricate marketing numbers
  // (HeroSection pattern, round 82). Section stays useful even when the
  // count is unknown: the trust line renders without a number.
  const trustCount = totalRestaurants && totalRestaurants > 0 ? totalRestaurants : 0;
  return (
    <SectionContainer className="border-t border-orange/10">
      {/* ponytail: removed Unsplash external image (caused 500/503 from Next.js Image Optimization).
           Replaced with pure CSS subtle pattern. Upgrade to a localized blurred photo if marketing needs it. */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-orange/[0.02] via-transparent to-orange/[0.01]" />

      {/* Glow pools */}
      <GlowPool position="top-0 start-0" size="size-80 sm:size-96" color="orange/30" />
      <GlowPool position="bottom-0 end-0" size="size-80 sm:size-96" color="orange/25" />

      {/* Ring accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full border border-orange/10 pointer-events-none z-0" />

      <div className="relative z-10 text-center">
        <SectionHeader
          icon={<AnimatedSparkles className="size-3" />}
          title="جهّز مطعمك للانطلاق الرقمي"
          subtitle={
            <>
              {trustCount > 0 ? (
                <>
                  انطلق الآن — انضم إلى{" "}
                  <span className="font-bold text-foreground">
                    أكثر من {trustCount.toLocaleString("ar")} مطعم ومقهى
                  </span>
                  .{" "}
                </>
              ) : (
                <>انطلق الآن — انضم إلى عائلتنا. </>
              )}
              استقبل الطلبات عبر واتساب وابدأ في دقائق.
            </>
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springSnappy, delay: 0.4 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Link href="/subscribe">
              <Button size="lg">ابدأ مجاناً <MotionArrowLeft className="size-4 sm:size-5" /></Button>
            </Link>
          </motion.div>
          <Link href="/pricing">
            <Button variant="outline" size="lg">
              عرض الخطط
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ ...springDefault, delay: 0.5 }}
          className="text-xs text-muted-foreground/60 mt-6"
        >
          مجاناً بدون بطاقة ائتمان · إلغاء في أي وقت · دعم فني متكامل
        </motion.p>
      </div>
    </SectionContainer>
  )
}
