"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { springDefault, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { GlowPool } from "@/components/ui/GlowPool"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

export default function FinalCTASection() {
  return (
    <SectionContainer className="border-t border-orange/10">
      {/* Background image — subtle */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <OptimizedImage
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=85"
          alt=""
          className="absolute inset-0"
          imageClassName="object-cover opacity-[0.03]"
          skeleton={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      {/* Glow pools */}
      <GlowPool position="top-0 start-0" size="size-80 sm:size-96" color="orange/30" />
      <GlowPool position="bottom-0 end-0" size="size-80 sm:size-96" color="orange/25" />

      {/* Ring accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full border border-orange/10 pointer-events-none z-0" />

      <div className="relative z-10 text-center">
        <SectionHeader
          icon={<Sparkles className="size-3" />}
          eyebrow=""
          title="جهّز مطعمك للانطلاق الرقمي"
          subtitle={
            <>
              انطلق الآن — انضم إلى <span className="font-bold text-foreground">أكثر من 500 مطعم ومقهى</span>.
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
              <Button size="lg">ابدأ مجاناً <ArrowLeft className="size-4 sm:size-5" /></Button>
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
