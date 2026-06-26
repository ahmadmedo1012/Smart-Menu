"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Store } from "lucide-react";
import { PARTNERS } from "./landing-data";
import { cn } from "@/lib/utils";
import { fadeUp, CINEMATIC_EASE } from "./animations";

/** Partners — pill tab switcher with animated card reveal, double-bezel card */
export default function PartnersSection() {
  const [activePartner, setActivePartner] = useState(0);

  if (PARTNERS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Ambient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-background to-gold-muted/[0.02]" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div {...fadeUp(0)} className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-5 text-gold border border-gold/20 rounded-full">
            منيو تجريبي
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance mb-3">
            جرب منيو
            <br />
            <span className="text-gold">تجريبي</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            اختر مطعماً وشاهد كيف يعمل
          </p>
        </motion.div>

        {/* Pill tabs */}
        <motion.div {...fadeUp(0.1)}>
          <div className="flex gap-2 justify-center mb-12 flex-wrap">
            {PARTNERS.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePartner(i)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activePartner === i
                    ? "bg-gold text-gold-foreground shadow-lg shadow-gold/25"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-border/20",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Animated card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePartner}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: CINEMATIC_EASE }}
          >
            <Link
              href={`/menu/${PARTNERS[activePartner].slug}`}
              className="block max-w-sm mx-auto"
            >
              {/* Double-bezel card */}
              <div className="p-[1px] rounded-2xl bg-gradient-to-b from-gold/15 to-gold/5 transition-all duration-500 hover:shadow-xl hover:shadow-gold/10 group">
                <div className="rounded-[calc(1rem-1px)] bg-card/40 p-8 md:p-10 text-center transition-all duration-500 group-hover:bg-card/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                  {/* Icon */}
                  <div className="inline-flex p-[1px] rounded-xl bg-gradient-to-b from-gold/25 to-gold/10 mb-5">
                    <div className="flex items-center justify-center size-14 rounded-[calc(0.75rem-1px)] bg-gradient-to-b from-gold to-gold/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                      <Store className="size-7 text-gold-foreground" />
                    </div>
                  </div>

                  {/* Partner name initial circle */}
                  <div className="flex justify-center mb-4">
                    <div className="size-12 rounded-full bg-gold/10 flex items-center justify-center ring-1 ring-gold/20">
                      <span className="text-lg font-bold text-gold">
                        {PARTNERS[activePartner].name.charAt(0)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-1">{PARTNERS[activePartner].name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {PARTNERS[activePartner].desc}
                  </p>

                  {/* Button-in-button: nested icon */}
                  <div className="inline-flex items-center gap-2 text-sm text-gold-foreground font-medium bg-gold px-5 py-2.5 rounded-full transition-all duration-300 group group-hover:opacity-90 group-hover:shadow-lg group-hover:shadow-gold/20">
                    <span>عرض المنيو التجريبي</span>
                    <span className="size-6 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform duration-300">
                      <ArrowLeft className="size-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
