'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';

/* r141 (task 2-a) — MenuShowcaseSection «من المنيو»: the interactive
 * culinary showcase, Smart-Menu's own chapter between the categories
 * constellation (01) and the journey (02).
 *
 * Honest by construction (r82 doctrine — nothing invented as real):
 *   · The four tabs are the platform's REAL default category registry
 *     (the same auto-seeded set CategoriesSection pins).
 *   · The dishes/prices are labelled demo examples («صنف تجريبي») with
 *     typical LYD figures — the panel says so in plain text and hands
 *     the visitor a REAL menu (/menu/al-waha-cafe) plus the owner CTA.
 *   · Prices render as «12.00 د.ل» — tabular numerals, the same bidi
 *     pattern MenuItemCard ships (number first, currency to its left).
 *
 * Mechanics: a WAI-ARIA tablist (roving tabindex + RTL arrow mapping —
 * ArrowRight moves to the tab visually on the right, i.e. the previous
 * DOM sibling in RTL), a stacked-image crossfade (plain opacity, both
 * layers ride --ln-t-slow) and a keyed card re-entrance (ln-card-in).
 * Everything animates only via CSS and dies under
 * prefers-reduced-motion (landing.css §28). Images ride next/image
 * with real sizes; non-active slides stay lazy below the fold.
 */

type Category = {
  key: string;
  label: string;
  img: string;
  alt: string;
  item: string;
  price: string;
  desc: string;
};

/* The four REAL default categories — the same roster the constellation
 * chapter carries — with honest demo dishes (typical Libyan café menu
 * figures, always labelled as examples in the panel). */
const CATEGORIES: Category[] = [
  {
    key: 'hot',
    label: 'مشروبات ساخنة',
    img: '/images/culinary/cat-hot.png',
    alt: 'قهوة عربية داكنة ببخار متصاعد في فنجان تقليدي',
    item: 'قهوة عربية بالهيل',
    price: '8.00',
    desc: 'بنّ عربي داكن يُعدّ على الرمل مع الهيل الأخضر، يُقدّم ساخناً مع التمر — رائحة تسبق الفنجان إلى الطاولة.',
  },
  {
    key: 'cold',
    label: 'مشروبات باردة',
    img: '/images/culinary/cat-cold.png',
    alt: 'كأس ليموناضة بالنعنع والثلج المجروش',
    item: 'ليموناضة بالنعنع',
    price: '9.00',
    desc: 'ليمون طازج مع نعنع مجروش وثلج مبروش وسكر حسب الطلب — قثاعة باردة تكسر حرارة الظهيرة.',
  },
  {
    key: 'dessert',
    label: 'حلويات',
    img: '/images/culinary/cat-dessert.png',
    alt: 'قطعة كنافة ذهبية مغطاة بالفستق الحلبي',
    item: 'كنافة بالفستق الحلبي',
    price: '18.00',
    desc: 'شعيرية ذهبية بالسمن البلدي، جبن مطاطي يمدّ مع كل قطعة، فستق حلبي مجروش وقطر خفيف يلمع دون أن يغرق.',
  },
  {
    key: 'snacks',
    label: 'وجبات خفيفة',
    img: '/images/culinary/cat-snacks.png',
    alt: 'مقبلات متنوعة على صينية خشبية',
    item: 'مقبلات مشكّلة',
    price: '22.00',
    desc: 'حمّص بالطحينة، ورق عنب، جبن حلومي مشوي وخبز يخرج ساخناً — بداية سخية تُشارك على الطاولة.',
  },
];

/** The REAL demo menu the panel links to (same one CategoriesSection opens). */
const DEMO_MENU_URL = '/menu/al-waha-cafe';

export function MenuShowcaseSection() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const cat = CATEGORIES[active];
  const count = CATEGORIES.length;

  /* WAI-ARIA tabs — RTL arrow mapping: the tab visually on the RIGHT is
   * the PREVIOUS DOM sibling (the strip flows right→left), so ArrowRight
   * walks backwards through the DOM order. Home/End jump to the edges.
   * Focus AND selection move together (selection follows focus — the
   * panel is small, instant switching reads better than a two-step tab). */
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (active - 1 + count) % count;
    else if (e.key === 'ArrowLeft') next = (active + 1) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="menu-showcase" className="ln-chapter ln-menu">
      <div className="ln-chapter-head">
        <span className="ln-label">{'01+ — التذوّق'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          من المنيو: <em>أصناف تُشهى بالعين</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          لقطات دافئة من أقسام المنيو الأربعة — صِف الأطباق كما تتكلم عنها
          مطابخك، واعرض السعر بالدينار الليبي دون غموض. جرّب الأقسام بالأسفل.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div
          className="ln-menu-tabs"
          role="tablist"
          aria-label="أقسام المنيو"
          onKeyDown={onTablistKeyDown}
        >
          {CATEGORIES.map((c, i) => (
            <button
              key={c.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`ln-menu-tab-${c.key}`}
              aria-selected={i === active}
              aria-controls="ln-menu-panel"
              tabIndex={i === active ? 0 : -1}
              className="ln-menu-tab"
              onClick={() => setActive(i)}
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
          className="ln-menu-panel"
        >
          <div className="ln-menu-grid">
            {/* the stage — all four plates stacked, opacity crossfades */}
            <div className="ln-menu-stage">
              <div className="ln-menu-stage-media">
                {CATEGORIES.map((c, i) => (
                  <div
                    key={c.key}
                    className={`ln-menu-slide${i === active ? ' is-active' : ''}`}
                    aria-hidden={i !== active}
                  >
                    <Image
                      src={c.img}
                      alt={i === active ? c.alt : ''}
                      fill
                      sizes="(max-width: 920px) 92vw, 540px"
                      className="ln-menu-slide-img"
                    />
                  </div>
                ))}
              </div>
              <span className="ln-menu-stage-tag ln-mono">
                {`0${active + 1} — ${cat.label}`}
              </span>
            </div>

            {/* the warm glass card — keyed remount replays ln-card-in */}
            <div className="ln-menu-card">
              <div className="ln-menu-card-inner" key={cat.key}>
                <span className="ln-menu-kicker ln-mono">من المنيو · طبق اليوم</span>
                <h3 className="ln-menu-item-name">{cat.item}</h3>
                <p className="ln-menu-price-row">
                  <span className="ln-menu-price" dir="ltr">
                    {cat.price}
                  </span>
                  <span className="ln-menu-currency">د.ل</span>
                </p>
                <p className="ln-menu-desc">{cat.desc}</p>
                <p className="ln-menu-note">
                  <Info size={15} aria-hidden="true" />
                  صنف تجريبي بالأسماء والأسعار التطبيقية لعرض الإحساس فقط —
                  منيوك الحقيقي تديره بالكامل من لوحة التحكم: الأصناف، الصور،
                  والأسعار.
                </p>
                <div className="ln-menu-card-actions">
                  <Link href={DEMO_MENU_URL} className="ln-btn-ghost ln-menu-cta-warm">
                    شاهد منيو حقيقياً من المنصة
                    <ArrowLeft size={15} aria-hidden="true" />
                  </Link>
                  <Link href="/subscribe" className="ln-btn-ghost">
                    أدر أطباقك
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealCssClass>
    </section>
  );
}
