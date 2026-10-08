"use client";

import { type ReactNode } from "react";
import { m } from "motion/react";
import { springGentle, springSnappy } from "@/lib/motion";

// r121-O-4: reduced to the API the 7 landing callers actually use (title +
// subtitle only). The speculative eyebrow/icon/align/className props and the
// never-taken non-centered branch were deleted — eyebrow styling still exists
// via the standalone <Eyebrow> component (HeroSection uses it directly).
type SectionHeaderProps = {
  title?: string;
  subtitle?: ReactNode;
};

const fadeUpSpring = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springGentle },
};

const fadeUpSnappy = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className="mb-14 sm:mb-20 text-center"
    >
      {title && (
        <m.h2
          variants={fadeUpSpring}
          /* r126 (P4-W3b / audit E1): tracking-tight حُذفت — قانون مدارك: تباعد
             حروف صفري على العربية (الحارس rtl يصفّرها أصلًا — صنف ميت يضلّل). */
          className="text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold leading-[1.25] text-balance mx-auto"
        >
          {title}
        </m.h2>
      )}
      {subtitle && (
        <m.p
          variants={fadeUpSnappy}
          className="text-base text-muted-foreground/90 mt-4 max-w-[48ch] leading-relaxed mx-auto"
        >
          {subtitle}
        </m.p>
      )}
      {/* r95: SmartBot twin — فاصل متدرج بعد رأس القسم (مواصفة §4) */}
      {title && (
        <m.div variants={fadeUpSnappy} aria-hidden="true">
          <div className="mx-auto mt-6 w-16 h-[2px] rounded-full bg-gradient-to-r from-accent-foreground/0 via-accent-foreground to-accent-foreground/0" />
        </m.div>
      )}
    </m.div>
  );
}
