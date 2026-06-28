"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const EASE: [number, number, number, number] = [0.16, 1, 0.2, 1]

export default function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      {/* Background image — subtle */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1600&q=80"
          alt=""
          className="w-full h-full object-cover opacity-[0.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      {/* Glow pools */}
      <div className="absolute top-0 start-0 size-80 sm:size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 end-0 size-80 sm:size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/15 blur-[120px] pointer-events-none z-0" />

      {/* Ring accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full border border-orange/5 pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-4 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-6"
          >
            <Sparkles className="size-3" />
            انطلق الآن
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[3.5rem] font-medium leading-[1.1] mb-4 sm:mb-5 text-balance"
          >
            جهّز مطعمك <span className="text-orange">للانطلاق الرقمي</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-12 max-w-xl mx-auto"
          >
            انضم إلى <span className="font-bold text-foreground">عشرات المطاعم والمقاهي</span>.
            استقبل الطلبات عبر واتساب وابدأ في دقائق.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Link href="/subscribe">
              <Button size="lg">
                ابدأ مجاناً <ArrowLeft className="size-4 sm:size-5" />
              </Button>
            </Link>
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
            transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
            className="text-xs text-muted-foreground/60 mt-6"
          >
            مجاناً بدون بطاقة ائتمان · إلغاء في أي وقت · دعم فني متكامل
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
