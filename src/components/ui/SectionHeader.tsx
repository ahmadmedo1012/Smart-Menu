"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springGentle, springSnappy } from "@/lib/motion";
import { Eyebrow } from "./Eyebrow";

type SectionHeaderProps = {
  eyebrow: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

const fadeUpSpring = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springGentle },
};

const fadeUpSnappy = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
};

export function SectionHeader({ eyebrow, title, subtitle, className, icon }: SectionHeaderProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className={cn("text-center mb-12 sm:mb-14", className)}
    >
      <motion.div variants={fadeUpSnappy}>
        <Eyebrow className="mb-5">{icon}{icon && " "}{eyebrow}</Eyebrow>
      </motion.div>
      {title && (
        <motion.h2
          variants={fadeUpSpring}
          className="text-[1.8rem] sm:text-3xl md:text-[2.75rem] font-semibold leading-[1.2]"
        >
          {title}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p
          variants={fadeUpSnappy}
          className="text-sm text-muted-foreground/70 mt-3 max-w-lg mx-auto"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
