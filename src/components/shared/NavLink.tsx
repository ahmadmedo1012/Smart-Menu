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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
        isActive
          ? "bg-gradient-to-r from-blue-500/15 to-blue-600/10 text-foreground shadow-xs dark:from-blue-400/15 dark:to-blue-500/10"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="absolute end-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-sm shadow-blue-500/20 dark:from-blue-400 dark:to-blue-500 animate-scale-in" />
      )}
      {isActive && <span className="sr-only">(الصفحة الحالية)</span>}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-all duration-200",
          isActive && "text-blue-600 dark:text-blue-400",
          !isActive && "group-hover:scale-110 group-hover:text-primary/70 group-hover:drop-shadow-sm",
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
