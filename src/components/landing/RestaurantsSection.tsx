"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { RevealCssClass } from "@/hooks/useReveal"
import AnimatedRefreshCw from "@/components/ui/refresh-icon"
import type { FeaturedRestaurant } from "@/lib/landing"

/* r128 Stage B (F1b) — Chapter 04 «الأرض»: the ground plate (platforms→
 * restaurants per the Smart-Menu slot mapping), adapted from the golden
 * Smart-Link PlatformsSection (commit 7a1fac7). Smart-Menu's ground is not
 * a stock photo (no new image binaries; the flat grammar needs none) — it
 * is the REAL restaurants world: the featured list from the public
 * featured surface (getFeaturedRestaurants / /api/public/featured), the
 * same data the shipped FeaturedRestaurantsSection carousel rendered.
 * Flat ink-2 band, hairline cells, tone-coded wells; every cell opens the
 * restaurant's live menu. Null → honest loading/failed row (retry rides
 * the same affordance the shipped page used); [] → honest empty note —
 * never a fabricated restaurant (r82). */

export function RestaurantsSection({
  restaurants,
  onRetry,
}: {
  restaurants: FeaturedRestaurant[] | null
  onRetry?: () => void
}) {
  return (
    <section id="restaurants" className="ln-chapter ln-restaurants">
      <div className="ln-chapter-head">
        <span className="ln-label">{"04 — الأرض"}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          عالم <em>المطاعم</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          تصفّح منيو مطاعم تستخدم المنصة وشاهد كيف تبدو التجربة من جهة العميل.
        </RevealCssClass>
      </div>

      {restaurants && restaurants.length > 0 ? (
        <RevealCssClass as="div" delay={2}>
          <div className="ln-restaurants-grid">
            {restaurants.map((r, i) => (
              <Link
                key={r.slug}
                href={`/menu/${r.slug}`}
                className="ln-restaurant-cell"
                aria-label={`منيو ${r.name} — ${r.city}`}
              >
                <span
                  className={`ln-restaurant-ico ${i % 3 === 1 ? "azure" : i % 3 === 2 ? "mist" : "gold"}`}
                  aria-hidden="true"
                >
                  <span className="ln-mono">{r.name.trim().charAt(0)}</span>
                </span>
                <h3 className="ln-restaurant-name">{r.name}</h3>
                <p className="ln-restaurant-desc">
                  <MapPin size={12} aria-hidden="true" /> {r.city}
                </p>
                <span className="ln-restaurant-tag ln-mono">
                  {r.orderCount} طلب · 30 يوم
                </span>
              </Link>
            ))}
          </div>
        </RevealCssClass>
      ) : (
        <RevealCssClass as="div" className="ln-restaurants-empty" delay={2}>
          <p>
            {restaurants === null
              ? "منيو المطاعم تُجلب الآن من قاعدة بيانات المنصة…"
              : "لا مطاعم بارزة بعد — أول منيو يُفعّل عرضه في الصفحة الرئيسية يظهر هنا."}
          </p>
          {restaurants === null && onRetry && (
            <button type="button" className="ln-btn-ghost" onClick={onRetry}>
              <AnimatedRefreshCw className="size-3.5" aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </RevealCssClass>
      )}
    </section>
  )
}
