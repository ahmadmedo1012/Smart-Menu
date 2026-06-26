"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Full-bleed CTA — dark gold ribbon with dramatic typography */
export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Dark gold ribbon */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-background to-gold/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

      {/* Decorative circles */}
      <div
        className="absolute top-0 start-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-[120px] pointer-events-none"
      />
      <div
        className="absolute bottom-0 end-0 size-80 translate-x-1/3 translate-y-1/3 rounded-full bg-gold/10 blur-[120px] pointer-events-none"
      />

      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] as const }}
        >
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/20 rounded-full">
            انطلق الآن
          </span>

          <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] mb-5 text-balance">
            مستعد لانطلاق
            <br />
            <span className="text-gold">مطعمك الرقمي؟</span>
          </h2>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl mx-auto">
            انضم إلى {""}
            <span className="font-bold text-foreground">عشرات المطاعم والمقاهي</span>
            . استقبل الطلبات عبر واتساب بدون وسيط — وابدأ في دقائق.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/subscribe">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className="bg-gold text-gold-foreground hover:opacity-90 px-12 h-14 shadow-xl shadow-gold/20 hover:shadow-2xl hover:shadow-gold/30 text-base"
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
                className="px-12 h-14 border-2 hover:border-gold/40 hover:text-foreground text-base"
              >
                عرض الخطط
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-6">
            مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت • دعم فني متكامل
          </p>
        </motion.div>
      </div>
    </section>
  );
}
