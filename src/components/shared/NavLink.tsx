"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NavLinkProps {
  href: string
  label: string
  icon: LucideIcon
  onClick?: () => void
  exact?: boolean
}

export function NavLink({ href, label, icon: Icon, onClick, exact }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname === href || (href !== "/" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
        isActive
          ? "bg-gradient-to-r from-amber-500/15 to-amber-600/10 text-foreground shadow-sm dark:from-amber-400/15 dark:to-amber-500/10"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="absolute end-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30 dark:from-amber-400 dark:to-amber-500 animate-scale-in" />
      )}
      {isActive && <span className="sr-only">(الصفحة الحالية)</span>}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-all duration-300",
          isActive && "text-amber-600 dark:text-amber-400",
          !isActive && "group-hover:scale-110 group-hover:text-amber-500/70",
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
