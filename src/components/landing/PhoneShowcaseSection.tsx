"use client";

import { motion } from "framer-motion";
import { PhoneMockup } from "./PhoneMockup";

const CINEMATIC_EASE = [0.16, 1, 0.2, 1] as const;

export default function PhoneShowcaseSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      {/* Gold ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold/[0.02] to-background pointer-events-none" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full pointer-events-none"
        animate={{ opacity: [0.12, 0.25, 0.12], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: CINEMATIC_EASE }}
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.72 0.16 55 / 0.08) 0%, transparent 70%)",
          filter: "blur(140px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Eyebrow tag — double-bezel */}
        <motion.div
          className="inline-flex p-[1px] rounded-full bg-gradient-to-r from-gold/30 via-gold/10 to-gold/30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: CINEMATIC_EASE }}
        >
          <span className="px-4 py-1.5 rounded-full bg-background text-[10px] font-semibold tracking-[0.2em] uppercase text-gold">
            شاهد المنيو الذكي
          </span>
        </motion.div>

        {/* Phone — giant, centered, golden */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: CINEMATIC_EASE }}
          className="w-[75vw] max-w-[400px]"
        >
          <PhoneMockup tilt className="w-full" />
        </motion.div>
      </div>
    </section>
  );
}
