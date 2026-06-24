"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"

  const toggle = () => {
    setAnimating(true)
    setTheme(isDark ? "light" : "dark")
    setTimeout(() => setAnimating(false), 300)
  }

  if (!mounted) {
    return (
      <div className={cn("size-10", className)} aria-hidden="true">
        <div className="size-full rounded-xl bg-card/10 dark:bg-card/10" />
      </div>
    )
  }

  return (
    <div className={cn("size-10", className)}>
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "relative size-10 rounded-xl",
          "bg-card/10 dark:bg-card/10",
          "backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
          "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
          "shadow-lg shadow-amber-500/10 dark:shadow-amber-500/20",
          "transition-all duration-300",
          "hover:bg-white/20 dark:hover:bg-black/20",
          "hover:border-white/30 dark:hover:border-white/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          "active:scale-95",
          "cursor-pointer",
          "flex items-center justify-center",
          "overflow-hidden",
          animating && "animate-wiggle",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-xl",
            "bg-gradient-to-br from-amber-500/20 via-transparent to-amber-600/20",
            "opacity-0 hover:opacity-100 transition-opacity duration-300",
            "dark:from-amber-500/30 dark:via-transparent dark:to-amber-600/30"
          )}
        />

        <span
          className={cn(
            "relative size-5 transition-all duration-300",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0 absolute"
          )}
        >
          <Sun className="size-full text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        </span>

        <span
          className={cn(
            "relative size-5 transition-all duration-300",
            isDark
              ? "-rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 opacity-100"
          )}
        >
          <Moon className="size-full text-amber-300 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
        </span>

        <div
          className={cn(
            "absolute inset-0 rounded-xl",
            "bg-gradient-to-br from-transparent via-white/5 to-transparent",
            "opacity-0 hover:opacity-100 transition-opacity duration-300"
          )}
        />
      </button>
    </div>
  )
}
