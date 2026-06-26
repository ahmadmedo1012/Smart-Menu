"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";
import PhoneMockup from "./PhoneMockup";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Launch-grade hero — cinematic composition, dramatic phone, premium typography */
export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative min-h-[90dvh] flex items-center overflow-hidden pt-28 pb-20">
      {/* Deep ambient layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/5 to-background" />

      {/* Large ambient blobs — slow breath */}
      <motion.div
        className="absolute top-0 start-0 size-[70vw] rounded-full bg-gradient-to-br from-gold/5 to-transparent pointer-events-none"
        style={{ filter: "blur(140px)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 end-0 size-[60vw] rounded-full bg-gradient-to-tr from-gold/3 to-transparent pointer-events-none"
        style={{ filter: "blur(120px)" }}
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.4) 0.5px, transparent 0.5px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <motion.div
          className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Text column — right in RTL */}
          <div className="text-center lg:text-right order-last lg:order-first">
            {/* Kicker */}
            <motion.div variants={childVariants} className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold tracking-widest uppercase text-gold border border-gold/20 rounded-full">
                <span className="size-1.5 rounded-full bg-gold" />
                منيو رقمي • طلب فوري
              </div>
            </motion.div>

            {/* Headline — larger, tighter tracking, dramatic */}
            <motion.h1
              variants={childVariants}
              className="mt-6 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.9] tracking-tight text-balance text-foreground"
            >
              حوّل مطعمك
              <br />
              إلى{" "}
              <span className="text-gold relative">
                تجربة رقمية
                <span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gold/20"
                  style={{ transform: "scaleX(1.05)" }}
                />
              </span>
            </motion.h1>

            {/* Subheading — calmer, wider */}
            <motion.p
              variants={childVariants}
              className="text-base sm:text-lg text-muted-foreground mt-6 mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed"
            >
              منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={childVariants} className="flex gap-4 justify-center lg:justify-start flex-wrap">
              <Link href="/subscribe">
                <Button
                  className="bg-gold text-gold-foreground hover:opacity-90 px-10 h-14 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 text-base"
                  size="lg"
                >
                  ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href={`/menu/${PARTNERS[0].slug}`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-10 h-14 border-2 hover:border-gold/40 hover:text-foreground text-base"
                >
                  عرض منيو تجريبي
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={childVariants}
              className="mt-8 flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground"
            >
              <Star className="size-4 fill-gold text-gold" />
              <span>
                يثق بنا أكثر من{" "}
                <span className="font-bold text-foreground">
                  {stats?.totalRestaurants ?? "..."}
                </span>{" "}
                مطعماً ومقهى
              </span>
            </motion.div>
          </div>

          {/* Phone column — left in RTL */}
          <motion.div
            variants={childVariants}
            className="order-first lg:order-last flex justify-center lg:justify-end"
          >
            <PhoneMockup tilt />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <span className="text-[10px] font-medium tracking-widest uppercase">اسحب لأسفل</span>
          <motion.div
            className="size-4 rounded-full border border-muted-foreground/30 flex items-center justify-center"
            animate={{ y: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="size-1.5 rounded-full bg-gold/60" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
