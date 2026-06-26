"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Full-bleed CTA — dark gold ribbon with dramatic typography, double-bezel button */
export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32" dir="rtl">
      {/* Deep gold gradient ribbon */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-background to-gold/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

      {/* Ambient glow orbs */}
      <div className="absolute top-0 start-0 size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-gold/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 end-0 size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-gold/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[30vw] rounded-full bg-gold/[0.03] blur-[120px] pointer-events-none" />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.5) 0.5px, transparent 0.5px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] as const }}
        >
          {/* Kicker */}
          <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 text-gold border border-gold/20 rounded-full">
            انطلق الآن
          </span>

          {/* Headline — dramatic split */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5 text-balance">
            جهّز مطعمك
            <br />
            <span className="text-gold">للانطلاق الرقمي</span>
          </h2>

          {/* Subtext */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl mx-auto">
            انضم إلى{" "}
            <span className="font-bold text-foreground">عشرات المطاعم والمقاهي</span>
            . استقبل الطلبات عبر واتساب بدون وسيط — وابدأ في دقائق.
          </p>

          {/* CTAs */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/subscribe">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className="bg-gold text-gold-foreground hover:opacity-90 px-10 h-14 shadow-xl shadow-gold/20 hover:shadow-2xl hover:shadow-gold/30 text-base"
                  size="lg"
                >
                  ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="px-10 h-14 border-2 hover:border-gold/40 hover:text-foreground text-base"
              >
                عرض الخطط
              </Button>
            </Link>
          </div>

          {/* Fine print */}
          <p className="text-xs text-muted-foreground/50 mt-6">
            مجاناً بدون بطاقة ائتمان &bull; إلغاء في أي وقت &bull; دعم فني متكامل
          </p>
        </motion.div>
      </div>
    </section>
  );
}
