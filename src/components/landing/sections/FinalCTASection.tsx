"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { springGentle, springDefault, springSnappy } from "@/lib/motion"
import { Eyebrow } from "@/components/ui/Eyebrow"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

export default function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16 border-t border-gold/10">
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
      <div className="absolute top-0 start-0 size-80 sm:size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 end-0 size-80 sm:size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/15 blur-[120px] pointer-events-none z-0" />

      {/* Ring accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full border border-orange/5 pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={springGentle}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springDefault, delay: 0.1 }}
          >
            <Eyebrow><Sparkles className="size-3" />انطلق الآن</Eyebrow>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springDefault, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[3.5rem] font-medium leading-[1.1] mb-4 sm:mb-5 text-balance"
          >
            جهّز مطعمك <span className="text-orange">للانطلاق الرقمي</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springDefault, delay: 0.3 }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-12 max-w-xl mx-auto"
          >
            انضم إلى <span className="font-bold text-foreground">أكثر من 500 مطعم ومقهى</span>.
            استقبل الطلبات عبر واتساب وابدأ في دقائق.
          </motion.p>

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
              <Link href="/subscribe"><Button size="lg">ابدأ مجاناً <ArrowLeft className="size-4 sm:size-5" /></Button></Link>
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
            className="text-xs text-gold/60 mt-6"
          >
            انضم إلى أكثر من 500 مطعم
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...springDefault, delay: 0.5 }}
            className="text-xs text-muted-foreground/60 mt-6"
          >
            مجاناً بدون بطاقة ائتمان · إلغاء في أي وقت · دعم فني متكامل
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
