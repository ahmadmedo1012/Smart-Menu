"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { m } from "motion/react"
import { LayoutMotion } from "@/components/motion/LazyMotionProvider"
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
    : pathname === href || (href !== "/" && href !== "/owner" && pathname.startsWith(href + "/"))

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-orange/60",
        isActive
          ? "bg-orange/12 text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-orange/8 hover:text-foreground",
      )}
    >
      {isActive && (
        <LayoutMotion>
          <m.span
            layoutId="activeNavIndicator"
            className="absolute end-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-orange"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        </LayoutMotion>
      )}
      {isActive && <span className="sr-only">(الصفحة الحالية)</span>}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-[color,transform,translate,scale,rotate,filter] duration-200",
          isActive && "text-orange",
          !isActive && "group-hover:scale-110 group-hover:text-primary/70 group-hover:drop-shadow-sm",
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
