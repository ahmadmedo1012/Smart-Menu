'use client';

// r121-B-2/A-2/E-4 (IMPL-3): the owner layout's client shell. The auth gate
// itself moved to the SERVER layout (owner/layout.tsx — requireAuth() with a
// role-aware redirect, the r113-F114 /login pattern), which removed:
//   - the `if (!authLoaded) return null` blank SSR shell on all 10 owner routes
//     (B-2 — sidebar/header/page skeleton now paint with the document);
//   - the layout's own client /me auth probe + the fake-cookie shell exposure (E-4);
//   - one of the 2-3 duplicate /me round-trips per owner cold load (A-2 — the
//     useActiveRestaurant /me fallback stays: it is a genuine fallback, not a gate).
// This file keeps everything that genuinely needs the client: the mobile sheet,
// theme, notifiers, restaurant switcher. It also owns the r121-P-5 subscription
// expiry banner (planEnd is resolved server-side via the existing
// getUserSubscriptionState() helper — zero API change) and feeds the r121-P-4
// pending-payment state down to the dashboard through OwnerSessionContext.

import { createContext, useContext, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { LayoutHeader } from '@/components/layout/LayoutHeader';
import {Store, LayoutDashboard, ClipboardList, Settings, QrCode, Gift, Star, AlertTriangle, CalendarClock} from 'lucide-react';
import AnimatedLogOut from '@/components/ui/logout-icon';
import AnimatedX from '@/components/ui/x-icon';
import { performLogout } from '@/lib/logout';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/shared/NavLink';
import { PageFade } from '@/components/shared/PageFade';
import { UserBannerNotifier } from '@/components/owner/UserBannerNotifier';
import { RestaurantSwitcher } from '@/components/owner/RestaurantSwitcher';
import { Button } from '@/components/ui/button';

const navItems = [
        { href: '/owner', label: 'لوحة التحكم', icon: LayoutDashboard },
        { href: '/owner/orders', label: 'الطلبات', icon: ClipboardList },
        { href: '/owner/menu', label: 'المنيو', icon: Store },
        { href: '/owner/restaurants', label: 'المنيوهات', icon: Store },
        { href: '/owner/qr', label: 'رمز QR', icon: QrCode },
        { href: '/owner/loyalty', label: 'الولاء', icon: Gift },
        { href: '/owner/reviews', label: 'التقييمات', icon: Star },
        { href: '/owner/settings', label: 'الإعدادات', icon: Settings },
];

/** r121-P-4: server-resolved subscription facts the owner dashboard needs to
 * render an honest pre-activation state (previously the returning pending
 * owner hit a dead-end error whose retry button no-oped). */
export type OwnerSession = {
        /** ISO date of the user's pending subscription payment, or null. */
        pendingPaymentSince: string | null;
};

export const OwnerSessionContext = createContext<OwnerSession | null>(null);

export function useOwnerSession(): OwnerSession | null {
        return useContext(OwnerSessionContext);
}

/* ── r121-P-5: expiry banner helpers → r123: moved to the server-safe
   src/lib/plan-expiry.ts (the server layout called them across the RSC
   boundary and every /owner render 500'd). Re-exported here so the unit
   suite's existing imports keep working. ──────────────────────────────── */
export { getPlanDaysRemaining, daysLeftPhrase } from '@/lib/plan-expiry';
import { daysLeftPhrase } from '@/lib/plan-expiry';

/** Warn when the plan ends within (or before) 7 days — P-5's ≤7-day window. */
const EXPIRY_WARN_DAYS = 7;

function SubscriptionExpiryBanner({ days }: { days: number | null }) {
        // r121-ADV1-2: `days` arrives as a server-resolved prop — computing it here
        // with new Date() produced a React 19 text mismatch across the day
        // boundary (server clock vs client clock at hydration).
        const [dismissed, setDismissed] = useState(false);
        if (dismissed || days === null || days > EXPIRY_WARN_DAYS) return null;
        const expired = days <= 0;
        return (
                <div
                        className={cn(
                                'mx-4 mt-4 rounded-xl border-2 p-4 backdrop-blur-sm',
                                expired
                                        ? 'border-destructive/30 bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/20 dark:to-destructive/10'
                                        : 'border-orange/30 bg-gradient-to-r from-orange/10 to-orange/5 dark:from-orange/20 dark:to-orange/10'
                        )}
                        role="status"
                >
                        <div className="flex items-start gap-3 rtl:flex-row-reverse">
                                <div
                                        className={cn(
                                                'flex size-10 shrink-0 items-center justify-center rounded-full',
                                                expired ? 'bg-destructive/20' : 'bg-orange/15'
                                        )}
                                >
                                        {expired ? (
                                                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
                                        ) : (
                                                <CalendarClock className="size-5 text-orange" aria-hidden="true" />
                                        )}
                                </div>
                                <div className="min-w-0 flex-1">
                                        <p className={cn('text-sm font-bold', expired ? 'text-destructive' : 'text-orange')}>
                                                {expired ? 'انتهى اشتراكك' : `اشتراكك ينتهي خلال ${daysLeftPhrase(days)}`}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                {expired
                                                        ? 'منيوك ما زال يعمل ويستقبل الطلبات، لكن تعديل الأصناف والأسعار متوقف حتى التجديد.'
                                                        : 'جدّد الآن حتى لا يتوقف تعديل المنيو عند انتهاء الصلاحية.'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <Link href="/subscribe">
                                                        <Button size="sm" variant="orange" className="text-xs">
                                                                جدّد الاشتراك
                                                        </Button>
                                                </Link>
                                                <button
                                                        onClick={() => setDismissed(true)}
                                                        className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                                                        aria-label="إخفاء تنبيه الاشتراك"
                                                >
                                                        إخفاء
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        );
}

/* ── shell ─────────────────────────────────────────────────────────────────── */

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
        return (
                <>
                        {/* Close + Brand row */}
                        <div className="relative z-20 flex items-center gap-2 border-b border-border/20 px-4 py-4 min-h-[72px]">
                                {onNavClick && (
                                        <button
                                                onClick={onNavClick}
                                                className="flex size-11 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                                aria-label="إغلاق"
                                        >
                                                <AnimatedX className="size-4" />
                                        </button>
                                )}
                                <Image
                                        src="/brand-icon.png"
                                        alt="الربط الذكي"
                                        width={160}
                                        height={160}
                                        className="max-h-9 w-auto"
                                        priority
                                />
                        </div>

                        {/* Restaurant switcher (multi-menu) */}
                        <RestaurantSwitcher />

                        {/* Nav */}
                        <nav className="relative z-10 flex-1 space-y-1 px-3 py-4">
                                {navItems.map((item) => (
                                        <NavLink
                                                key={item.href}
                                                href={item.href}
                                                label={item.label}
                                                icon={item.icon}
                                                onClick={onNavClick}
                                        />
                                ))}
                        </nav>

                        {/* Logout */}
                        <div className="relative z-10 border-t border-border/20 px-3 py-3">
                                <LogoutButton />
                        </div>

                        {/* Glass overlay */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/30" />
                </>
        );
}

function LogoutButton() {
        return (
                <button
                        onClick={() => performLogout({ toast: 'owner' })}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-[color,background-color] duration-300 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                >
                        <AnimatedLogOut className="size-4" />
                        تسجيل الخروج
                </button>
        );
}

export function OwnerShell({
        planDays,
        pendingPaymentSince,
        children,
}: {
        /** r121-P-5/ADV1-2: whole days until planEnd, resolved ON THE SERVER
         * (avoids SSR/hydration clock mismatch); null = no plan end date. */
        planDays: number | null;
        /** r121-P-4: ISO date of the pending subscription payment, or null. */
        pendingPaymentSince: string | null;
        children: React.ReactNode;
}) {
        const [sheetOpen, setSheetOpen] = useState(false);
        // Stable identity — sheet toggles must not re-render session consumers.
        const sessionValue = useMemo<OwnerSession>(() => ({ pendingPaymentSince }), [pendingPaymentSince]);

        return (
                <OwnerSessionContext.Provider value={sessionValue}>
                        <div className="flex min-h-dvh">
                                {/* Desktop sidebar — premium glass card */}
                                <aside
                                        className={cn(
                                                'relative hidden w-60 shrink-0 flex-col lg:flex',
                                                'border-s border-border/50 bg-card/80 backdrop-blur-md',
                                                'shadow-sm'
                                        )}
                                >
                                        <SidebarContent />
                                </aside>

                                {/* Mobile sheet */}
                                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                                        <SheetContent id="mobile-nav-sheet" side="left" className="w-60 border-0 bg-card" showCloseButton={false}>
                                                {/* Screen-reader name — the sheet needs a Title for an accessible name */}
                                                <SheetTitle className="sr-only">القائمة الجانبية</SheetTitle>
                                                <SidebarContent onNavClick={() => setSheetOpen(false)} />
                                        </SheetContent>
                                </Sheet>

                                {/* Main — r121-K-1/K-2: a plain content div — the
                                        (protected) group layout owns the single main landmark — with NO
                                        live-region attribute (5-15s order polling under one re-announced
                                        the whole page to SR users; K-6's deliberate announce-on-growth
                                        region on /owner/orders replaces it). */}
                                {/* r121-K-3: the skip link now lands HERE — past the sidebar + header —
                                        instead of on the group main whose first tabbable children were the
                                        sidebar links (the bypass bypassed nothing). */}
                                <div className="flex flex-1 flex-col animate-fade-in overflow-x-clip">
                                        <LayoutHeader onMenuClick={() => setSheetOpen(true)} role="owner" menuOpen={sheetOpen} />
                                        <div
                                                id="main-content"
                                                tabIndex={-1}
                                                className="flex-1 bg-background p-4 md:p-6 lg:p-8 focus:outline-none"
                                        >
                                                <UserBannerNotifier />
                                                <SubscriptionExpiryBanner days={planDays} />
                                                <PageFade>{children}</PageFade>
                                        </div>
                                </div>
                        </div>
                </OwnerSessionContext.Provider>
        );
}
