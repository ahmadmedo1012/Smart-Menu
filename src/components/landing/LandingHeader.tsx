"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Menu, X, ArrowLeft } from "lucide-react"

/* r142 (task 2-b) — the landing header, rebuilt for «المائدة»: a warm
 * paper rail instead of the Orbit-Ink chrome. The mechanics survive the
 * redesign intact because they were right:
 *   · persistent sticky header — solid paper @ 92% once scrolled
 *     (`.scrolled`), hairline edge, NO glass blur anywhere;
 *   · `.scrolled` + the top progress ribbon's `--p` are written
 *     imperatively (one passive scroll listener → one rAF → DOM writes);
 *     React NEVER re-renders for scrolling (zero setState);
 *   · scroll-spy: IntersectionObserver thresholds [0,.35,.5,.65,1],
 *     rootMargin -20% 0px -40% 0px, candidates ratio > .35, winner by
 *     most viewport coverage → header.dataset.activeSection (landing.css
 *     reads it there — ids are THIS page's final anchors: menu/journey/
 *     ambience/owner);
 *   · burger + mobile drawer ≤1080px (r129 canonical breakpoint kept),
 *     with the safe-area inset on the drawer's bottom edge.
 * The r141 megamenu is retired with the dark world — the المائدة
 * narrative has exactly four anchors; a dropdown over four links is
 * chrome for chrome's sake. */

const SPY_SECTIONS = "#menu, #journey, #ambience, #owner"

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  /* Scroll chrome lives on refs and is written imperatively below — a React
     re-render per scroll event was the canonical round-3 regression. */
  const headerRef = useRef<HTMLElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  /* Scroll-driven chrome with ZERO setState: coalesced to one rAF per frame
     (pending-flag pattern) and written straight to the DOM — the .scrolled
     class on the header and the --p var on the top ribbon. */
  useEffect(() => {
    const header = headerRef.current
    const bar = progressBarRef.current

    let raf = 0
    const apply = () => {
      raf = 0
      const y = window.scrollY
      if (header) header.classList.toggle("scrolled", y > 6)
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, y / max) : 0
        bar.style.setProperty("--p", p.toFixed(4))
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  /* Scroll-spy — active section highlight in the nav. Zero setState: written
     to a data attribute on the header via imperative DOM. */
  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const sections = Array.from(document.querySelectorAll<HTMLElement>(SPY_SECTIONS))
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        /* Collect all entries first, then pick the one with most overlap. */
        const visible: Array<{ id: string; ratio: number }> = []
        for (const entry of entries) {
          if (entry.intersectionRatio > 0.35) {
            visible.push({ id: entry.target.id, ratio: entry.intersectionRatio })
          }
        }
        /* Pick the section with the most viewport coverage; tie-break by order. */
        visible.sort((a, b) => b.ratio - a.ratio)
        if (visible.length > 0) {
          header.dataset.activeSection = visible[0]!.id
        } else {
          delete header.dataset.activeSection
        }
      },
      { threshold: [0, 0.35, 0.5, 0.65, 1], rootMargin: "-20% 0px -40% 0px" },
    )

    for (const s of sections) observer.observe(s)

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Top scroll-progress bar — driven imperatively via --p */}
      <div className="landing-progress" aria-hidden="true">
        <div className="landing-progress-bar" ref={progressBarRef} style={{ ["--p" as string]: 0 }} />
      </div>

      {/* Header — the .scrolled state class is toggled imperatively */}
      <header className="landing-header" ref={headerRef}>
        <div className="landing-nav">
          <Link href="/" className="landing-brand" aria-label="الربط الذكي — الرئيسية">
            <span className="landing-brand-mark" aria-hidden="true">م</span>
            <span className="landing-brand-text">
              <span className="landing-brand-name">الربط الذكي</span>
              <span className="landing-brand-sub">المائدة · منيو رقمي</span>
            </span>
          </Link>

          <nav className="landing-nav-links" aria-label="أقسام المائدة">
            <a href="#menu" className="landing-nav-link">المنيو الحي</a>
            <a href="#journey" className="landing-nav-link">الرحلة</a>
            <a href="#ambience" className="landing-nav-link">الأجواء</a>
            <a href="#owner" className="landing-nav-link">لصاحب المطعم</a>
          </nav>

          <div className="landing-header-cta">
            <Link href="/pricing" className="ln-btn-ghost">الباقات</Link>
            <Link href="/subscribe" className="ln-btn-ember">
              ابدأ مجاناً
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            className="landing-burger"
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="landing-mobile-menu" aria-label="قائمة الجوال" onClick={() => setMenuOpen(false)}>
            <a href="#menu" className="ln-btn-ghost">المنيو الحي</a>
            <a href="#journey" className="ln-btn-ghost">الرحلة</a>
            <a href="#ambience" className="ln-btn-ghost">الأجواء</a>
            <a href="#owner" className="ln-btn-ghost">لصاحب المطعم</a>
            <Link href="/pricing" className="ln-btn-ghost">الباقات</Link>
            <Link href="/subscribe" className="ln-btn-ember">
              ابدأ مجاناً
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </nav>
        )}
      </header>
    </>
  )
}
