"use client";

import { type ReactNode } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { springGentle, springSnappy } from "@/lib/motion";
import { Eyebrow } from "./Eyebrow";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  className?: string;
  icon?: ReactNode;
  align?: "center" | "start";
};

const fadeUpSpring = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springGentle },
};

const fadeUpSnappy = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
};

export function SectionHeader({ eyebrow, title, subtitle, className, icon, align = "center" }: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className={cn(
        "mb-14 sm:mb-20",
        centered ? "text-center" : "text-start",
        className
      )}
    >
      {eyebrow && (
        <m.div variants={fadeUpSnappy}>
          <Eyebrow className={centered ? "justify-center" : "justify-start"}>
            {icon}{icon && " "}{eyebrow}
          </Eyebrow>
        </m.div>
      )}
      {title && (
        <m.h2
          variants={fadeUpSpring}
          className={cn(
            "text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold leading-[1.25] tracking-tight text-balance",
            centered ? "mx-auto" : "max-w-2xl"
          )}
        >
          {title}
        </m.h2>
      )}
      {subtitle && (
        <m.p
          variants={fadeUpSnappy}
          className={cn(
            "text-base text-muted-foreground/90 mt-4 max-w-[48ch] leading-relaxed",
            centered ? "mx-auto" : ""
          )}
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
