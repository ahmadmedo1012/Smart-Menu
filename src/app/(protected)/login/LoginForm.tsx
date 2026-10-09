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

import { useRef, useState } from 'react';
import { premiumToast } from '@/lib/premium-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { csrfFetch } from '@/lib/csrf-client';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';
import { toArabicNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
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

function safeRedirect(value: string | null) {
        // r118-A4-P3: mirror of the page-level guard — WHATWG URL parsing
        // treats '\' as '/' ('/\evil.com' → '//evil.com' network-path).
        if (!value || !value.startsWith('/') || value.startsWith('//') || value[1] === '\\') return null;
        return value;
}

export function LoginForm({ redirectParam }: { redirectParam: string | null }) {
        const rawRedirect = redirectParam;

        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [loading, setLoading] = useState(false);
        const [showPassword, setShowPassword] = useState(false);
        const [showForgot, setShowForgot] = useState(false);
        /* r126 (P4-F1 M8, audit D2): inline validation mirroring the
         * SubscribeForm gold standard — per-field error state (touched OR
         * submitted), aria-invalid + aria-describedby wiring, persistent
         * role="alert" messages (the toast stays as a supplement only), and
         * focus-after-error on the first invalid field. */
        const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
        const [submitted, setSubmitted] = useState(false);
        const [formError, setFormError] = useState<string | null>(null);
        const usernameRef = useRef<HTMLInputElement>(null);
        const passwordRef = useRef<HTMLInputElement>(null);

        const touchField = (field: string) => setFieldTouched((prev) => ({ ...prev, [field]: true }));
        const fieldError = (field: string) => {
                const touched = fieldTouched[field] || submitted;
                if (!touched) return false;
                if (field === 'username') return username.trim().length < 3;
                if (field === 'password') return password.trim().length < PASSWORD_MIN_LENGTH;
                return false;
        };

        async function handleSubmit(e: React.SyntheticEvent) {
                e.preventDefault();
                setSubmitted(true);
                setFormError(null);

                // Client-side gate: focus the first invalid field, no request.
                // (Direct checks — the submitted flag above is async and not
                // yet visible in this closure.)
                if (username.trim().length < 3) {
                        usernameRef.current?.focus();
                        return;
                }
                if (password.trim().length < PASSWORD_MIN_LENGTH) {
                        passwordRef.current?.focus();
                        return;
                }

                setLoading(true);

                try {
                        const res = await csrfFetch('/api/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username, password }),
                        });

                        const data = await res.json();

                        if (!res.ok) {
                                setFormError(data.message || 'تعذّر تسجيل الدخول');
                                usernameRef.current?.focus();
                                premiumToast('error', data.message || 'تعذّر تسجيل الدخول');
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
                        setFormError('خطأ في الاتصال بالخادم');
                        usernameRef.current?.focus();
                        premiumToast('error', 'خطأ في الاتصال بالخادم');
                } finally {
                        setLoading(false);
                }
        }

        return (
                <div className="relative flex min-h-dvh items-center justify-center px-4 py-20 sm:px-6">
                        {/* r128-F5 (§4 login): إزالة التدرّجات — لا غسلة لهبية ولا توهج
                           ضبابي؛ الأرض المسطّحة هي أرض المنتج نفسها (ليل #070B16
                           في الداكن). صفحة هادئة بتصميمها. */}

                        {/* Back to home + ThemeToggle */}
                        <div className="fixed start-4 top-4 z-50 flex items-center gap-2">
                                <Link href="/">
                                        {/* r131 (A2 P2-5): زر العودة — حبة 40px بحدّ شعري وسطح
                                            (نمط .auth-back-home) بدل الشبح بلا حدود. */}
                                        <Button
                                                variant="outline"
                                                className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
                                        >
                                                <MotionArrowRight className="size-3.5" />
                                                العودة للرئيسية
                                        </Button>
                                </Link>
                                <ThemeToggle />
                        </div>

                        {/* r95 → r128-F5 → r130 (W2-3, P2) → r131 (A2 P2-1): بطاقة الدخول —
                           عرض auth-card القانوني ٤٤٠px (كان ٣٨٤/٤٤٨ ثنائي القيمة)،
                           الحدّ الشعري النحاسي ٢px أعلى البطاقة (canonical
                           auth.css:179-188: inset-inline 30%، تدرّج
                           transparent→accent→transparent، نصف قطر 2px)،
                           حشوة البطاقة clamp(32px,4vw,48px) (auth.css:145). */}
                        <Card className="animate-scale-in relative z-10 w-full max-w-[27.5rem] rounded-2xl border-border/50 bg-card p-0">
                                {/* canonical .auth-card::before — the short copper hairline */}
                                <span
                                        aria-hidden="true"
                                        className="absolute inset-x-[30%] top-0 h-0.5 rounded-b-full bg-[linear-gradient(90deg,transparent,var(--accent-solid),transparent)]"
                                />
                                {/* Logo area */}
                                <CardHeader className="px-[clamp(2rem,4vw,3rem)] pb-2 pt-[clamp(2rem,4vw,3rem)] text-center">
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

                                <CardContent className="px-[clamp(2rem,4vw,3rem)] pb-[clamp(2rem,4vw,3rem)] pt-4">
                                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                                {/* r126 (P4-F1 M8): persistent server-error line — announced
                                                        via role=alert; focus returns to the username field.
                                                        r131 (A2 P2-4): 13px/600 + 16/12 padding (canonical
                                                        .form-error; was 12px/500). */}
                                                {formError && (
                                                        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] font-semibold text-destructive">
                                                                {formError}
                                                        </p>
                                                )}
                                                <div className="space-y-2">
                                                        <Label htmlFor="username" className="font-arabic text-sm font-medium">
                                                                اسم المستخدم
                                                        </Label>
                                                        {/* r95: حقل SmartBot — bg-secondary/40
                                                           r131 (A2 P2-3): هالة التركيز القانونية 3px/22%
                                                           (‏--state-input-focus-halo) بدل ring-2/25 — تكوين واحد
                                                           للحلقات في كل الأسطح. */}
                                                        <div
                                                                className={cn(
                                                                        'rounded-xl border bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-fast focus-within:border-ring focus-within:shadow-[var(--state-input-focus-halo)]',
                                                                        fieldError('username') ? 'border-destructive/60' : 'border-border/50'
                                                                )}
                                                        >
                                                                <Input
                                                                        id="username"
                                                                        type="text"
                                                                        autoComplete="username"
                                                                        dir="auto"
                                                                        placeholder="اسم المستخدم"
                                                                        value={username}
                                                                        onChange={(e) => {
                                                                                setUsername(e.target.value);
                                                                                setSubmitted(false);
                                                                                setFormError(null);
                                                                        }}
                                                                        onBlur={() => touchField('username')}
                                                                        required
                                                                        autoFocus
                                                                        ref={usernameRef}
                                                                        aria-invalid={fieldError('username') || undefined}
                                                                        aria-describedby={fieldError('username') ? 'username-error' : undefined}
                                                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:shadow-none rounded-sm"
                                                                />
                                                        </div>
                                                        {fieldError('username') && (
                                                                <p id="username-error" role="alert" className="text-xs text-destructive mt-1">
                                                                        اسم المستخدم مطلوب (3 أحرف على الأقل)
                                                                </p>
                                                        )}
                                                </div>

                                                <div className="space-y-2">
                                                        <Label htmlFor="password" className="font-arabic text-sm font-medium">
                                                                كلمة المرور
                                                        </Label>
                                                        {/* r95: حقل SmartBot — bg-secondary/40
                                                           r131 (A2 P2-3): هالة التركيز القانونية 3px/22% بدل ring-2/25. */}
                                                        <div
                                                                className={cn(
                                                                        'relative rounded-xl border bg-secondary/40 shadow-xs transition-[border-color,box-shadow] duration-fast focus-within:border-ring focus-within:shadow-[var(--state-input-focus-halo)]',
                                                                        fieldError('password') ? 'border-destructive/60' : 'border-border/50'
                                                                )}
                                                        >
                                                                <Input
                                                                        id="password"
                                                                        type={showPassword ? 'text' : 'password'}
                                                                        autoComplete="current-password"
                                                                        dir="auto"
                                                                        placeholder="كلمة المرور"
                                                                        value={password}
                                                                        onChange={(e) => {
                                                                                setPassword(e.target.value);
                                                                                setSubmitted(false);
                                                                                setFormError(null);
                                                                        }}
                                                                        onBlur={() => touchField('password')}
                                                                        required
                                                                        ref={passwordRef}
                                                                        aria-invalid={fieldError('password') || undefined}
                                                                        aria-describedby={fieldError('password') ? 'password-error' : undefined}
                                                                        className="border-0 bg-transparent pe-9 focus-visible:ring-0 focus-visible:shadow-none"
                                                                />
                                                                {/* a11y (2.5.8 target size): size-11 hit area via negative margin
                                                                        around the icon so the visual layout is unchanged */}
                                                                <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute end-1.5 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-full"
                                                                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                                                >
                                                                        {showPassword ? <AnimatedEyeOff className="size-4" /> : <AnimatedEye className="size-4" />}
                                                                </button>
                                                        </div>
                                                        {fieldError('password') && (
                                                                <p id="password-error" role="alert" className="text-xs text-destructive mt-1">
                                                                        كلمة المرور مطلوبة ({toArabicNumber(PASSWORD_MIN_LENGTH)} أحرف على الأقل)
                                                                </p>
                                                        )}
                                                </div>

                                                {/* r131 (A2 P2-2): زر الإرسال — القانوني 15px/700/r-md
                                                    (auth.css:514)؛ كان 600 و r-lg (12px). */}
                                                <Button
                                                        type="submit"
                                                        variant="orange"
                                                        className="mt-2 h-12 w-full rounded-md font-arabic text-base font-bold"
                                                        disabled={loading}
                                                >
                                                        {loading ? (
                                                                <span className="flex items-center gap-2">
                                                                        <LogIn className="size-4 animate-pulse" />
                                                                        جارٍ تسجيل الدخول…
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

                                        {/* r120 (U11-P2-10): صفحة الدخول كانت بلا أي مسار إلى
                                                التسجيل — اكتشاف إنشاء حساب جديد مستحيل من هنا. */}
                                        <p className="mt-4 text-center text-sm text-muted-foreground">
                                                ليس لديك حساب؟{' '}
                                                <Link
                                                        href="/subscribe"
                                                        className="font-semibold text-accent-foreground hover:underline underline-offset-4"
                                                >
                                                        أنشئ منيوك الآن
                                                </Link>
                                        </p>

                                        {/* Footer */}
                                        <p className="mt-6 text-center text-xs text-muted-foreground font-arabic">
                                                نظام إدارة المطاعم · الربط الذكي
                                        </p>
                                </CardContent>
                        </Card>
                </div>
        );
}
