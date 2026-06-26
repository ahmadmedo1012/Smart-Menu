"use client";
import { motion } from "framer-motion";
import { STEPS } from "./landing-data";

export default function HowItWorksSection() {
  if (STEPS.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] as const }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">انطلق في ثلاث خطوات</h2>
          <p className="text-lg text-muted-foreground">من التسجيل إلى أول طلب في دقائق</p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-gold/60 via-gold/30 to-gold/60" />
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 1,
                  delay: i * 0.25,
                  ease: [0.19, 1, 0.22, 1] as const,
                }}
              >
                <div className="text-center">
                  <div className="relative mb-5 inline-flex">
                    <div className="size-16 rounded-2xl bg-gold flex items-center justify-center mx-auto shadow-xl shadow-gold/20">
                      <step.icon className="size-7 text-gold-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
