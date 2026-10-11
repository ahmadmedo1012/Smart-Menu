'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';
import { DEMO_MENU, DEMO_MENU_URL } from './landing-data';

/* r142 (task 2-b) — MenuShowcaseSection «المنيو الحي»: the radical rebuild
 * of the r141 «من المنيو» showcase. Same honest spine (r82 — nothing
 * invented), radically different composition and function surface:
 *
 *   · The four tabs are the platform's REAL default category registry
 *     (the same auto-seeded set every new menu starts with).
 *   · The BOARD is a printed-menu spread: the end column lists the
 *     category's REAL items with dotted price leaders (16 items copied
 *     verbatim from the demo seed — /menu/al-waha-cafe), and the start
 *     column is a live dish detail: the category plate photo, the
 *     selected item's name huge, its price in the platform's money
 *     pattern (number first, LTR, tabular), the honesty note and the
 *     two real CTAs.
 *   · Prices render as «3.00 د.ل» — the same bidi pattern MenuItemCard
 *     ships (number first, currency to its left).
 *
 * Mechanics: a WAI-ARIA tablist for categories (roving tabindex + RTL
 * arrow mapping — ArrowRight moves to the tab visually on the right,
 * i.e. the previous DOM sibling in RTL; Home/End jump), and the item
 * rows are real buttons (aria-pressed) driving the detail card, which
 * is aria-live="polite" so selection changes announce themselves.
 * Everything animates only via CSS and dies under
 * prefers-reduced-motion (landing.css). Images ride next/image with
 * real sizes; non-active plates stay lazy below the fold.
 */

export function MenuShowcaseSection() {
  const [catIdx, setCatIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const cat = DEMO_MENU[catIdx]!;
  const item = cat.items[Math.min(itemIdx, cat.items.length - 1)]!;
  const count = DEMO_MENU.length;

  /* WAI-ARIA tabs — RTL arrow mapping: the tab visually on the RIGHT is
   * the PREVIOUS DOM sibling (the strip flows right→left), so ArrowRight
   * walks backwards through the DOM order. Selection follows focus —
   * the board is small, instant switching reads better than a two-step
   * tab. Switching a category resets the item to the first row. */
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (catIdx - 1 + count) % count;
    else if (e.key === 'ArrowLeft') next = (catIdx + 1) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    setCatIdx(next);
    setItemIdx(0);
    tabRefs.current[next]?.focus();
  };

  const selectCategory = (i: number) => {
    setCatIdx(i);
    setItemIdx(0);
  };

  return (
    <section id="menu" className="ln-chapter ln-menu" aria-label="المنيو الحي">
      <div className="ln-chapter-head">
        <span className="ln-label">{'02 — المنيو الحي'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          اقرأ المنيو <em>كما يقرؤه عميلك</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          أصناف وأسعار حقيقية من منيو مقهى الواحة — مطعم تجريبي حي على
          المنصة. هكذا يُقرأ منيوك على الجوال: أقسام واضحة، أسعار بلا غموض،
          وتفاصيل تكفي لقرار الطلب. جرّب الأقسام والأصناف بالأسفل.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div
          className="ln-menu-tabs"
          role="tablist"
          aria-label="أقسام المنيو"
          onKeyDown={onTablistKeyDown}
        >
          {DEMO_MENU.map((c, i) => (
            <button
              key={c.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`ln-menu-tab-${c.key}`}
              aria-selected={i === catIdx}
              aria-controls="ln-menu-panel"
              tabIndex={i === catIdx ? 0 : -1}
              className="ln-menu-tab"
              onClick={() => selectCategory(i)}
            >
              <span className="ln-menu-tab-dot" aria-hidden="true" />
              {c.label}
            </button>
          ))}
        </div>

        <div
          id="ln-menu-panel"
          role="tabpanel"
          aria-labelledby={`ln-menu-tab-${cat.key}`}
          tabIndex={0}
          className="ln-menu-board"
        >
          {/* the dish detail — plate photo + the selected row's full card */}
          <div className="ln-menu-detail" aria-live="polite">
            <div className="ln-menu-plate">
              {DEMO_MENU.map((c, i) => (
                <div
                  key={c.key}
                  className={`ln-menu-slide${i === catIdx ? ' is-active' : ''}`}
                  aria-hidden={i !== catIdx}
                >
                  <Image
                    src={c.img}
                    alt={i === catIdx ? c.alt : ''}
                    fill
                    sizes="(max-width: 920px) 92vw, 460px"
                    className="ln-menu-slide-img"
                  />
                </div>
              ))}
              <span className="ln-menu-plate-tag ln-mono">
                {`0${catIdx + 1} — ${cat.label}`}
              </span>
            </div>

            <div className="ln-menu-detail-card" key={`${cat.key}-${item.name}`}>
              <p className="ln-menu-kicker ln-mono">
                {cat.icon} {cat.label}
              </p>
              <h3 className="ln-menu-item-name">{item.name}</h3>
              <p className="ln-menu-price-row">
                <span className="ln-menu-price" dir="ltr">
                  {item.price.toFixed(2)}
                </span>
                <span className="ln-menu-currency">د.ل</span>
              </p>
              <p className="ln-menu-note">
                <Info size={15} aria-hidden="true" />
                الأسماء والأسعار منسوخة حرفياً من منيو مقهى الواحة التجريبي
                الحي على المنصة — منيوك أنت تديره كاملاً من لوحة التحكم:
                أصنافك وصورك وأسعارك.
              </p>
              <div className="ln-menu-card-actions">
                <Link href={DEMO_MENU_URL} className="ln-btn-ghost ln-menu-cta-warm">
                  افتح المنيو الحي كاملاً
                  <ArrowLeft size={15} aria-hidden="true" />
                </Link>
                <Link href="/subscribe" className="ln-btn-ghost">
                  أدر منيوك
                </Link>
              </div>
            </div>
          </div>

          {/* the printed-menu list — dotted leaders, tabular prices */}
          <div className="ln-menu-list-wrap">
            <p className="ln-menu-list-title">{cat.label}</p>
            <ul className="ln-menu-list" key={cat.key}>
              {cat.items.map((it, i) => (
                <li key={it.name}>
                  <button
                    type="button"
                    className={`ln-menu-row${i === itemIdx ? ' is-selected' : ''}`}
                    aria-pressed={i === itemIdx}
                    onClick={() => setItemIdx(i)}
                  >
                    <span className="ln-menu-row-dot" aria-hidden="true" />
                    <span className="ln-menu-row-name">{it.name}</span>
                    <span className="ln-menu-row-leader" aria-hidden="true" />
                    <span className="ln-menu-row-price" dir="ltr">
                      {it.price.toFixed(2)} د.ل
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="ln-menu-list-foot ln-mono">
              {cat.items.length} أصناف · الأسعار بالدينار الليبي
            </p>
          </div>
        </div>
      </RevealCssClass>
    </section>
  );
}
