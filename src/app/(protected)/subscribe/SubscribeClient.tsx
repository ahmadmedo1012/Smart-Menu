'use client';
import { getErrorMessage } from '@/lib/get-error-message';
import type { Plan } from '@/lib/plan-types';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// ponytail: PaymentSection dynamically imported — ~50KB gzipped chunk deferred until payment flow
import { Button } from '@/components/ui/button';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { fetchJson } from '@/lib/fetch-json';
import { Header } from '@/components/layout/Header';
import { PlanSelector } from './PlanSelector';
import { SubscribeForm } from './SubscribeForm';
import { StepIndicator, type WizardStep } from './StepIndicator';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';
import dynamic from 'next/dynamic';
const PaymentDialogWrapper = dynamic(
        () => import('./PaymentSection').then((m) => ({ default: m.PaymentDialogWrapper })),
        { ssr: false }
);
const UpgradePlanSummary = dynamic(
        () => import('./PaymentSection').then((m) => ({ default: m.UpgradePlanSummary })),
        { ssr: false }
);

// F-D/round91: ?plan= deep-links can carry a plan NAME (?plan=PREMIUM) —
// Number("PREMIUM") is NaN, so the id/position lookups miss and the wizard
// dead-ended on «تعذر تحميل الخطة المحددة». Resolution order: exact id →
// 1-based position in sortOrder (ids may shift in DB) → case-insensitive
// plan name (DB names: Free/Basic/Premium/Pro/Business). Unknown values
// still fall through to the existing retry error path.
function resolvePreselectedPlan(plans: Plan[], value: string): Plan | undefined {
        const sorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
        const byId = plans.find((pl) => pl.id === Number(value));
        const byPos = sorted[Number(value) - 1];
        const byName = plans.find(
                (pl) => pl.name.toLowerCase() === value.trim().toLowerCase()
        );
        return byId ?? byPos ?? byName;
}

/**
 * r121-G-5 (X3-V1 — pricing twin, round86-B5 pattern): the wizard is now
 * seeded with server-baked plans (page.tsx fetches them on the server and
 * passes `initialPlans`), so the H1 + step chrome + plan cards paint in the
 * SSR shell instead of a spinner (was: 100% client-gated on /api/plans +
 * /api/auth/me, H1 absent from the server HTML, 4.47s live LCP). The
 * /api/plans client fetch survives only as the fallback for when the server
 * data was missing (DB hiccup); the /api/auth/me upgrade-mode probe stays
 * client-side by design (auth-dependent branch — X3 verdict).
 */
export function SubscribeClient({ initialPlans }: { initialPlans: Plan[] | null }) {
        const router = useRouter();
        const searchParams = useSearchParams();
        const preselectedPlan = searchParams.get('plan');

        const [plans, setPlans] = useState<Plan[]>(initialPlans ?? []);
        const [selectedPlan, setSelectedPlan] = useState<number | null>(() =>
                // r121-G-5: ?plan= deep-links resolve against the server-baked plans on
                // first render — no fetch round-trip before the wizard opens (the
                // fallback path below re-resolves after a successful client fetch).
                preselectedPlan && initialPlans
                        ? (resolvePreselectedPlan(initialPlans, preselectedPlan)?.id ?? null)
                        : null
        );
        const [loading, setLoading] = useState(initialPlans === null);
        const [submitting, setSubmitting] = useState(false);
        const submittedRef = useRef(false);
        const [step, setStep] = useState<WizardStep>(preselectedPlan ? 'menu' : 'plan');
        const [paymentOpen, setPaymentOpen] = useState(false);
        const [user, setUser] = useState<{
                role: string;
                subscriptionStatus: string;
                restaurantId: number | null;
        } | null>(null);
        const [upgradeMode, setUpgradeMode] = useState(false);

        const [authLoaded, setAuthLoaded] = useState(false);
        const [form, setForm] = useState({
                restaurants: [
                        { name: '', slug: '', description: '', phone: '', whatsapp: '' },
                ],
                username: '',
                password: '',
        });

        useEffect(() => {
                // r121-G-5: with server-baked plans there is nothing to fetch — this
                // effect is only the FALLBACK for when the server couldn't provide
                // them (round86-B5 PricingClient contract), keeping its 1s auto-retry.
                if (initialPlans !== null) return;
                let retried = false;
                let retryTimer: ReturnType<typeof setTimeout> | undefined;
                const fetchPlans = async () => {
                        try {
                                const data = await fetchJson<{ data?: Plan[] }>('/api/plans');
                                const p = data.data ?? [];
                                setPlans(p);
                                if (preselectedPlan) {
                                        const found = resolvePreselectedPlan(p, preselectedPlan);
                                        if (found) setSelectedPlan(found.id);
                                }
                        } catch {
                                premiumToast('error', 'فشل تحميل الخطط');
                                // auto-retry once after 1s — cold-start /api/plans may return non-JSON 200
                                if (!retried) {
                                        retried = true;
                                        retryTimer = setTimeout(fetchPlans, 1000);
                                }
                        } finally {
                                setLoading(false);
                        }
                };
                fetchPlans();
                return () => {
                        if (retryTimer) clearTimeout(retryTimer);
                };
        }, [preselectedPlan, initialPlans]);

        // B1 fix: manual retry after both auto-retries failed (no more infinite skeleton)
        const handleRetryPlans = useCallback(() => {
                setLoading(true);
                setPlans([]);
                fetch('/api/plans')
                        .then((r) => r.json())
                        .then((data) => {
                                const p = data.data ?? [];
                                setPlans(p);
                                if (preselectedPlan) {
                                        const found = resolvePreselectedPlan(p, preselectedPlan);
                                        if (found) setSelectedPlan(found.id);
                                }
                        })
                        .catch(() => premiumToast('error', 'فشل تحميل الخطط'))
                        .finally(() => setLoading(false));
        }, [preselectedPlan]);

        useEffect(() => {
                fetch('/api/auth/me')
                        .then((r) => r.json())
                        .then((d) => {
                                if (d.success && d.data) {
                                        const u = d.data;
                                        if (u.role === 'owner' && u.restaurantId) {
                                                // Allow PAID owners to see the page (they may want to upgrade)
                                                setUser({
                                                        role: u.role,
                                                        subscriptionStatus: u.subscriptionStatus,
                                                        restaurantId: u.restaurantId,
                                                });
                                                setUpgradeMode(true);
                                        }
                                }
                        })
                        .catch(() => {})
                        .finally(() => setAuthLoaded(true));
        }, []);

        // Poll for rejection/approval after submit — SSE streams die at Vercel's
        // 300s cap, so poll the user's events instead.
        const [sseOpen, setSseOpen] = useState(false);
        useEffect(() => {
                if (!sseOpen) return;
                let lastId = 0;
                let cancelled = false;
                const poll = async () => {
                        try {
                                const res = await fetch(`/api/user/events?sinceId=${lastId}`);
                                if (!res.ok) return;
                                const json = await res.json();
                                const events = json.data ?? [];
                                for (const data of events) {
                                        if (data.id > lastId) lastId = data.id;
                                        if (data.eventType === 'subscription_rejected') {
                                                setPaymentOpen(false);
                                                submittedRef.current = false;
                                                setSubmitting(false);
                                                premiumToast('error', data.message || 'عذراً، تم رفض طلب التفعيل');
                                        }
                                        if (data.eventType === 'subscription_approved') {
                                                setPaymentOpen(false);
                                                premiumToast('success', 'تم تفعيل حسابك بنجاح! جارِ نقلك إلى لوحة التحكم...');
                                                setTimeout(() => window.location.replace('/owner'), 500);
                                                return;
                                        }
                                }
                        } catch {
                                /* transient */
                        }
                };
                poll();
                const interval = setInterval(() => {
                        if (!cancelled) poll();
                }, 15_000);
                return () => {
                        cancelled = true;
                        clearInterval(interval);
                };
        }, [sseOpen]);

        const currentPlan = plans.find((p) => p.id === selectedPlan);
        const allRestaurantsValid = form.restaurants.every(
                (r) => r.name.trim().length >= 2 && r.slug.trim().length >= 3
        );
        const isFormValid =
                allRestaurantsValid &&
                form.username.trim().length >= 3 &&
                form.password.trim().length >= PASSWORD_MIN_LENGTH;

        const handleSubmit = async () => {
                // double-submit guard (round-76): check FIRST, then set
                if (submittedRef.current) return;
                // Validate BEFORE latching the guard: a click that lands while state is
                // momentarily inconsistent must stay retryable, otherwise the button
                // bricks silently (observed in e2e: review-step clicks, no network call).
                if (!selectedPlan || !isFormValid || upgradeMode) return;
                submittedRef.current = true;

                // Pre-flight: validate username + ALL slugs
                try {
                        const valRes = await csrfFetch('/api/subscriptions/validate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        username: form.username.trim(),
                                        slugs: form.restaurants.map((r) =>
                                                r.slug
                                                        .trim()
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9-]/g, '-')
                                        ),
                                }),
                        });
                        const valJson = await valRes.json();
                        if (!valJson.success || !valJson.data?.valid) {
                                const errs = valJson.data?.errors ?? {};
                                if (errs.username) premiumToast('error', errs.username);
                                if (errs.slugs) premiumToast('error', errs.slugs);
                                if (!errs.username && !errs.slugs) premiumToast('error', 'البيانات غير صالحة');
                                submittedRef.current = false; // allow retry after failed validation
                                return;
                        }
                } catch {
                        premiumToast('error', 'خطأ في التحقق من البيانات');
                        submittedRef.current = false;
                        return;
                }

                // Paid plan → register then payment dialog
                if (currentPlan && Number(currentPlan.price) > 0) {
                        setSubmitting(true);
                        try {
                                // r103-F3: retry after a REJECTED payment — the account was
                                // already created on the first attempt (register runs before
                                // payment). Re-registering 409s and the pre-flight validate
                                // blocks the same username, dead-ending the user into orphan
                                // accounts. The server's retry contract (subscriptions POST
                                // allows tempUsername == the authenticated user) is now honored
                                // client-side: same logged-in username → skip register.
                                let alreadyRegistered = false;
                                try {
                                        const meRes = await fetch('/api/auth/me');
                                        const meJson = await meRes.json();
                                        if (meJson.success && meJson.data?.username === form.username.trim()) {
                                                alreadyRegistered = true;
                                        }
                                } catch { /* offline me-check → fall through to register */ }
                                if (!alreadyRegistered) {
                                        const regRes = await csrfFetch('/api/auth/register', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                        username: form.username.trim(),
                                                        password: form.password.trim(),
                                                        name: form.restaurants[0]?.name.trim() || form.username.trim(),
                                                }),
                                        });
                                        const regJson = await regRes.json();
                                        if (!regRes.ok) throw new Error(regJson.error ?? 'فشل إنشاء الحساب');
                                }
                                setPaymentOpen(true);
                                setSseOpen(true);
                        } catch (e) {
                                premiumToast('error', getErrorMessage(e));
                                submittedRef.current = false; // allow retry after register failure
                        } finally {
                                setSubmitting(false);
                        }
                        return;
                }

                // Free plan
                await createAccount();
        };

        const handlePaymentSuccess = async () => {
                try {
                        const meRes = await fetch('/api/auth/me');
                        const meData = await meRes.json();
                        if (meData.success && meData.data?.restaurantId) {
                                if (meData.data?.subscriptionStatus !== 'PAID')
                                        premiumToast('info', 'تم إرسال طلب الترقية. سيتم تفعيلها بعد موافقة الإدارة.');
                                router.push('/owner');
                                return;
                        }
                } catch {}
                premiumToast('info', 'طلبك قيد المراجعة من الإدارة. سيتم إشعارك عند التفعيل.');
        };

        const createAccount = async () => {
                if (!selectedPlan || !isFormValid) {
                        premiumToast('error', 'يرجى تعبئة جميع الحقول المطلوبة');
                        return;
                }
                setSubmitting(true);
                try {
                        const res = await csrfFetch('/api/restaurants', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        restaurants: form.restaurants.map((r) => ({
                                                name: r.name.trim(),
                                                slug: r.slug
                                                        .trim()
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9-]/g, '-'),
                                                description: r.description.trim(),
                                                phone: r.phone.trim(),
                                                whatsapp: r.whatsapp.trim(),
                                        })),
                                        // planId: only for paid plans — the API forbids planId on
                                        // self-registration (round-76). Free plan = no planId (default).
                                        ...(currentPlan && Number(currentPlan.price) > 0 ? { planId: selectedPlan } : {}),
                                        username: form.username.trim(),
                                        password: form.password.trim(),
                                }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error ?? 'فشل إنشاء الحساب');
                        if (currentPlan && Number(currentPlan.price) === 0) {
                                setSseOpen(true);
                                const loginRes = await csrfFetch('/api/auth/login', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ username: form.username.trim(), password: form.password.trim() }),
                                });
                                if (loginRes.ok) {
                                        premiumToast('success', 'تم إنشاء حسابك! جارِ نقلك إلى لوحة التحكم...');
                                        router.push('/owner');
                                        router.refresh();
                                        return;
                                }
                        }
                        premiumToast('success', 'تم إنشاء الحساب! يمكنك تسجيل الدخول الآن');
                        router.push('/login');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e));
                } finally {
                        setSubmitting(false);
                }
        };

        /* r131 (A11/A2 P2-17): هيكل على شكل الصفحة بدل الغزل المجرّد — نفس هندسة
           بطاقات الباقات في /pricing (رأس + مؤشر خطوات + شبكة ٤ بطاقات). التزام
           مدارك: ‎.skeleton يركب ‎--motion-duration-skeleton (1200ms)، الدخول
           rise-in بتدرّج 60ms، بلا-JS بالكامل. */
        if (loading)
                return (
                        <div className="min-h-screen bg-background">
                                <Header />
                                <div className="max-w-4xl mx-auto px-4 py-12" role="status" aria-live="polite">
                                        <LoadingAnnouncer loading={loading} message="جارٍ تحميل صفحة الاشتراك..." />
                                        <div className="text-center mb-10" aria-hidden="true">
                                                <div className="h-3.5 w-24 mx-auto rounded-md skeleton mb-4" />
                                                <div className="h-8 w-64 mx-auto rounded-md skeleton" />
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mb-10" aria-hidden="true">
                                                {[0, 1, 2, 3].map((i) => (
                                                        <div key={i} className="flex items-center">
                                                                <div className="size-10 rounded-full skeleton" />
                                                                {i < 3 && <div className="w-8 sm:w-14 h-0.5 mx-1 sm:mx-2 rounded-full skeleton" />}
                                                        </div>
                                                ))}
                                        </div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto" aria-hidden="true">
                                                {[...Array(4)].map((_, i) => (
                                                        <div key={i} className="rounded-2xl border border-border/50 p-5 animate-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
                                                                <div className="size-10 rounded-xl skeleton mb-3" />
                                                                <div className="h-4 w-2/3 skeleton rounded-sm mb-3" />
                                                                <div className="h-7 w-1/2 skeleton rounded-sm mb-4" />
                                                                <div className="space-y-2 mb-4">
                                                                        {[...Array(3)].map((_, j) => (
                                                                                <div key={j} className="h-3.5 w-4/5 skeleton rounded-sm" />
                                                                        ))}
                                                                </div>
                                                                <div className="h-10 skeleton rounded-md" />
                                                        </div>
                                                ))}
                                        </div>
                                </div>
                        </div>
                );

        return (
                /* r128-F5 (§4): أرض مسطّحة — تدرّج الصفحة أُزيل (منع التدرّجات)،
                   الأرض هي أرض المنتج نفسها (--background ليل #070B16). */
                <div className="min-h-screen bg-background">
                        <Header />
                        <div className="max-w-4xl mx-auto px-4 py-12">
                                {/* Header */}
                                <div className="text-center mb-10">
                                        {/* r95 → r128-F5 (§4): حاجب بنمط ln-label — تسمية mono
                                           مسطّحة بلا حبة؛ ترقيم الخطوات يعيش في StepIndicator. */}
                                        <p className="mb-4 font-mono text-xs font-medium tracking-[0.08em] text-accent-foreground">
                                                الاشتراك
                                        </p>
                                        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3">
                                                {upgradeMode ? <span>رقِّ خطة مطعمك</span> : <span>انضم إلى الربط الذكي</span>}
                                        </h1>
                                        <p className="text-muted-foreground text-lg">
                                                {upgradeMode
                                                        ? 'اختر باقة أعلى لمزيد من الأصناف والطلبات'
                                                        : 'وأنشئ منيو رقمي لمطعمك في دقائق'}
                                        </p>
                                </div>

                                {/* Step indicator */}
                                <StepIndicator current={step} onNavigate={setStep} />

                                {/* Step 1: Plan selector (with visible error state when plans never loaded) */}
                                {step === 'plan' && plans.length === 0 ? (
                                        <div className="flex flex-col items-center gap-4 py-16 text-center animate-fade-in">
                                                <p className="text-muted-foreground">تعذر تحميل الباقات. يرجى المحاولة مرة أخرى.</p>
                                                <Button variant="outline" onClick={handleRetryPlans}>
                                                        إعادة المحاولة
                                                </Button>
                                        </div>
                                ) : step === 'plan' && (
                                        <PlanSelector
                                                plans={plans}
                                                selectedPlan={selectedPlan}
                                                upgradeMode={upgradeMode}
                                                onSelect={setSelectedPlan}
                                                onContinue={() => setStep('menu')}
                                        />
                                )}

                                {/* Step 2: Upgrade mode (pay only) */}
                                {step === 'menu' && upgradeMode && currentPlan && (
                                        <UpgradePlanSummary
                                                currentPlan={currentPlan}
                                                onBack={() => setStep('plan')}
                                                onPay={() => setPaymentOpen(true)}
                                        />
                                )}

                                {/* Loading state while checking auth (upgrade mode detection)
                                    r131 (A11/A2 P2-17): هيكل على شكل الملخص بدل الغزل المجرّد. */}
                                {step === 'menu' && !authLoaded && (
                                        <div className="max-w-lg mx-auto rounded-2xl border border-border/50 p-5" role="status" aria-label="جارٍ التحقق من نوع الاشتراك">
                                                <div className="flex items-center gap-3 mb-4" aria-hidden="true">
                                                        <div className="size-10 rounded-xl skeleton" />
                                                        <div className="flex-1 space-y-2">
                                                                <div className="h-4 w-1/2 skeleton rounded-sm" />
                                                                <div className="h-3 w-1/3 skeleton rounded-sm" />
                                                        </div>
                                                </div>
                                                <div className="space-y-2 mb-4">
                                                        {[...Array(3)].map((_, j) => (
                                                                <div key={j} className="h-4 w-4/5 skeleton rounded-sm" />
                                                        ))}
                                                </div>
                                                <div className="h-12 skeleton rounded-md" />
                                        </div>
                                )}

                                {/* r121-H-5 (X3-V1 ride-along on the G-5 refactor): upgrade mode +
                                    unresolvable ?plan= used to render NOTHING here (none of the
                                    branches matched — currentPlan undefined, authLoaded true,
                                    upgradeMode true) → an owner on a stale marketing link hit a
                                    blank step. Mirror the r120 SubscribeForm escape (SubscribeForm.tsx
                                    «تعذر تحميل الخطة المحددة») so the dead end is escapable. */}
                                {step !== 'plan' && authLoaded && upgradeMode && !currentPlan && (
                                        <div className="animate-fade-in max-w-lg mx-auto py-10 text-center">
                                                <p className="text-muted-foreground mb-4">تعذر تحميل الخطة المحددة</p>
                                                <Button type="button" variant="flame" onClick={() => setStep('plan')}>
                                                        تصفح جميع الباقات
                                                </Button>
                                        </div>
                                )}

                                {/* Step 2: New registration form */}
                                {step !== 'plan' && authLoaded && !upgradeMode && (
                                        <form
                                                onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleSubmit();
                                                }}
                                        >
                                                <SubscribeForm
                                                        plans={plans}
                                                        selectedPlan={selectedPlan}
                                                        form={form}
                                                        step={step}
                                                        submitting={submitting}
                                                        onStepChange={setStep}
                                                        onFormChange={setForm}
                                                        onRetryPlans={handleRetryPlans}
                                                />
                                        </form>
                                )}

                                {/* Payment Dialog */}
                                {currentPlan && (
                                        <PaymentDialogWrapper
                                                open={paymentOpen}
                                                onOpenChange={setPaymentOpen}
                                                currentPlan={currentPlan}
                                                upgradeMode={upgradeMode}
                                                user={user}
                                                form={form}
                                                onSuccess={handlePaymentSuccess}
                                        />
                                )}
                        </div>
                </div>
        );
}
