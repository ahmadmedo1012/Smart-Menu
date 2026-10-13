'use client';

import { useState } from 'react';
import type { Plan } from '@/lib/plan-types';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { Sparkles, Star, Crown, Building2, Store, Loader2, type LucideIcon } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';
import { premiumToast } from '@/lib/premium-toast';
import { csrfFetch } from '@/lib/csrf-client';
import { MotionArrowLeft, MotionArrowRight } from '@/components/ui/motion-icons';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import type { WizardStep } from './StepIndicator';

/* Phase 6 (r154): خريطة التدرّجات الميتة أُحيلت للتقاعد — بئر الأيقونة
   أصبح طبقًا دائريًا صلبًا (bg-orange) بحافة تراكوتا، بلا تدرّج
   (قانون منع التدرّجات r128-F5). */
const PLAN_ICONS: Record<string, LucideIcon> = {
        Free: Sparkles,
        Basic: Star,
        Premium: Crown,
        Pro: Building2,
        Enterprise: Building2,
};

export interface RestaurantInput {
        name: string;
        slug: string;
        description: string;
        phone: string;
        whatsapp: string;
        /* r133 (A13 S-02): stable draft id for the removable restaurant blocks —
           never submitted (the API payload maps explicit fields only). */
        _key?: string;
}

/* r133 (A13 S-02): key={index} on removable blocks remounted every surviving
   block's DOM after a removal (state is controlled so no data loss, but focus
   and transient input state jumped). Blocks now carry a draft id from birth. */
let menuDraftSeq = 0;
const nextMenuDraftKey = () => `menu-draft-${++menuDraftSeq}`;

export interface FormState {
        restaurants: RestaurantInput[];
        username: string;
        password: string;
}

const EMPTY_RESTAURANT: RestaurantInput = {
        name: '',
        slug: '',
        description: '',
        phone: '',
        whatsapp: '',
};

// r93-W2a (U2): جمع عربي ديناميكي لحدّ المنيوهات في الخطة (نمط cartCountPhrase
// من r92-A9) — «منيوين / 3 منيوهات / 12 منيوًا» بدل «N منيوهات» الثابت الذي كان
// ينكسر عند 2 (مثنى) و11+. الواحد يُعالج خارج الدالة («خطتك تتضمن منيو واحد»).
// مُصدَّرة ليبثها الاختبار (سابقة cartCountPhrase).
export function menusLimitPhrase(count: number): string {
        const noun = getArabicPlural(count, 'منيو', {
                two: 'منيوين',
                few: 'منيوهات',
                many: 'منيوًا',
        });
        return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

export function SubscribeForm({
        plans,
        selectedPlan,
        form,
        step,
        submitting,
        onStepChange,
        onFormChange,
        onRetryPlans,
}: {
        plans: Plan[];
        selectedPlan: number | null;
        form: FormState;
        step: WizardStep;
        submitting: boolean;
        onStepChange: (s: WizardStep) => void;
        onFormChange: (f: FormState) => void;
        onRetryPlans?: () => void;
}) {
        const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
        const [submitted, setSubmitted] = useState(false);
        const reduceMotion = useReducedMotion();

        const touchField = (field: string) => setFieldTouched((prev) => ({ ...prev, [field]: true }));
        const fieldError = (field: string) => {
                const touched = fieldTouched[field] || submitted;
                if (!touched) return false;
                switch (field) {
                        case 'username':
                                return form.username.trim().length < 3;
                        case 'password':
                                return form.password.trim().length < PASSWORD_MIN_LENGTH;
                        default:
                                return false;
                }
        };

        const currentPlan = plans.find((p) => p.id === selectedPlan);
        const maxMenus = Math.max(1, currentPlan?.maxMenus ?? 1);
        const menus = form.restaurants;
        const canAddMenu = menus.length < maxMenus;

        // Per-step validation (slug ≥3 matches server schema)
        const menusValid = menus.every((r) => r.name.trim().length >= 2 && r.slug.trim().length >= 3);
        const accountValid = form.username.trim().length >= 3 && form.password.trim().length >= PASSWORD_MIN_LENGTH;

        const updateRestaurant = (index: number, patch: Partial<RestaurantInput>) => {
                const next = menus.map((r, i) => (i === index ? { ...r, ...patch } : r));
                onFormChange({ ...form, restaurants: next });
                setSubmitted(false);
                setDupErrors({}); // D1 fix: clear stale duplicate errors on edit
        };

        const addRestaurant = () => {
                if (!canAddMenu) return;
                onFormChange({ ...form, restaurants: [...menus, { ...EMPTY_RESTAURANT, _key: nextMenuDraftKey() }] });
                setSubmitted(false); // D3 fix: new empty menu shouldn't show red borders
                setDupErrors({});
        };

        const removeRestaurant = (index: number) => {
                if (menus.length <= 1) return; // keep at least one
                onFormChange({ ...form, restaurants: menus.filter((_, i) => i !== index) });
                setSubmitted(false);
                setDupErrors({});
        };

        const [validating, setValidating] = useState(false);
        const [dupErrors, setDupErrors] = useState<{ username?: string; slug?: string }>({});

        const goNext = async () => {
                if (validating) return; // C1 fix: block double-advance while validation in flight
                if (step === 'menu') {
                        if (!menusValid) {
                                setSubmitted(true);
                                return;
                        }
                        // Pre-flight duplicate check: slug availability BEFORE advancing
                        setValidating(true);
                        setDupErrors({});
                        try {
                                const valRes = await csrfFetch('/api/subscriptions/validate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                                // username not filled yet at menu step — omit to avoid 400
                                                slugs: menus.map((r) =>
                                                        r.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                                ),
                                        }),
                                });
                                const valJson = await valRes.json();
                                if (!valJson.success || !valJson.data?.valid) {
                                        const errs = valJson.data?.errors ?? {};
                                        const slugErr = errs.slug ?? errs.slugs;
                                        setDupErrors({ username: errs.username, slug: slugErr });
                                        if (slugErr) premiumToast('error', slugErr);
                                        return; // stay on menu step
                                }
                                onStepChange('account');
                        } catch {
                                premiumToast('error', 'خطأ في التحقق من البيانات');
                        } finally {
                                setValidating(false);
                        }
                } else if (step === 'account') {
                        if (!accountValid) {
                                setSubmitted(true);
                                return;
                        }
                        // Pre-flight: username availability BEFORE advancing
                        setValidating(true);
                        setDupErrors({});
                        try {
                                const valRes = await csrfFetch('/api/subscriptions/validate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                                username: form.username.trim(),
                                                // slugs already validated at menu step
                                                slugs: [],
                                        }),
                                });
                                const valJson = await valRes.json();
                                if (!valJson.success || !valJson.data?.valid) {
                                        const errs = valJson.data?.errors ?? {};
                                        const slugErr = errs.slug ?? errs.slugs;
                                        setDupErrors({ username: errs.username, slug: slugErr });
                                        if (errs.username) premiumToast('error', errs.username);
                                        return; // stay on account step
                                }
                                onStepChange('review');
                        } catch {
                                premiumToast('error', 'خطأ في التحقق من البيانات');
                        } finally {
                                setValidating(false);
                        }
                }
        };

        if (!currentPlan) {
                // Plans failed to load (deep-link ?plan=N) — offer retry AND an escape to the
                // plan picker. r120 (U10 P2-1): retry alone looped forever when the param itself
                // was unresolvable (stale/renamed plan deep-link) — the user could never leave.
                return (
                        <div className="animate-fade-in max-w-lg mx-auto py-10 text-center">
                                <p className="text-muted-foreground mb-4">تعذّر تحميل الخطة المحددة</p>
                                <div className="flex items-center justify-center gap-3">
                                        <Button type="button" variant="outline" onClick={onRetryPlans}>
                                                إعادة المحاولة
                                        </Button>
                                        <Button type="button" variant="flame" onClick={() => onStepChange('plan')}>
                                                تصفح جميع الباقات
                                        </Button>
                                </div>
                        </div>
                );
        }

        return (
                <div className="animate-fade-in max-w-lg mx-auto">
                        {/* Selected plan summary */}
                        <div
                                className={cn(
                                        /* r95: ملخص الخطة — هندسة بطاقة SmartBot → Phase 6 (r154):
                                           طبق 16 + غسلة دافئة صلبة (التدرّج أُزيل — منع التدرّجات) */
                                        'rounded-lg p-5 mb-8 border border-accent-foreground/30 bg-orange-muted/40'
                                )}
                        >
                                <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                                {/* Phase 6 (r154): بئر الطبق — دائرة تراكوتا صلبة
                                                    بحافة 1.5px (تدرّج PLAN_GRADIENTS المتقاعد أعلاه). */}
                                                <div className="size-10 rounded-full bg-orange ring-[1.5px] ring-inset ring-[color:var(--accent-solid)]/30 flex items-center justify-center">
                                                        {(() => {
                                                                const Icon = PLAN_ICONS[currentPlan.name] || Sparkles;
                                                                return <Icon className="size-5 text-orange-foreground" />;
                                                        })()}
                                                </div>
                                                <div>
                                                        <p className="font-bold tabular-nums">{currentPlan.nameAr}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                                {Number(currentPlan.price) === 0 ? 'مجاني' : formatPrice(currentPlan.price, { suffix: ' د.ل/شهر' })}
                                                                {' • '}
                                                                {/* r143 (Phase-4 W1 D10): صدق الحدود — 9999 يُذكر بعدده
                                                                    (r92: TEXT follows ENFORCEMENT؛ الحارس يرفض الصنف
                                                                    9999 فلا وعد «غير محدود») */}
                                                                {`حتى ${toArabicNumber(currentPlan.maxItems)} صنف`}
                                                        </p>
                                                </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('plan')}>
                                                تغيير
                                        </Button>
                                </div>
                        </div>

                        <AnimatePresence mode="wait">
                                <m.div
                                        key={step}
                                        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
                                        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
                                >
                                        {/* ── STEP: MENU ── */}
                                        {step === 'menu' && (
                                                <div className="space-y-5">
                                                        {/* Menus header */}
                                                        <div className="flex items-center justify-between">
                                                                <div>
                                                                        <h3 className="font-heading font-bold text-base">بيانات المنيوهات</h3>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                                {/* r143 D10: 9999 يذكر حدّه («حتى 9999 منيوًا») بدل «غير محدودة» */}
                                                                                {maxMenus > 1
                                                                                        ? `خطتك تدعم حتى ${menusLimitPhrase(maxMenus)}`
                                                                                        : 'خطتك تتضمن منيو واحد'}
                                                                        </p>
                                                                </div>
                                                                {canAddMenu && (
                                                                        <Button type="button" variant="outline" size="sm" onClick={addRestaurant} className="shrink-0">
                                                                                + إضافة منيو
                                                                        </Button>
                                                                )}
                                                        </div>

                                                        {/* Restaurant blocks */}
                                                        {menus.map((restaurant, index) => (
                                                                <div key={restaurant._key ?? `menu-${index}`} className="rounded-lg border border-border/50 bg-card p-4 space-y-4 relative">
                                                                        <div className="flex items-center justify-between">
                                                                                {/* r95: عنوان كتلة المنيو — accent-foreground (AA) */}
                                                                                <h4 className="text-sm font-semibold text-accent-foreground">
                                                                                        المنيو {toArabicNumber(index + 1)} — {currentPlan.nameAr}
                                                                                </h4>
                                                                                {menus.length > 1 && (
                                                                                        <button
                                                                                                type="button"
                                                                                                onClick={() => removeRestaurant(index)}
                                                                                                className="text-xs text-destructive hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
                                                                                        >
                                                                                                حذف
                                                                                        </button>
                                                                                )}
                                                                        </div>

                                                                        {/* Restaurant name + slug */}
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                <div>
                                                                                        <Label htmlFor={`menu-name-${index}`}>اسم المطعم *</Label>
                                                                                        <Input
                                                                                                id={`menu-name-${index}`}
                                                                                                value={restaurant.name}
                                                                                                onChange={(e) => updateRestaurant(index, { name: e.target.value })}
                                                                                                placeholder="اسم المطعم (مثال: مقهى الواحة)"
                                                                                                className={cn(
                                                                                                        'h-11 mt-1.5',
                                                                                                        submitted && restaurant.name.trim().length < 2 && 'border-destructive ring-1 ring-destructive/30'
                                                                                                )}
                                                                                                aria-invalid={submitted && restaurant.name.trim().length < 2 || undefined}
                                                                                                required
                                                                                        />
                                                                                        {submitted && restaurant.name.trim().length < 2 && (
                                                                                                <p role="alert" className="text-xs text-destructive mt-1">اسم المطعم مطلوب (حرفان على الأقل)</p>
                                                                                        )}
                                                                                </div>
                                                                                <div>
                                                                                        <Label htmlFor={`menu-slug-${index}`}>الرابط المختصر *</Label>
                                                                                        <div className="flex items-center mt-1.5">
                                                                                                <span className="text-xs text-muted-foreground bg-muted/50 h-12 px-3 rounded-s-lg border-e-0 border-input flex items-center shrink-0">
                                                                                                        /menu/
                                                                                                </span>
                                                                                                <Input
                                                                                                        id={`menu-slug-${index}`}
                                                                                                        value={restaurant.slug}
                                                                                                        onChange={(e) =>
                                                                                                                updateRestaurant(index, {
                                                                                                                        slug: e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
                                                                                                                })
                                                                                                        }
                                                                                                        placeholder="الرابط المختصر (مثال: al-waha-cafe)"
                                                                                                        className={cn(
                                                                                                                'h-12 rounded-e-lg -me-[2px] text-start',
                                                                                                                submitted && restaurant.slug.trim().length < 3 && 'border-destructive ring-1 ring-destructive/30'
                                                                                                        )}
                                                                                                        dir="ltr"
                                                                                                        aria-invalid={submitted && restaurant.slug.trim().length < 3 || undefined}
                                                                                                        required
                                                                                                />
                                                                                        </div>
                                                                                        {submitted && restaurant.slug.trim().length < 3 && (
                                                                                                <p role="alert" className="text-xs text-destructive mt-1">الرابط مطلوب (ثلاثة أحرف على الأقل)</p>
                                                                                        )}
                                                                                        {dupErrors.slug && (
                                                                                                <p role="alert" className="text-xs text-destructive mt-1">{dupErrors.slug}</p>
                                                                                        )}
                                                                                </div>
                                                                        </div>

                                                                        {/* Description */}
                                                                        <div>
                                                                                {/* r119-S5-P1-1: these were LITERAL backtick strings ("`w-w-desc`") —
                                                                                  duplicate ids on every multi-menu row, so labels/inputs never
                                                                                  associated past row 0. Now indexed per restaurant row. */}
                                                                                <Label htmlFor={`w-w-desc-${index}`}>الوصف</Label>
                                                                                <Input id={`w-w-desc-${index}`} 
                                                                                        value={restaurant.description}
                                                                                        onChange={(e) => updateRestaurant(index, { description: e.target.value })}
                                                                                        placeholder="وصف المطعم (اختياري)"
                                                                                        className="h-11 mt-1.5"
                                                                                />
                                                                        </div>

                                                                        {/* Phone + WhatsApp */}
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                <div>
                                                                                        <Label htmlFor={`w-w-phone-${index}`}>رقم الهاتف</Label>
                                                                                        <Input id={`w-w-phone-${index}`} 
                                                                                                value={restaurant.phone}
                                                                                                onChange={(e) => updateRestaurant(index, { phone: e.target.value })}
                                                                                                placeholder="رقم الهاتف (مثال: 0912345678)"
                                                                                                className="h-11 mt-1.5 text-left"
                                                                                                dir="ltr"
                                                                                        />
                                                                                </div>
                                                                                <div>
                                                                                        <Label htmlFor={`sub-wa-wa-${index}`}>رقم واتساب</Label>
                                                                                        <Input id={`sub-wa-wa-${index}`} 
                                                                                                value={restaurant.whatsapp}
                                                                                                onChange={(e) => updateRestaurant(index, { whatsapp: e.target.value })}
                                                                                                placeholder="رقم الواتساب (مثال: 0912345678)"
                                                                                                className="h-11 mt-1.5 text-left"
                                                                                                dir="ltr"
                                                                                        />
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        ))}
                                                </div>
                                        )}

                                        {/* ── STEP: ACCOUNT ── */}
                                        {step === 'account' && (
                                                <div className="space-y-5">
                                                        <div>
                                                                <h3 className="font-heading font-bold text-base">بيانات تسجيل الدخول</h3>
                                                                <p className="text-xs text-muted-foreground mt-0.5">أنشئ حساباً للتحكم بمنيوهاتك من لوحة التحكم</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                        <Label htmlFor="account-username">اسم المستخدم *</Label>
                                                                        <Input
                                                                                id="account-username"
                                                                                autoComplete="username"
                                                                                value={form.username}
                                                                                onChange={(e) => {
                                                                                        onFormChange({ ...form, username: e.target.value });
                                                                                        setSubmitted(false);
                                                                                }}
                                                                                onBlur={() => touchField('username')}
                                                                                placeholder="اسم المستخدم (3 أحرف على الأقل)"
                                                                                className={cn(
                                                                                        'h-11 mt-1.5 text-left',
                                                                                        fieldError('username') && 'border-destructive ring-1 ring-destructive/30'
                                                                                )}
                                                                                dir="ltr"
                                                                                aria-invalid={fieldError('username') || undefined}
                                                                                required
                                                                        />
                                                                        {fieldError('username') && (
                                                                                <p role="alert" className="text-xs text-destructive mt-1">اسم المستخدم مطلوب (3 أحرف على الأقل)</p>
                                                                        )}
                                                                        {dupErrors.username && (
                                                                                <p role="alert" className="text-xs text-destructive mt-1">{dupErrors.username}</p>
                                                                        )}
                                                                </div>
                                                                <div>
                                                                        <Label htmlFor="account-password">كلمة المرور *</Label>
                                                                        <Input
                                                                                id="account-password"
                                                                                type="password"
                                                                                autoComplete="new-password"
                                                                                value={form.password}
                                                                                onChange={(e) => {
                                                                                        onFormChange({ ...form, password: e.target.value });
                                                                                        setSubmitted(false);
                                                                                }}
                                                                                onBlur={() => touchField('password')}
                                                                                placeholder={`كلمة المرور (${PASSWORD_MIN_LENGTH} أحرف على الأقل)`}
                                                                                className={cn(
                                                                                        'h-11 mt-1.5',
                                                                                        fieldError('password') && 'border-destructive ring-1 ring-destructive/30'
                                                                                )}
                                                                                aria-invalid={fieldError('password') || undefined}
                                                                                required
                                                                        />
                                                                        {fieldError('password') && (
                                                                                <p role="alert" className="text-xs text-destructive mt-1">
                                                                                        كلمة المرور مطلوبة ({PASSWORD_MIN_LENGTH} أحرف على الأقل)
                                                                                </p>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>
                                        )}

                                        {/* ── STEP: REVIEW ── */}
                                        {step === 'review' && (
                                                <div className="space-y-4">
                                                        <h3 className="font-heading font-bold text-base">راجع بياناتك ثم أكّد</h3>

                                                        {/* Restaurants summary */}
                                                        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                        <h4 className="text-sm font-semibold">المنيوهات</h4>
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('menu')} className="text-accent-foreground">
                                                                                تعديل
                                                                        </Button>
                                                                </div>
                                                                {menus.map((r, i) => (
                                                                        <div key={i} className="flex items-center justify-between text-sm border-b border-border/20 pb-2 last:border-0 last:pb-0">
                                                                                <div className="flex items-center gap-2">
                                                                                        {/* r95: رقم المنيو — نص أسطع على tint اللهب */}
                                                                                        <span className="size-7 rounded-full bg-orange/10 text-accent-foreground flex items-center justify-center text-xs font-bold shrink-0">
                                                                                                {toArabicNumber(i + 1)}
                                                                                        </span>
                                                                                        <div>
                                                                                                <p className="font-medium">{r.name || '—'}</p>
                                                                                                <p className="text-xs text-muted-foreground" dir="ltr">
                                                                                                        /menu/{r.slug || '—'}
                                                                                                </p>
                                                                                        </div>
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                        {r.phone || r.whatsapp || ''}
                                                                                </span>
                                                                        </div>
                                                                ))}
                                                        </div>

                                                        {/* Account summary */}
                                                        <div className="rounded-lg border border-border/50 bg-card p-4 flex items-center justify-between">
                                                                <div>
                                                                        <h4 className="text-sm font-semibold mb-1">بيانات الدخول</h4>
                                                                        <p className="text-sm text-muted-foreground" dir="ltr">
                                                                                {form.username}
                                                                        </p>
                                                                </div>
                                                                <Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('account')} className="text-accent-foreground">
                                                                        تعديل
                                                                </Button>
                                                        </div>

                                                        {/* Plan summary */}
                                                        {/* r95: ملخص الاشتراك — هندسة SmartBot بعائلة accent-foreground
                                                            Phase 6 (r154): القيم على قائد النقاط المطبوع (ملخص
                                                            الطلب في لوحة المالك نفسها) بدل صفوف فراغية. */}
                                                        <div className="rounded-lg bg-accent-foreground/[0.05] border border-accent-foreground/20 p-5">
                                                                <h4 className="font-heading font-bold mb-3">ملخص الاشتراك</h4>
                                                                <div className="space-y-2.5 text-sm">
                                                                        <div className="flex items-baseline gap-2 menu-leader">
                                                                                <span className="text-muted-foreground shrink-0">الخطة</span>
                                                                                <i className="menu-leader-rule" aria-hidden="true" />
                                                                                <span className="font-medium shrink-0">{currentPlan.nameAr}</span>
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 menu-leader">
                                                                                <span className="text-muted-foreground shrink-0">السعر</span>
                                                                                <i className="menu-leader-rule" aria-hidden="true" />
                                                                                <span className="font-medium tabular-nums shrink-0">
                                                                                        {Number(currentPlan.price) === 0 ? 'مجاني' : formatPrice(currentPlan.price, { suffix: ' د.ل/شهر' })}
                                                                                </span>
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 menu-leader">
                                                                                <span className="text-muted-foreground shrink-0">المنيوهات</span>
                                                                                <i className="menu-leader-rule" aria-hidden="true" />
                                                                                <span className="font-medium shrink-0">{`حتى ${toArabicNumber(currentPlan.maxMenus)}`}</span>
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 menu-leader">
                                                                                <span className="text-muted-foreground shrink-0">الحد الأقصى للأصناف</span>
                                                                                <i className="menu-leader-rule" aria-hidden="true" />
                                                                                <span className="font-medium shrink-0">{`حتى ${toArabicNumber(currentPlan.maxItems)}`}</span>
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 menu-leader">
                                                                                <span className="text-muted-foreground shrink-0">الطلبات</span>
                                                                                <i className="menu-leader-rule" aria-hidden="true" />
                                                                                <span className="font-medium shrink-0">{`حتى ${toArabicNumber(currentPlan.maxOrders)}`}</span>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                                </m.div>
                        </AnimatePresence>

                        {/* ── Navigation buttons ──
                            r131 (A2 P2-15): تجاوزات rounded-2xl أُزيلت — زر Button
                            يرث r-md (10px) القانونية (كان 8/10/20 داخل تدفق واحد). */}
                        <div className="flex items-center gap-3 mt-8">
                                {step !== 'menu' && (
                                        <Button
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                className="h-14 flex-1"
                                                onClick={() => {
                                                        if (step === 'account') onStepChange('menu');
                                                        else if (step === 'review') onStepChange('account');
                                                }}
                                        >
                                                <MotionArrowRight className="size-5 ms-0 me-2" />
                                                رجوع
                                        </Button>
                                )}
                                {step !== 'review' ? (
                                        <Button type="button" size="lg" className="h-14 flex-1" onClick={goNext} disabled={validating}>
                                                {validating ? (
                                                        <span className="flex items-center gap-2">
                                                                <Loader2 className="size-4 animate-spin" /> جارٍ التحقق…
                                                        </span>
                                                ) : (
                                                        <>
                                                                التالي
                                                                <MotionArrowLeft className="size-5 ms-2" />
                                                        </>
                                                )}
                                        </Button>
                                ) : (
                                        <Button size="lg" className="h-14 flex-1" type="submit" disabled={submitting}>
                                                {submitting ? (
                                                        <span className="flex items-center gap-2">
                                                                <Loader2 className="size-4 animate-spin" /> جارٍ إنشاء الحساب…
                                                        </span>
                                                ) : (
                                                        <>
                                                                <Store className="size-5" /> إنشاء الحساب والبدء
                                                        </>
                                                )}
                                        </Button>
                                )}
                        </div>
                        {step === 'review' && (
                                <p className="text-xs text-center text-muted-foreground/60 mt-4">
                                        بالضغط على إنشاء الحساب، أنت توافق على{' '}
                                        {/* r95: رابط الشروط — accent-foreground (AA) */}
                                        <Link href="/terms" className="text-accent-foreground underline">
                                                شروط الخدمة
                                        </Link>
                                </p>
                        )}
                </div>
        );
}
