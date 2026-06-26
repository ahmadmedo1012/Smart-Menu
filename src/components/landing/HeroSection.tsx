"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";
import { PhoneMockup } from "./PhoneMockup";

/* ─── Constants ────────────────────────────────────────────────────── */

const CINEMATIC_EASE = [0.16, 1, 0.2, 1] as const;
const STAGGER_DELAY_CHILDREN = 0.12;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_DELAY_CHILDREN, delayChildren: 0.6 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 48, scale: 0.96, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.6, ease: CINEMATIC_EASE },
  },
};

const phoneVariants = {
  hidden: { opacity: 0, x: 80, rotateY: 5, scale: 0.92, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 2, ease: CINEMATIC_EASE, delay: 0.3 },
  },
};

/* ─── Main ──────────────────────────────────────────────────────────── */

/** Cinematic hero — staggered blur-in content, 3D tilted phone, gold accent */
export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-32 pb-24">
      {/* Deep ambient gradient bed */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/8 to-background" />

      {/* Massive ambient orbs — slow expand/contract */}
      <motion.div
        className="absolute top-0 start-0 size-[80vw] rounded-full bg-gradient-to-br from-gold/6 to-transparent pointer-events-none"
        style={{ filter: "blur(160px)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 end-0 size-[70vw] rounded-full bg-gradient-to-tr from-gold/4 to-transparent pointer-events-none"
        style={{ filter: "blur(140px)" }}
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle dot grid — barely there */}
      <div
        className="absolute inset-0 opacity-[0.012] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.5) 0.5px, transparent 0.5px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Text column (right in RTL) ── */}
          <div className="text-center lg:text-right order-last lg:order-first">
            {/* Kicker badge */}
            <motion.div variants={childVariants} className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-gold border border-gold/20 rounded-full">
                <span className="size-1.5 rounded-full bg-gold animate-pulse" />
                منيو رقمي • طلب فوري
              </div>
            </motion.div>

            {/* Headline — cinematic scale with gold shimmer on highlight */}
            <motion.h1
              variants={childVariants}
              className="mt-8 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.92] tracking-[-0.03em] text-balance"
            >
              حوّل مطعمك
              <br />
              إلى{" "}
              <span className="animate-hero-gold-shimmer relative">
                تجربة رقمية
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={childVariants}
              className="text-base sm:text-lg text-muted-foreground mt-6 mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed"
            >
              منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
            </motion.p>

            {/* CTA pair */}
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

            {/* Social proof row */}
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

          {/* ── Phone column (left in RTL) ── */}
          <motion.div
            variants={phoneVariants}
            className="order-first lg:order-last flex justify-center lg:justify-end"
          >
            <PhoneMockup tilt />
          </motion.div>
        </motion.div>

        {/* ── Scroll indicator ── */}
        <motion.div
          className="absolute bottom-6 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1.2 }}
        >
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase">اسحب لأسفل</span>
          <div className="animate-scroll-indicator">
            <div className="size-4 rounded-full border border-muted-foreground/20 flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-gold/50" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
