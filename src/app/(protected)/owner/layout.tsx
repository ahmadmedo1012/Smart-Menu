'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LayoutHeader } from '@/components/layout/LayoutHeader';
import {Store, LayoutDashboard, ClipboardList, Settings, QrCode, Gift, Star} from 'lucide-react';
import AnimatedLogOut from '@/components/ui/logout-icon';
import AnimatedX from '@/components/ui/x-icon';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/shared/NavLink';
import { PageFade } from '@/components/shared/PageFade';
import { UserBannerNotifier } from '@/components/owner/UserBannerNotifier';
import { RestaurantSwitcher } from '@/components/owner/RestaurantSwitcher';

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
			onClick={async () => {
				try {
					const res = await csrfFetch('/api/auth/logout', { method: 'POST' });
					// Flag for /login: suppress its auto-redirect race (see login page).
					try { sessionStorage.setItem('just-logged-out', '1'); } catch { /* private mode */ }
					if (res.ok) {
						premiumToast('logout', 'تم تسجيل الخروج');
						// window.location.replace avoids the router.push + router.refresh
						// race (a refresh re-validates the still-set session cookie and
						// bounces the user back to /owner while the push is in flight)
						window.location.replace('/login');
					}
				} catch {
					premiumToast('error', 'فشل تسجيل الخروج');
				}
			}}
			className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-[color,background-color] duration-300 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
		>
			<AnimatedLogOut className="size-4" />
			تسجيل الخروج
		</button>
	);
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [authLoaded, setAuthLoaded] = useState(false);

	useEffect(() => {
		fetch('/api/auth/me')
			.then((r) => r.json())
			.then((d) => {
				if (!d.success) {
					router.push('/login');
					return;
				}
				if (d.data?.role !== 'owner') {
					const redirectTarget =
						d.data?.role === 'USER' || d.data?.subscriptionStatus === 'UNPAID'
							? '/subscribe'
							: ['super_admin', 'sub_admin', 'admin'].includes(d.data?.role)
								? '/admin'
								: '/login';
					router.push(redirectTarget);
					return;
				}
				setAuthLoaded(true);
			})
			.catch(() => router.push('/login'));
	}, [router]);

	if (!authLoaded) return null;

	return (
		<div className="flex min-h-dvh">
			{/* Desktop sidebar — premium glass card */}
			<aside
				className={cn(
					'relative hidden w-60 shrink-0 flex-col lg:flex',
					'border-s border-border/60 bg-card',
					'shadow-sm'
				)}
			>
				<SidebarContent />
			</aside>

			{/* Mobile sheet */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent id="mobile-nav-sheet" side="left" className="w-60 border-0 bg-card" showCloseButton={false}>
					<SidebarContent onNavClick={() => setSheetOpen(false)} />
				</SheetContent>
			</Sheet>

			{/* Main content */}
			<div className="flex flex-1 flex-col animate-fade-in overflow-x-clip">
				<LayoutHeader onMenuClick={() => setSheetOpen(true)} role="owner" menuOpen={sheetOpen} />
				<main
					aria-live="polite"
					aria-label="محتوى الصفحة"
					className="flex-1 bg-background p-4 md:p-6 lg:p-8"
				>
					<UserBannerNotifier />
					<PageFade>{children}</PageFade>
				</main>
			</div>
		</div>
	);
}
