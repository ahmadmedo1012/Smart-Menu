'use client';

// r121-B-2/A-2/E-4 (IMPL-3): the admin layout's client shell. The auth gate
// itself moved to the SERVER layout (admin/layout.tsx — requireAuth() with a
// role-aware redirect, the r113-F114 /login pattern), which removed:
//   - the `if (!authLoaded) return null` blank SSR shell on all 13 admin routes
//     (B-2 — sidebar/header/page skeleton now paint with the document);
//   - the layout's own client /me auth probe + the fake-cookie shell exposure (E-4
//     — a ≥32-char junk cookie used to render the full admin chrome pre-hydration);
//   - 2-3 duplicate /me round-trips per cold load (A-2 — AdminSidebar and the
//     12 useAccessGate pages now consume the server-resolved session below).
// This file keeps everything that genuinely needs the client: the mobile sheet,
// theme, notifiers, and the permission-filtered navigation.

import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AdminSidebar, allNavItems, hasItemPermission } from '@/components/layout/AdminSidebar';
import { LayoutHeader } from '@/components/layout/LayoutHeader';
import { NavLink } from '@/components/shared/NavLink';
import { PageFade } from '@/components/shared/PageFade';
import { AdminEventNotifier } from '@/components/admin/AdminEventNotifier';
import { AccessGateMeProvider } from '@/hooks/useAccessGate';
import {Store} from 'lucide-react';
import AnimatedX from '@/components/ui/x-icon';
import AnimatedLogOut from '@/components/ui/logout-icon';
import { performLogout } from '@/lib/logout';

function MobileNav({
        onNavClick,
        role,
        permissions,
}: {
        onNavClick: () => void;
        role: string | null;
        permissions: string[];
}) {
        const visible =
                role === 'super_admin' || role === 'admin'
                        ? allNavItems
                        : allNavItems.filter((item) => hasItemPermission(item, role, permissions));

        return (
                <>
                        <div className="flex items-center gap-3 border-b border-border px-4 pb-4 pt-5">
                                {onNavClick && (
                                        <button
                                                onClick={onNavClick}
                                                className="flex size-11 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                aria-label="إغلاق"
                                        >
                                                <AnimatedX className="size-4" />
                                        </button>
                                )}
                                <div
                                        className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-orange/80 shadow-lg shadow-orange/25"
                                        aria-hidden="true"
                                >
                                        <Store className="size-5 text-orange-foreground" aria-hidden="true" />
                                </div>
                                <div>
                                        <span className="block text-base font-bold tracking-normal">الربط الذكي</span>
                                        <span className="block text-2xs text-muted-foreground">لوحة الأدمن</span>
                                </div>
                        </div>
                        <nav aria-label="القائمة المتنقلة" className="flex-1 space-y-1 px-3 py-4">
                                {visible.map((item) => (
                                        <NavLink
                                                key={item.href}
                                                href={item.href}
                                                label={item.label}
                                                icon={item.icon}
                                                onClick={onNavClick}
                                        />
                                ))}
                        </nav>
                        <div className="border-t border-border/20 px-3 py-3">
                                <button
                                        onClick={() => performLogout()}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                        <AnimatedLogOut className="size-4" />
                                        تسجيل الخروج
                                </button>
                        </div>
                </>
        );
}

export function AdminShell({
        role,
        permissions,
        children,
}: {
        role: string;
        permissions: string[];
        children: React.ReactNode;
}) {
        const [sheetOpen, setSheetOpen] = useState(false);
        // Stable identity — sheet toggles must not re-render every gate consumer.
        const gateMe = useMemo(() => ({ role, permissions }), [role, permissions]);

        return (
                <AccessGateMeProvider value={gateMe}>
                        <div className="flex min-h-dvh">
                                <AdminEventNotifier />

                                {/* Desktop sidebar */}
                                <AdminSidebar role={role} permissions={permissions} />

                                {/* Mobile drawer */}
                                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                                        <SheetContent id="mobile-nav-sheet" side="left" className="w-60 border-0 bg-card" showCloseButton={false}>
                                                <SheetTitle className="sr-only">القائمة الجانبية</SheetTitle>
                                                <MobileNav onNavClick={() => setSheetOpen(false)} role={role} permissions={permissions} />
                                        </SheetContent>
                                </Sheet>

                                {/* Main — r121-K-1/K-2: a plain content div — the
                                        (protected) group layout owns the single main landmark — with NO
                                        live-region attribute (5-15s polling under one re-announced the
                                        whole page to screen readers). */}
                                {/* r121-K-3: the skip link now lands HERE — past the sidebar + header —
                                        instead of on the group main whose first tabbable children were the
                                        nav links (the bypass bypassed nothing). */}
                                <div className="flex flex-1 flex-col animate-fade-in overflow-x-clip">
                                        <LayoutHeader onMenuClick={() => setSheetOpen(true)} role="admin" menuOpen={sheetOpen} />
                                        <div
                                                id="main-content"
                                                tabIndex={-1}
                                                className="flex-1 bg-background p-5 lg:p-12 focus:outline-none" /* r131-F5 (A1 P1-7): canonical gutter 20/48. */
                                        >
                                                <PageFade>{children}</PageFade>
                                        </div>
                                </div>
                        </div>
                </AccessGateMeProvider>
        );
}
