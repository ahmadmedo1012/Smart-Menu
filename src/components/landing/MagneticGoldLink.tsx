"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useMagnetic } from "@/hooks/useMagnetic"

/* r142 (task 2-b) — the ember conversion pill with the canonical magnetic
   pull (PORT-KIT §4: hero/finale CTA strength 7; r141-era name kept for
   API stability, the paint is المائدة now). Client island around the
   anchor so the surrounding page stays server-rendered; useMagnetic
   writes --mag-x/--mag-y, the CSS in landing.css consumes them.
   r129 P2 stands: next/link, not a plain <a> — the PRIMARY CTA must not
   do a full MPA document navigation. */

export function MagneticGoldLink({
  href,
  external = false,
  xl = false,
  withArrow = false,
  children,
  ariaLabel,
}: {
  href: string
  external?: boolean
  xl?: boolean
  withArrow?: boolean
  children: ReactNode
  ariaLabel?: string
}) {
  const ref = useMagnetic<HTMLAnchorElement>(7)

  return (
    <Link
      ref={ref}
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`ln-btn-ember${xl ? " xl" : ""}`}
      aria-label={ariaLabel}
    >
      {children}
      {withArrow && <ArrowLeft size={xl ? 16 : 14} aria-hidden="true" />}
    </Link>
  )
}
