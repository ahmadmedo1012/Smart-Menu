"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface WorkspaceCardProps {
  children: ReactNode
  className?: string
  padding?: "sm" | "md" | "lg"
  glow?: boolean
}

export function WorkspaceCard({ children, className, padding = "md", glow = false }: WorkspaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 20, mass: 0.9 }}
      className={cn(
        "rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-glass transition-all duration-300 hover:shadow-glass-lg group",
        glow && "hover:border-orange/20",
        padding === "sm" && "p-4",
        padding === "md" && "p-5 md:p-6",
        padding === "lg" && "p-6 md:p-8",
        className
      )}
    >
      {glow && (
        <div className="absolute -inset-2 bg-gradient-radial from-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}
