"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
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
    <motion.div
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
        <motion.div variants={fadeUpSnappy}>
          <Eyebrow className={centered ? "justify-center" : "justify-start"}>
            {icon}{icon && " "}{eyebrow}
          </Eyebrow>
        </motion.div>
      )}
      {title && (
        <motion.h2
          variants={fadeUpSpring}
          className={cn(
            "text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold leading-[1.25] tracking-tight text-balance",
            centered ? "mx-auto" : "max-w-2xl"
          )}
        >
          {title}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p
          variants={fadeUpSnappy}
          className={cn(
            "text-base text-muted-foreground/90 mt-4 max-w-[48ch] leading-relaxed",
            centered ? "mx-auto" : ""
          )}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
