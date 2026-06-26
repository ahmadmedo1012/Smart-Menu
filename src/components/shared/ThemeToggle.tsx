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
        <div className="size-full rounded-sm bg-card/10 dark:bg-card/10" />
      </div>
    )
  }

  return (
    <div className={cn("size-10", className)}>
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "relative size-10 rounded-sm",
          "bg-card/10 dark:bg-card/10",
          "backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "shadow-lg shadow-orange/10 dark:shadow-orange/20",
          "transition-all duration-300",
          "hover:bg-white/20 dark:hover:bg-black/20",
          "hover:border-white/30 dark:hover:border-white/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
          "active:scale-95",
          "cursor-pointer",
          "flex items-center justify-center",
          "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-sm",
            "bg-gradient-to-br from-orange/20 via-transparent to-orange/30",
            "opacity-0 hover:opacity-100 transition-opacity duration-300",
            "dark:from-orange/30 dark:via-transparent dark:to-orange/40"
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
          <Sun className="size-full text-orange" />
        </span>

        <span
          className={cn(
            "relative size-5 transition-all duration-300",
            isDark
              ? "-rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 opacity-100"
          )}
        >
          <Moon className="size-full text-orange" />
        </span>

        <div
          className={cn(
            "absolute inset-0 rounded-sm",
            "bg-gradient-to-br from-transparent via-white/5 to-transparent",
            "opacity-0 hover:opacity-100 transition-opacity duration-300"
          )}
        />
      </button>
    </div>
  )
}
