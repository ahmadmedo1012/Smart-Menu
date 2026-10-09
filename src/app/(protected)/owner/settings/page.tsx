'use client';

import { useEffect, useState, useRef } from 'react';
import type { Plan } from '@/lib/plan-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { premiumToast } from '@/lib/premium-toast';
import { csrfFetch } from '@/lib/csrf-client';
import {Crown, Package, ImageIcon, Loader2} from 'lucide-react';
import AnimatedShoppingCart from '@/components/ui/shopping-cart-icon';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import AnimatedSave from '@/components/ui/save-icon';
import AnimatedUpload from '@/components/ui/upload-icon';
import AnimatedX from '@/components/ui/x-icon';
import { BackButton } from '@/components/shared/BackButton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageSkeleton } from '@/components/shared/DashboardSkeletons';
import { compressImage } from '@/lib/image-compress';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
// r121-H4: the server caps (shared restaurantFieldSchema) as the single source
// for the client maxLength shadow — the form previously had no caps at all, so
// a paste failed only at the server with a generic message after upload work.
import { RESTAURANT_FIELD_LIMITS } from '@/lib/validation';
// r133 (A3 S4): live whatsapp validity preview — an invalid stored number
// silently kills the public WhatsApp CTA (MenuHero drops the pill), so the
// owner's only symptom was the ordering channel quietly disappearing.
import { normalizeWaNumber } from '@/lib/whatsapp';
// r121-O-1: canonical pickup labels for the supported-types checklist
import { getPickupTypeMeta } from '@/lib/order-status';

interface RestaurantData {
        id: number;
        name: string;
        description: string;
        phone: string;
        whatsapp: string;
        email: string;
        address: string;
        workingHours: string;
        logo: string;
        gallery: string[];
        plan: Plan | null;
        planId: number | null;
        maxItems: number;
        maxOrders: number;
        pickupTypes: string;
        _count: { orders: number; categories: number };
}

export default function OwnerSettingsPage() {
        const { activeId } = useActiveRestaurant();
        const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
        const [, setPlans] = useState<Plan[]>([]);
        const [form, setForm] = useState({
                name: '',
                description: '',
                phone: '',
                whatsapp: '',
                email: '',
                address: '',
                workingHours: '',
        });
        const [logo, setLogo] = useState('');
        const [gallery, setGallery] = useState<string[]>([]);
        const [pickupTypes, setPickupTypes] = useState<string[]>([]);
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [submitted, setSubmitted] = useState(false);
        const [uploading, setUploading] = useState({ logo: false, gallery: false });
        const logoInputRef = useRef<HTMLInputElement>(null);
        const galleryInputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
                // Multi-menu: scope settings to the active restaurant
                const qs = activeId ? `?restaurantId=${activeId}` : '';
                Promise.all([
                        fetch(`/api/settings${qs}`).then((r) => r.json()),
                        fetch('/api/plans').then((r) => r.json()),
                ])
                        .then(([settingsData, plansData]) => {
                                const r = settingsData.data?.restaurant ?? settingsData.data ?? settingsData;
                                if (r) {
                                        setRestaurant(r);
                                        setForm({
                                                name: r.name ?? '',
                                                description: r.description ?? '',
                                                phone: r.phone ?? '',
                                                whatsapp: r.whatsapp ?? '',
                                                email: r.email ?? '',
                                                address: r.address ?? '',
                                                workingHours: r.workingHours ?? '',
                                        });
                                        setLogo(r.logo ?? '');
                                        setGallery(r.gallery ?? []);
                                        setPickupTypes(
                                                r.pickupTypes ? r.pickupTypes.split(',') : ['inside', 'takeaway', 'delivery']
                                        );
                                }
                                setPlans(plansData.data ?? []);
                        })
                        .catch(() => premiumToast('error', 'تعذّر تحميل الإعدادات'))
                        .finally(() => setLoading(false));
        }, [activeId]);

        const uploadImage = async (file: File, type: 'logo' | 'gallery') => {
                setUploading((prev) => ({ ...prev, [type]: true }));
                try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await csrfFetch('/api/upload', { method: 'POST', body: formData });
                        if (!res.ok) {
                                const body = await res.json().catch(() => null);
                                throw new Error(body?.error ?? `تعذّر رفع الصورة (${res.status})`);
                        }
                        const data = await res.json();
                        return data.data?.url ?? data.url;
                } catch (e) {
                        premiumToast('error', e instanceof Error ? e.message : 'تعذّر رفع الصورة');
                        return null;
                } finally {
                        setUploading((prev) => ({ ...prev, [type]: false }));
                }
        };

        const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const compressed = await compressImage(file, 400, 0.7);
                const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });
                const url = await uploadImage(compressedFile, 'logo');
                if (url) setLogo(url);
                if (logoInputRef.current) logoInputRef.current.value = '';
        };

        const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const files = e.target.files;
                if (!files?.length) return;
                const uploads: string[] = [];
                for (const file of Array.from(files)) {
                        const url = await uploadImage(file, 'gallery');
                        if (url) uploads.push(url);
                }
                if (uploads.length > 0) setGallery((prev) => [...prev, ...uploads]);
                if (galleryInputRef.current) galleryInputRef.current.value = '';
        };

        const removeGalleryImage = (index: number) =>
                setGallery((prev) => prev.filter((_, i) => i !== index));

        const moveGalleryImage = (from: number, to: number) => {
                if (to < 0 || to >= gallery.length) return;
                setGallery((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        return next;
                });
        };

        const save = async () => {
                setSubmitted(true);
                if (!form.name.trim()) {
                        premiumToast('error', 'يرجى إدخال اسم المطعم');
                        return;
                }
                if (pickupTypes.length === 0) {
                        premiumToast('error', 'يرجى اختيار نوع طلب واحد على الأقل');
                        return;
                }
                setSaving(true);
                try {
                        const items = [
                                ...Object.entries(form).map(([key, value]) => ({ key: 'restaurant_' + key, value })),
                                { key: 'restaurant_logo', value: logo },
                                { key: 'restaurant_gallery', value: JSON.stringify(gallery) },
                                { key: 'restaurant_pickupTypes', value: pickupTypes.join(',') },
                        ];
                        const res = await csrfFetch(`/api/settings${activeId ? `?restaurantId=${activeId}` : ''}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(items),
                        });
                        if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error ?? 'تعذّر الحفظ');
                        }
                        // Old-logo cleanup now happens server-side inside PUT /api/settings
                        // (after the DB write succeeds, tenant-bound) — no client-side delete call
                        premiumToast('save', 'تم حفظ الإعدادات');
                        const settingsRes = await fetch(`/api/settings${activeId ? `?restaurantId=${activeId}` : ''}`);
                        const settingsData = await settingsRes.json();
                        const r = settingsData.data?.restaurant;
                        if (r) setRestaurant(r);
                } catch (e) {
                        premiumToast('error', e instanceof Error ? e.message : 'تعذّر الحفظ');
                } finally {
                        setSaving(false);
                }
        };

        const currentPlan = restaurant?.plan;
        if (loading)
                // r131-F5 (A11 SM-2): settings-shaped skeleton stack (the .skeleton
                // shimmer + RM kill — was two bare blocks).
                return <SettingsPageSkeleton cards={3} label="جارٍ تحميل الإعدادات…" />;

        return (
                <div className="max-w-2xl space-y-8 animate-page-enter">
                        <BackButton href="/owner" />

                        {/* r131-F5 (A1 P0-8): visible canonical page header (was sr-only). */}
                        <PageHeader
                                title="إعدادات المطعم"
                                subtitle="الشعار والمعرض وأنواع الطلبات وبيانات المطعم"
                        />

                        {/* Plan card */}
                        <div className="rounded-xl bg-gradient-to-br from-orange-muted/70 to-white dark:from-orange-muted dark:to-card border border-orange/20 dark:border-orange/15 overflow-hidden">
                                <div className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                        <div
                                                                className={cn(
                                                                        'size-12 rounded-md bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0',
                                                                        currentPlan?.name === 'Pro'
                                                                                ? 'from-orange to-orange/80'
                                                                                : currentPlan?.name === 'Enterprise'
                                                                                        ? 'from-orange to-orange/80'
                                                                                        : 'from-orange to-orange/80'
                                                                )}
                                                        >
                                                                <Crown className="size-6 text-orange-foreground" />
                                                        </div>
                                                        <div>
                                                                <p className="text-2xs text-muted-foreground">الخطة الحالية</p>
                                                                <p className="text-lg font-bold">{currentPlan?.nameAr || 'مجاني'}</p>
                                                                {currentPlan?.price ? (
                                                                        <p className="text-xs text-muted-foreground">{currentPlan.price} د.ل/شهر</p>
                                                                ) : null}
                                                        </div>
                                                </div>
                                                <Link href="/subscribe" target="_self">
                                                        <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                                                                <AnimatedSparkles className="size-3" /> ترقية
                                                        </Button>
                                                </Link>
                                        </div>
                                </div>
                        </div>

                        {/* Logo section */}
                        <div className="rounded-xl bg-card/40 border border-border/20 p-5">
                                <h2 className="text-sm font-bold mb-4">الشعار</h2>
                                <div className="flex items-center gap-5">
                                        <div className="size-24 rounded-md overflow-hidden bg-muted/40 border border-border/20 flex items-center justify-center shrink-0 relative group">
                                                {logo ? (
                                                        <>
                                                                {/* round88-A2: box is size-24 (96px) */}
                                                                <OptimizedImage src={logo} alt="الشعار" className="size-full rounded-none" priority={false} sizes="96px" />
                                                                {/* a11y: visible by default (touch screens have no hover); hover-hidden
                                                                        only from sm up, and always revealed on focus */}
                                                                <button
                                                                        type="button"
                                                                        onClick={() => setLogo('')}
                                                                        aria-label="حذف الشعار"
                                                                        className="absolute top-1.5 end-1.5 size-11 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
                                                                >
                                                                        <AnimatedX className="size-3" aria-hidden="true" />
                                                                </button>
                                                        </>
                                                ) : (
                                                        <ImageIcon className="size-8 text-muted-foreground/40" />
                                                )}
                                        </div>
                                        <div className="flex-1">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                        يظهر في رأس صفحة المنيو. يفضل صورة مربعة 512×512
                                                </p>
                                                <input
                                                        ref={logoInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                />
                                                <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 text-xs h-8"
                                                        onClick={() => logoInputRef.current?.click()}
                                                        disabled={uploading.logo}
                                                >
                                                        {uploading.logo ? (
                                                                <Loader2 className="size-3 animate-spin" />
                                                        ) : (
                                                                <AnimatedUpload className="size-3" />
                                                        )}
                                                        {uploading.logo ? 'جارٍ الرفع…' : 'اختيار صورة'}
                                                </Button>
                                        </div>
                                </div>
                        </div>

                        {/* Gallery section */}
                        <div className="rounded-xl bg-card/40 border border-border/20 p-5">
                                <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold">معرض الصور</h2>
                                        <input
                                                ref={galleryInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleGalleryUpload}
                                                className="hidden"
                                        />
                                        <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-xs h-8"
                                                onClick={() => galleryInputRef.current?.click()}
                                                disabled={uploading.gallery}
                                        >
                                                {uploading.gallery ? (
                                                        <Loader2 className="size-3 animate-spin" />
                                                ) : (
                                                        <AnimatedUpload className="size-3" />
                                                )}
                                                إضافة صور
                                        </Button>
                                </div>
                                {gallery.length === 0 ? (
                                        /* r131-F5 (A1 P0-3): the legacy .empty-state-icon hand-roll
                                                joins the shared primitive. */
                                        <EmptyState
                                                icon={ImageIcon}
                                                title="لم يتم إضافة صور بعد"
                                                description="أضف صوراً للمطعم لتظهر في صفحة المنيو"
                                                className="py-10"
                                        />
                                ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                {gallery.map((url, i) => (
                                                        <div
                                                                key={url}
                                                                className="group relative aspect-square rounded-xl overflow-hidden bg-muted/20 border border-border/20"
                                                        >
                                                                {/* round88-A2: aspect-square tiles in a 2/3/4-col grid inside the
                                                                   max-w-2xl (672px) settings container → ~160px at md+ */}
                                                                <OptimizedImage src={url} alt={`صورة ${i + 1}`} className="size-full" sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 768px) calc(33vw - 8px), 160px" />
                                                                {/* a11y: overlay controls visible on touch / focus, hover-hidden only sm+ */}
                                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => removeGalleryImage(i)}
                                                                                aria-label={`حذف صورة ${i + 1}`}
                                                                                className="size-11 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                        >
                                                                                <AnimatedX className="size-3.5" aria-hidden="true" />
                                                                        </button>
                                                                </div>
                                                                {/* RTL-neutral centering: inset-x-0 + justify-center (no left/right) */}
                                                                <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                                        {i > 0 && (
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() => moveGalleryImage(i, i - 1)}
                                                                                        aria-label={`نقل صورة ${i + 1} إلى اليمين`}
                                                                                        className="size-11 rounded-full bg-background/70 text-foreground flex items-center justify-center hover:bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 transition-[background-color]"
                                                                                >
                                                                                        <span aria-hidden="true">→</span>
                                                                                </button>
                                                                        )}
                                                                        {i < gallery.length - 1 && (
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() => moveGalleryImage(i, i + 1)}
                                                                                        aria-label={`نقل صورة ${i + 1} إلى اليسار`}
                                                                                        className="size-11 rounded-full bg-background/70 text-foreground flex items-center justify-center hover:bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 transition-[background-color]"
                                                                                >
                                                                                        <span aria-hidden="true">←</span>
                                                                                </button>
                                                                        )}
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                )}
                        </div>

                        {/* Pickup types */}
                        <div className="rounded-xl bg-card/40 border border-border/20 p-5">
                                <h2 className="text-sm font-bold mb-4">أنواع الطلبات المدعومة</h2>
                                <div className="space-y-2.5">
                                        {/* r121-O-1: labels derive from the canonical pickup map */}
                                        {([
                                                { value: 'inside', desc: 'الطلبات داخل المطعم' },
                                                { value: 'takeaway', desc: 'الطلبات الجاهزة للاستلام' },
                                                { value: 'delivery', desc: 'طلبات التوصيل للمنزل' },
                                        ] as const).map((opt) => (
                                                <label
                                                        key={opt.value}
                                                        className="flex items-center gap-3 p-3 rounded-md border border-border/20 cursor-pointer hover:bg-orange-muted/30 transition-colors"
                                                >
                                                        <input
                                                                type="checkbox"
                                                                checked={pickupTypes.includes(opt.value)}
                                                                onChange={(e) =>
                                                                        setPickupTypes(
                                                                                e.target.checked
                                                                                        ? [...pickupTypes, opt.value]
                                                                                        : pickupTypes.filter((v) => v !== opt.value)
                                                                        )
                                                                }
                                                                className="size-4 accent-orange"
                                                        />
                                                        <div>
                                                                <p className="text-sm font-medium">{getPickupTypeMeta(opt.value).label}</p>
                                                                <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                                        </div>
                                                </label>
                                        ))}
                                </div>
                                {pickupTypes.length === 0 && (
                                        <p role="alert" className="text-xs text-destructive mt-2">يجب اختيار نوع طلب واحد على الأقل</p>
                                )}
                        </div>

                        {/* Settings form */}
                        <div className="rounded-xl bg-card/40 border border-border/20 p-5">
                                <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold">بيانات المطعم</h2>
                                        <Button onClick={save} disabled={saving} className="gap-1.5 text-xs h-8">
                                                <AnimatedSave className="size-3.5" />
                                                {saving ? 'جارٍ الحفظ…' : 'حفظ'}
                                        </Button>
                                </div>
                                <div className="space-y-3.5">
                                        <div>
                                                <Label htmlFor="restaurant-name" className="text-xs">اسم المطعم</Label>
                                                <Input
                                                        id="restaurant-name"
                                                        maxLength={RESTAURANT_FIELD_LIMITS.name}
                                                        value={form.name}
                                                        onChange={(e) => {
                                                                setForm({ ...form, name: e.target.value });
                                                                setSubmitted(false);
                                                        }}
                                                        className={cn(
                                                                'mt-1 text-sm',
                                                                submitted && !form.name.trim() && 'border-destructive ring-1 ring-destructive/30'
                                                        )}
                                                        aria-invalid={(submitted && !form.name.trim()) || undefined}
                                                />
                                                {submitted && !form.name.trim() && (
                                                        <p role="alert" className="text-xs text-destructive mt-1">هذا الحقل مطلوب</p>
                                                )}
                                        </div>
                                        <div>
                                                <Label htmlFor="restaurant-description" className="text-xs">الوصف</Label>
                                                <Textarea
                                                        id="restaurant-description"
                                                        maxLength={RESTAURANT_FIELD_LIMITS.description}
                                                        value={form.description}
                                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                        className="mt-1 text-sm"
                                                        rows={2}
                                                />
                                                <p className="text-2xs text-muted-foreground mt-1">
                                                        حتى {toArabicNumber(RESTAURANT_FIELD_LIMITS.description)} حرف — يظهر أعلى قائمة المنيو
                                                </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-phone" className="text-xs">الهاتف</Label>
                                                        <Input
                                                                id="restaurant-phone"
                                                                maxLength={RESTAURANT_FIELD_LIMITS.phone}
                                                                dir="ltr"
                                                                placeholder="09XXXXXXXX"
                                                                value={form.phone}
                                                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                                className="mt-1 text-sm text-start"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-whatsapp" className="text-xs">واتساب</Label>
                                                        <Input
                                                                id="restaurant-whatsapp"
                                                                maxLength={RESTAURANT_FIELD_LIMITS.whatsapp}
                                                                dir="ltr"
                                                                placeholder="09XXXXXXXX"
                                                                aria-invalid={(form.whatsapp.trim() !== '' && !normalizeWaNumber(form.whatsapp)) || undefined}
                                                                aria-describedby="restaurant-whatsapp-hint"
                                                                value={form.whatsapp}
                                                                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                                                className="mt-1 text-sm text-start"
                                                        />
                                                        {/* r133 (A3 S4): the public menu drops the WhatsApp pill entirely
                                                            when normalizeWaNumber fails — surface that contract here so the
                                                            owner sees the channel appear/disappear as they type. */}
                                                        <p
                                                                id="restaurant-whatsapp-hint"
                                                                className={cn(
                                                                        'text-2xs mt-1',
                                                                        form.whatsapp.trim() !== '' && !normalizeWaNumber(form.whatsapp)
                                                                                ? 'text-destructive'
                                                                                : 'text-muted-foreground'
                                                                )}
                                                        >
                                                                {form.whatsapp.trim() !== '' && !normalizeWaNumber(form.whatsapp)
                                                                        ? 'رقم غير صالح — لن يظهر زر الطلب عبر واتساب في صفحة المنيو'
                                                                        : 'يظهر كزر «اطلب عبر واتساب» في صفحة المنيو (مثال: 09XXXXXXXX أو +218XXXXXXXXXX)'}
                                                        </p>
                                                </div>
                                        </div>
                                        <div>
                                                <Label htmlFor="restaurant-email" className="text-xs">البريد</Label>
                                                <Input
                                                        id="restaurant-email"
                                                        maxLength={RESTAURANT_FIELD_LIMITS.email}
                                                        type="email"
                                                        dir="ltr"
                                                        value={form.email}
                                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                        className="mt-1 text-sm text-start"
                                                />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-address" className="text-xs">العنوان</Label>
                                                        <Input
                                                                id="restaurant-address"
                                                                maxLength={RESTAURANT_FIELD_LIMITS.address}
                                                                value={form.address}
                                                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                                                className="mt-1 text-sm"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-hours" className="text-xs">ساعات العمل</Label>
                                                        <Input
                                                                id="restaurant-hours"
                                                                maxLength={RESTAURANT_FIELD_LIMITS.workingHours}
                                                                value={form.workingHours}
                                                                onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                                                                placeholder="8:00 صباحاً - 12:00 منتصف الليل"
                                                                className="mt-1 text-sm"
                                                        />
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {/* Stats */}
                        {restaurant && (
                                <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                        <AnimatedShoppingCart className="size-3.5 text-primary" />
                                                        <span className="text-2xs text-muted-foreground">إجمالي الطلبات</span>
                                                </div>
                                                <p className="text-xl font-bold">{toArabicNumber(restaurant._count?.orders ?? 0)}</p>
                                        </div>
                                        <div className="rounded-xl bg-card/40 border border-border/20 p-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                        <Package className="size-3.5 text-orange" />
                                                        <span className="text-2xs text-muted-foreground">الأقسام</span>
                                                </div>
                                                <p className="text-xl font-bold">
                                                        {toArabicNumber(restaurant._count?.categories ?? 0)}
                                                </p>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
