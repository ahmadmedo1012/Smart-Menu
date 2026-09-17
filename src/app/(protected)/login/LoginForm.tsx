'use client';

/**
 * LoginForm — client island for the login page (r113-F114).
 *
 * Split out of page.tsx when the page became a server component: the session
 * is now checked on the SERVER (page.tsx redirects already-authenticated
 * users before a single byte of the form is streamed), so this component:
 *   - renders the form IMMEDIATELY (no `checkingAuth` loader-swap — that swap
 *     was a full-viewport layout change measured at CLS 0.46-0.47 on every
 *     anonymous visit, and the `/api/auth/me` probe logged a 401 console
 *     error on every load);
 *   - receives the post-login redirect target as a PROP (no useSearchParams,
 *     so no Suspense boundary is required either).
 * The old client-side "resurrected session" race (logout POST vs /me GET) is
 * structurally gone: by the time this HTML arrives, the server has already
 * seen the post-logout cookie state.
 */

import { useState } from 'react';
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
import { LogIn } from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import AnimatedEyeOff from '@/components/ui/eye-off-icon';
import AnimatedEye from '@/components/ui/eye-icon';

const SUPPORT_WHATSAPP = '218910089975';

function FloatingShapes() {
        return (
                <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                        {/* r95 (95-D): تهدئة الأجواء لمرجع SmartBot الهادئ — توهج واحد خافت فقط */}
                        <div
                                className="absolute -end-28 -top-24 size-[18rem] rounded-full bg-orange/5 blur-[120px] dark:bg-orange/4"
                        />
                </div>
        );
}

function safeRedirect(value: string | null) {
        if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
        return value;
}

export function LoginForm({ redirectParam }: { redirectParam: string | null }) {
        const rawRedirect = redirectParam;

        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [loading, setLoading] = useState(false);
        const [showPassword, setShowPassword] = useState(false);
        const [showForgot, setShowForgot] = useState(false);

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
                        {/* r95: خلفية لهبية — oklch(0.55 0.19 45) القديم → var(--c-flame)
                           بنفس الشفافيات عبر color-mix (بنمط FeaturedShowcase المعتمد) */}
                        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_78%_10%,color-mix(in_oklab,var(--c-flame)_6%,transparent),transparent_30%),radial-gradient(circle_at_14%_88%,color-mix(in_oklab,var(--c-flame)_4%,transparent),transparent_26%)] dark:bg-[radial-gradient(circle_at_78%_10%,color-mix(in_oklab,var(--c-flame)_7%,transparent),transparent_30%),radial-gradient(circle_at_14%_88%,color-mix(in_oklab,var(--c-flame)_5%,transparent),transparent_26%)]" />

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

                        {/* r95: بطاقة دخول SmartBot — ظل black/20 + حدود border/50 */}
                        <Card className="animate-scale-in relative z-10 w-full max-w-sm rounded-2xl border-border/50 bg-card/90 shadow-lg shadow-black/20 backdrop-blur-xl sm:max-w-md" elevation="elevated">
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
                                                        {/* r95: حقل SmartBot — bg-secondary/40 + تركيز ring اللهب */}
                                                        <div className="rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
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
                                                        {/* r95: حقل SmartBot — bg-secondary/40 + تركيز ring اللهب */}
                                                        <div className="relative rounded-xl border border-border/50 bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
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

                                                {/* Forgot password — r113-F117: py-2 enlarges the tap target to
                                                        WCAG 2.5.8 (≥24px); -my-1 keeps the visual rhythm close. */}
                                                <div className="mt-3 text-center">
                                                        <button
                                                                type="button"
                                                                onClick={() => setShowForgot(true)}
                                                                className="-my-1 py-2 font-arabic text-xs text-muted-foreground underline-offset-4 hover:text-accent-foreground hover:underline transition-colors"
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
                                                        {/* r95: نص accent-foreground — #df5a00 يحقق 5.42:1 على
                                                                           bg-card/60 (text-orange كان 3.9:1 بلا AA للنص). */}
                                                        <Link href="/menu/al-waha-cafe-demo" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-orange/30 bg-card/60 px-3 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-orange/10">
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
