/**
 * round86-B6 — the public menu hero as a SERVER component.
 *
 * This markup was previously inside the `'use client'` MenuClientSection even
 * though it uses no hooks — the whole hero (header, contacts, action bar) was
 * compiled into the client bundle and rendered through the client module
 * graph. Interactive pieces are isolated client islands (MenuIslands,
 * OptimizedImage, animated icons); everything else renders on the server.
 */
import { normalizeWaNumber } from '@/lib/whatsapp';
import { normalizeCustomerPhone } from '@/lib/phone';
import { Store, Printer, Phone, Mail } from 'lucide-react';
import { QrCornerMark } from '@/components/ui/QrCornerMark';
import AnimatedMapPin from '@/components/ui/map-pin-icon';
import AnimatedClock from '@/components/ui/clock-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { HeroDecor } from './HeroDecor';
import { OrbField } from './OrbField';
import { ShareButtonIsland, GalleryIsland } from './MenuIslands';

export type MenuHeroRestaurant = {
    name: string;
    logo: string;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    workingHours: string | null;
    gallery: string[];
};

export function MenuHero({
    restaurant,
    slug,
    origin,
    hasContact,
}: {
    restaurant: MenuHeroRestaurant;
    slug: string;
    origin: string;
    hasContact: boolean;
}) {
    return (
        <>
            <header className="relative min-h-[80vh] md:min-h-[70vh] overflow-hidden bg-gradient-to-b from-orange/25 via-background to-background before:pointer-events-none before:absolute before:inset-0 before:bg-[var(--menu-glow-strong)]">
                {/* ── Ambient floating orbs — 2 max: blur layers are expensive on mobile
                     GPUs; reduced-motion users get them fully disabled via globals.css.
                     r121-G-6: the orbs moved into the OrbField client island so their
                     infinite animation pauses (animation-play-state) once the hero
                     leaves the viewport — offscreen GPU raster no longer runs during
                     menu scroll. Markup/classes unchanged. ── */}
                <OrbField />

                {/* ── Decorative corner art (round85-B1: pure SVG — was 2 Lotties + runtime ≈ 360KB) ── */}
                <HeroDecor />

                {/* ── Bottom gradient fade ── */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-background/30 to-background pointer-events-none" />

                {/* ── Hero content ── */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-12 md:pt-28 md:pb-16 text-center">
                    {restaurant.logo ? (
                        <div className="relative mx-auto mb-6 w-fit group">
                            {/* QR-corner signature — owner's QR mark behind the logo */}
                            <div aria-hidden="true" className="absolute -top-5 -end-5 -z-10 opacity-60">
                                <QrCornerMark label="" size={52} />
                            </div>
                            {/* Orbital glow ring */}
                            <div className="absolute -inset-6 rounded-full bg-orange/5 blur-[50px] group-hover:blur-[70px] transition-[filter] duration-cinema" />
                            <div className="absolute -inset-3 rounded-full border border-orange/10 animate-hero-glow-pulse" />
                            <div
                                className="absolute -inset-2 rounded-full border border-orange/5 animate-hero-glow-pulse"
                                style={{ animationDelay: '0.5s' }}
                            />
                            {/* Glass orb container */}
                            <div className="relative size-28 md:size-32 rounded-2xl overflow-hidden shadow-2xl shadow-orange/20 ring-2 ring-orange/15 backdrop-blur-sm bg-white/5 dark:bg-white/[0.04] gpu-layer">
                                {/* LCP: hero logo is above the fold → eager fetch with high priority.
                                    round88-A2 sizes: box is size-28 (112px) / md:size-32 (128px) — the
                                    old generic 100vw/50vw/33vw made the browser fetch a viewport-sized
                                    srcset (up to ~7× the box) for the LCP image. */}
                                <OptimizedImage
                                    src={restaurant.logo}
                                    alt={restaurant.name}
                                    aspectRatio="square"
                                    /* r97-X1: rounded-none — الحاوية الزجاجية rounded-2xl + الحلقة
                                       تعرّفان الزوايا؛ الافتراضي 18px كان سيقصّ 2px إضافية داخلها */
                                    className="rounded-none"
                                    imageClassName="size-full object-cover"
                                    fallback={<Store className="size-10 text-muted-foreground/60" />}
                                    skeleton
                                    priority
                                    fetchPriority="high"
                                    sizes="(max-width: 768px) 112px, 128px"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="relative mx-auto mb-6">
                            <div className="absolute -inset-4 rounded-full bg-orange/5 blur-[40px]" />
                            <div className="relative size-20 rounded-2xl bg-gradient-to-br from-orange to-saffron/80 flex items-center justify-center shadow-xl shadow-orange/25 ring-2 ring-white/10 gpu-layer">
                                <Store className="size-10 text-orange-foreground" />
                            </div>
                        </div>
                    )}

                    {/* Signwriting treatment — IBM Plex Sans Arabic display face
                        (r132/A3 §1.3: was "Readex display face" — the Readex
                        faces were never-fetched dead weight, deleted), warm
                        gradient via the hero token */}
                    <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold mb-3 text-balance leading-[1.3] text-gradient-hero drop-shadow-sm">
                        {restaurant.name}
                    </h1>

                    {restaurant.description && (
                        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                            {restaurant.description}
                        </p>
                    )}

                    {/* Decorative divider */}
                    <div className="mx-auto mt-5 mb-5 flex items-center justify-center gap-3">
                        <span className="block w-12 h-[1px] bg-gradient-to-l from-orange/0 via-orange/40 to-orange/0" />
                        <span className="block size-1.5 rounded-full bg-orange/40" />
                        <span className="block w-12 h-[1px] bg-gradient-to-r from-orange/0 via-orange/40 to-orange/0" />
                    </div>

                    {/* Glass-pill action bar */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                        {restaurant.workingHours && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground glass-card px-3.5 py-2 rounded-full backdrop-blur-md border border-white/5 dark:border-white/[0.04]">
                                <AnimatedClock className="size-3.5" />
                                {restaurant.workingHours}
                            </span>
                        )}
                        <ShareButtonIsland url={`${origin}/menu/${slug}`} title={`منيو ${restaurant.name}`} />
                        <a
                            href={`/menu/${slug}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-11 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-colors duration-base backdrop-blur-md border border-white/5 dark:border-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                            {/* r97-X1: lucide import بدل مسار SVG مُدمج يدوياً */}
                            <Printer className="size-3.5" aria-hidden="true" />
                            طباعة
                        </a>
                    </div>

                    {/* Glass-pill contacts row */}
                    {hasContact && (
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {restaurant.phone && (
                                <a
                                    /* r136 (ليبي أولاً): الرابط يُبنى من الرقم المطوّع —
                                       الفواصل والأرقام الشرقية في الرقم المخزّن كانت تُفسد
                                       tel: على معظم الأجهزة. العرض يبقى بصيغة المالك كما هي
                                       (نفس نمط شريحة واتساب أعلاه: href مطوّع، عرض خام). */
                                    href={`tel:${normalizeCustomerPhone(restaurant.phone) ?? restaurant.phone}`}
                                    dir="ltr"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-11 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-colors duration-base backdrop-blur-md border border-white/5 dark:border-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                    {/* r97-X1: lucide import بدل مسار SVG مُدمج يدوياً */}
                                    <Phone className="size-3.5" aria-hidden="true" />
                                    {restaurant.phone}
                                </a>
                            )}
                            {/* r103-F8: an invalid stored number (<8 digits after
                                normalization) must not render a dead wa.me/null
                                link — normalize first, render on a valid value */}
                            {(() => {
                                const wa = normalizeWaNumber(restaurant.whatsapp);
                                return wa ? (
                                    <a
                                    href={`https://wa.me/${wa}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 rounded-full text-xs font-bold glass-card hover:bg-success/15 transition-colors duration-base backdrop-blur-md border border-success/30 text-success shadow-lg shadow-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                    <span className="relative flex size-2">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-whatsapp opacity-60" />
                                        <span className="relative inline-flex size-2 rounded-full bg-whatsapp" />
                                    </span>
                                    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                    </svg>
                                    {restaurant.whatsapp}
                                    </a>
                                ) : null;
                            })()}
                            {restaurant.email && (
                                <a
                                    href={`mailto:${restaurant.email}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-11 rounded-full text-xs font-medium glass-card hover:bg-orange-muted transition-colors duration-base backdrop-blur-md border border-white/5 dark:border-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                    {/* r97-X1: lucide import بدل مسار SVG مُدمج يدوياً */}
                                    <Mail className="size-3.5" aria-hidden="true" />
                                    {restaurant.email}
                                </a>
                            )}
                        </div>
                    )}

                    {restaurant.address && (
                        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground glass-card px-3.5 py-2 rounded-full backdrop-blur-md border border-white/5 dark:border-white/[0.04] mx-auto w-fit">
                            <AnimatedMapPin className="size-3.5" />
                            {restaurant.address}
                        </div>
                    )}
                </div>
            </header>

            {restaurant.gallery?.length > 0 && (
                <section className="max-w-4xl mx-auto px-4 mt-2 relative z-10">
                    <GalleryIsland images={restaurant.gallery} restaurantName={restaurant.name} />
                </section>
            )}
        </>
    );
}
