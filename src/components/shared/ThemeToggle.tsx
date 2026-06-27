"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"

  if (!mounted) {
    return <div className={cn("size-9", className)} aria-hidden="true" />
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      className={cn(
        "relative size-9 rounded-sm",
        "bg-card border border-border/30",
        "transition-all duration-200",
        "hover:bg-orange-muted hover:border-orange/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
        "active:scale-95",
        "cursor-pointer",
        "flex items-center justify-center",
        className
      )}
    >
      <Sun className={cn("size-4 transition-all duration-200", isDark ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100")} />
      <Moon className={cn("size-4 text-orange transition-all duration-200", isDark ? "opacity-100 scale-100" : "opacity-0 scale-0 absolute")} />
    </button>
  )
}
