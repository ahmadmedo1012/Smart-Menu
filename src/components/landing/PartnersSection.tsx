"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Store } from "lucide-react";
import { PARTNERS } from "./landing-data";
import { cn } from "@/lib/utils";

export default function PartnersSection() {
  const [activePartner, setActivePartner] = useState(0);

  if (PARTNERS.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] as const }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">جرب منيو تجريبي</h2>
          <p className="text-lg text-muted-foreground">اختر مطعماً وشاهد كيف يعمل</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.1, ease: [0.19, 1, 0.22, 1] as const }}
        >
          <div className="flex gap-2 justify-center mb-10 flex-wrap">
            {PARTNERS.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePartner(i)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activePartner === i
                    ? "bg-gold text-gold-foreground shadow-lg shadow-gold/25"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/30",
                )}
              >
                <Store className="size-3.5 inline-block me-1.5 -mt-0.5" />
                {p.name}
              </button>
            ))}
          </div>
        </motion.div>
        <motion.div key={activePartner} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] as const }}>
          <Link
            href={`/menu/${PARTNERS[activePartner].slug}`}
            className="block max-w-md mx-auto rounded-2xl border border-border/20 bg-card/40 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold-muted/60 hover:shadow-lg text-center"
          >
            <div className="size-14 rounded-2xl bg-gold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold/20">
              <Store className="size-7 text-gold-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">{PARTNERS[activePartner].name}</h3>
            <p className="text-sm text-muted-foreground mb-5">{PARTNERS[activePartner].desc}</p>
            <div className="inline-flex items-center gap-2 text-sm text-gold-foreground font-medium bg-gold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
              <span>عرض المنيو التجريبي</span>
              <ArrowLeft className="size-4" />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
