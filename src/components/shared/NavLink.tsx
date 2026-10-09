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
}

/*
 * r131-F4 (A1 P0-7 — fleet ruling "sidebar 30px r8 3px-START rail"): the
 * Madarek nav item (layout.css:121-174, SO shell.tsx twin):
 *   · 30px compact height (was min-h-11 44px), r-sm 8 (was r-xl 12),
 *     13px/500 label (SM text-sm = 13px).
 *   · active = gold wash (bg-orange/12) + ink label + the dark-mode gold
 *     halo; inactive hover = surface-2 (bg-muted), not a gold tint.
 *   · the accent rail is 3px × 16px on the inline-START edge
 *     (-start-[3px], rounded-e-full — 3px rail, radius clamps to fully-rounded ends) — was a 2px × 24px bar on the
 *     inline-END edge (the wrong side in RTL chrome). The layoutId spring
 *     pop between items stays (framer pop is sanctioned).
 *   · icon bounce retired: no group-hover scale-110, no drop-shadow glow —
 *     quiet chrome; the icon just takes the accent ink when active.
 */
export function NavLink({ href, label, icon: Icon, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive =
    pathname === href || (href !== "/" && href !== "/owner" && pathname.startsWith(href + "/"))

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-[30px] items-center gap-2.5 overflow-hidden rounded-sm px-3 py-1 text-sm font-medium transition-[color,background-color,box-shadow] duration-fast ease-[var(--ease,cubic-bezier(0.4,0,0.2,1))] outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        isActive
          ? "bg-orange/12 font-semibold text-foreground shadow-xs dark:shadow-[0_0_18px_-4px_rgb(233_180_76/0.16),inset_0_0_0_1px_rgb(233_180_76/0.10)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isActive && (
        <LayoutMotion>
          <m.span
            layoutId="activeNavIndicator"
            className="absolute -start-[3px] top-[calc(50%-8px)] block h-4 w-[3px] rounded-e-full bg-[var(--accent-solid)]"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        </LayoutMotion>
      )}
      {isActive && <span className="sr-only">(الصفحة الحالية)</span>}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-fast",
          isActive && "text-accent-foreground",
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
