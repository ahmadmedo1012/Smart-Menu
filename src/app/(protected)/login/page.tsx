'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { premiumToast } from '@/lib/premium-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { csrfFetch } from '@/lib/csrf-client';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';
import {LogIn} from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import AnimatedEyeOff from '@/components/ui/eye-off-icon';
import AnimatedEye from '@/components/ui/eye-icon';

const SUPPORT_WHATSAPP = '218910089975';

function FloatingShapes() {
	return (
		<div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
			<div
				className="absolute -end-28 -top-24 size-[26rem] rounded-full bg-orange/8 blur-[120px] dark:bg-orange/6"
			/>
		</div>
	);
}

function safeRedirect(value: string | null) {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
	return value;
}

function LoginForm() {
	const searchParams = useSearchParams();
	const rawRedirect = searchParams.get('redirect');

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showForgot, setShowForgot] = useState(false);
	const [checkingAuth, setCheckingAuth] = useState(true);

	// Redirect already-authenticated users to their dashboard — UNLESS they just
	// logged out. The logout POST clears the cookie, but this effect's /api/auth/me
	// call can race it and read the still-valid session, then bounce the user
	// straight back (resurrected session). Logout flows set a sessionStorage flag;
	// seeing it, we clear the stale session state client-side and stay put.
	useEffect(() => {
		let justLoggedOut = false;
		try {
			justLoggedOut = sessionStorage.getItem('just-logged-out') === '1';
			if (justLoggedOut) sessionStorage.removeItem('just-logged-out');
		} catch { /* private mode */ }
		fetch('/api/auth/me')
			.then((r) => r.json())
			.then((d) => {
				if (justLoggedOut) {
					setCheckingAuth(false);
					return;
				}
				if (d.success && d.data) {
					const role = d.data.role;
					const target =
						role === 'owner'
							? '/owner'
							: ['super_admin', 'sub_admin', 'admin'].includes(role)
								? safeRedirect(rawRedirect) || '/admin'
								: '/subscribe';
					window.location.replace(target);
				} else {
					setCheckingAuth(false);
				}
			})
			.catch(() => setCheckingAuth(false));
	}, [rawRedirect]);

	if (checkingAuth) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="size-10 animate-pulse rounded-full bg-orange/40" />
					<span className="animate-breath font-arabic text-sm text-muted-foreground">
						جاري التحميل...
					</span>
				</div>
			</div>
		);
	}

	async function handleSubmit(e: React.SyntheticEvent) {
		e.preventDefault();
		setLoading(true);

		try {
			const res = await csrfFetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				premiumToast('error', data.message || 'فشل تسجيل الدخول');
				return;
			}

			premiumToast('success', 'تم تسجيل الدخول بنجاح');

			// ponytail: window.location.replace avoids router.push + router.refresh race
			// that causes blank screen in Next.js 16 App Router (rehydration mismatch)
			const role = data.user?.role;
			const status = data.user?.subscriptionStatus;
			const target =
				role === 'owner'
					? // Owner must never land on /admin — redirect param may be a
						// leftover from an admin-area visit or the '/admin' default.
						rawRedirect && rawRedirect.startsWith('/owner')
						? rawRedirect
						: '/owner'
					: ['super_admin', 'sub_admin', 'admin'].includes(role)
						? safeRedirect(rawRedirect) || '/admin'
						: status === 'UNPAID' || role === 'USER'
							? '/subscribe'
							: '/login';
			setTimeout(() => window.location.replace(target), 150);
		} catch {
			premiumToast('error', 'خطأ في الاتصال بالخادم');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="relative flex min-h-dvh items-center justify-center px-4 py-20 sm:px-6">
			{/* Background gradient */}
			<div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_78%_10%,oklch(0.55_0.19_45_/_0.10),transparent_34%),radial-gradient(circle_at_14%_88%,oklch(0.55_0.19_45_/_0.06),transparent_30%)] dark:bg-[radial-gradient(circle_at_78%_10%,oklch(0.55_0.19_45_/_0.12),transparent_34%),radial-gradient(circle_at_14%_88%,oklch(0.55_0.19_45_/_0.08),transparent_30%)]" />

			<FloatingShapes />

			{/* Back to home + ThemeToggle */}
			<div className="fixed start-4 top-4 z-50 flex items-center gap-2">
				<Link href="/">
					<Button
						variant="ghost"
						size="sm"
						className="gap-1 text-muted-foreground/60 hover:text-foreground"
					>
						<MotionArrowRight className="size-3.5" />
						العودة للرئيسية
					</Button>
				</Link>
				<ThemeToggle />
			</div>

			{/* Decorative top bar */}
			<div className="fixed top-0 inset-x-0 z-10 h-1 bg-gradient-to-r from-orange via-orange/80 to-orange/60 dark:from-orange dark:via-orange/80 dark:to-orange/60" />

			<Card className="animate-scale-in relative z-10 w-full max-w-sm border-border/50 bg-card/90 shadow-2xl shadow-black/8 backdrop-blur-xl sm:max-w-md dark:shadow-black/30" elevation="elevated">
				{/* Logo area */}
				<CardHeader className="pb-2 pt-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
						<Image
							src="/brand-icon.png"
							alt="الربط الذكي"
							width={160}
							height={160}
							className="h-full w-full object-contain"
							priority
						/>
					</div>
					{/* a11y: real h1 — page previously had no level-1 heading.
					    CardTitle renders a <div>, so the h1 is a plain element styled to match. */}
					<h1 className="font-heading font-arabic text-2xl leading-snug font-bold">
						الربط الذكي
					</h1>
					<CardDescription className="font-arabic text-base text-muted-foreground/80">
						لوحة تحكم المطاعم
					</CardDescription>
				</CardHeader>

				<CardContent className="px-6 pb-8 pt-4 sm:px-8">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="username" className="font-arabic text-sm font-medium">
								اسم المستخدم
							</Label>
							<div className="rounded-xl border border-input bg-muted/20 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-orange/50 focus-within:ring-2 focus-within:ring-orange/15">
								<Input
									id="username"
									type="text"
									autoComplete="username"
									dir="auto"
									placeholder="اسم المستخدم"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
									autoFocus
									className="border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-0 rounded-sm"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password" className="font-arabic text-sm font-medium">
								كلمة المرور
							</Label>
							<div className="relative rounded-xl border border-input bg-muted/20 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-orange/50 focus-within:ring-2 focus-within:ring-orange/15">
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									autoComplete="current-password"
									dir="auto"
									placeholder="كلمة المرور"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="border-0 bg-transparent pe-9 focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-0"
								/>
								{/* a11y (2.5.8 target size): size-11 hit area via negative margin
									around the icon so the visual layout is unchanged */}
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute end-1.5 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60 focus-visible:rounded-full"
									aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
								>
									{showPassword ? <AnimatedEyeOff className="size-4" /> : <AnimatedEye className="size-4" />}
								</button>
							</div>
						</div>

						<Button
							type="submit"
							variant="orange"
							className="mt-2 h-12 w-full rounded-lg font-arabic text-base font-semibold"
							disabled={loading}
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<LogIn className="size-4 animate-pulse" />
									جاري تسجيل الدخول...
								</span>
							) : (
								<span className="flex items-center gap-2">
									<LogIn className="size-4" />
									تسجيل الدخول
								</span>
							)}
						</Button>

						{/* Forgot password */}
						<div className="mt-3 text-center">
							<button
								type="button"
								onClick={() => setShowForgot(true)}
								className="font-arabic text-xs text-muted-foreground/70 underline-offset-4 hover:text-orange hover:underline transition-colors"
							>
								نسيت كلمة المرور؟
							</button>
						</div>
					</form>

					{/* Forgot password help dialog */}
					<Dialog open={showForgot} onOpenChange={setShowForgot}>
						<DialogContent className="max-w-sm rounded-2xl font-arabic">
							<DialogHeader>
								<DialogTitle className="font-arabic text-lg">استعادة كلمة المرور</DialogTitle>
								<DialogDescription className="font-arabic text-sm leading-relaxed">
									لإعادة تعيين كلمة مرورك، تواصل مع الدعم عبر واتساب وسنقوم بإعادة تعيينها
									خلال وقت قصير.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<a
									href={`https://wa.me/${SUPPORT_WHATSAPP}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/30 px-4 py-2.5 text-sm font-medium text-success hover:bg-success/15 transition-colors"
								>
									<AnimatedMessageCircle className="size-4" />
									تواصل عبر واتساب
								</a>
								<Button variant="outline" className="w-full" onClick={() => setShowForgot(false)}>
									إغلاق
								</Button>
							</div>
						</DialogContent>
					</Dialog>

					{/* Demo credentials hint — dev-only (security: don't advertise test
						credentials in production builds) */}
					{process.env.NODE_ENV === 'development' && (
						<div className="mt-4 rounded-md border border-orange/20 bg-orange-muted/30 p-3 font-arabic text-xs">
							<p className="text-muted-foreground">
								حساب تجريبي: <span className="font-semibold text-foreground" dir="ltr">waha</span> /{' '}
								<span className="font-semibold text-foreground" dir="ltr">waha123</span>
							</p>
							<Link href="/menu/al-waha-cafe" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-orange/30 bg-card/60 px-3 py-2 text-xs font-semibold text-orange transition-colors hover:bg-orange/10">
								فتح المنيو التجريبي
							</Link>
						</div>
					)}

					{/* Footer */}
					<p className="mt-6 text-center text-xs text-muted-foreground/60 font-arabic">
						نظام إدارة المطاعم · الربط الذكي
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-dvh items-center justify-center bg-background">
					<div className="flex flex-col items-center gap-3">
						<div className="size-10 animate-pulse rounded-full bg-orange/40" />
						<span className="animate-breath font-arabic text-sm text-muted-foreground">
							جاري التحميل...
						</span>
					</div>
				</div>
			}
		>
			<LoginForm />
		</Suspense>
	);
}
