'use client';

import { useState } from 'react';
import type { PlanSummary as Plan } from '@/lib/plan-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from '@/components/ui/select';
import { premiumToast } from '@/lib/premium-toast';
import { csrfFetch } from '@/lib/csrf-client';
// round89-E5: shared row type (was a local copy; plan/city/showOnLanding/
// featuredRank are optional there — reads below stay null-safe)
import type { Restaurant } from '@/lib/restaurant-types';
// r137: محرّر ساعات الدوام الأسبوعي + حقلا رسوم التوصيل/الحد الأدنى
// (التوأم الكامل لمحرّر إعدادات المالك — نفس المكوّن المشترك)
import {
        WeeklyHoursEditor,
        emptyWeeklyHours,
        weeklyHoursFromRows,
        weeklyHoursToPayload,
        type WeeklyHoursRow,
} from '@/components/owner/WeeklyHoursEditor';
import { parseOpeningHoursPayload } from '@/lib/opening-hours';
import { parseDeliveryAmount } from '@/lib/delivery-meta';

// round92-C1: testability export — سلوك لم يتغير (نفس التعبير الحرفي الذي كان
// مضمنًا في save(): `${slug}-${crypto.randomUUID().slice(0, 8)}`)
export function generateOwnerPassword(slug: string): string {
        return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

interface FormState {
        name: string;
        slug: string;
        description: string;
        phone: string;
        whatsapp: string;
        email: string;
        address: string;
        workingHours: string;
        planId: string;
        city: string;
        showOnLanding: boolean;
        featuredRank: string;
        /* r137: ساعات الدوام (محرّر أسبوعي) + حقلا التوصيل كسلاسل خام
           (الفراغ = إطفاء — نفس عقد محرّر المالك). */
        hours: Record<number, WeeklyHoursRow>;
        deliveryFee: string;
        minOrder: string;
}

export function RestaurantFormDialog({
        open,
        onOpenChange,
        editing,
        plans,
        onSaved,
}: {
        open: boolean;
        onOpenChange: (o: boolean) => void;
        editing: Restaurant | null;
        plans: Plan[];
        onSaved: () => void;
}) {
        const [form, setForm] = useState<FormState>({
                name: '',
                slug: '',
                description: '',
                phone: '',
                whatsapp: '',
                email: '',
                address: '',
                workingHours: '',
                planId: '',
                city: '',
                showOnLanding: false,
                featuredRank: '',
                hours: emptyWeeklyHours(),
                deliveryFee: '',
                minOrder: '',
        });
        const [saving, setSaving] = useState(false);
        const [submitted, setSubmitted] = useState(false);

        // Sync form when dialog opens with editing data
        // ponytail: direct mutation on open is fine for this dialog pattern
        const handleOpen = (o: boolean) => {
                if (o && editing) {
                        setForm({
                                name: editing.name,
                                slug: editing.slug,
                                description: editing.description,
                                phone: editing.phone ?? '',
                                whatsapp: editing.whatsapp ?? '',
                                email: editing.email || '',
                                address: editing.address || '',
                                workingHours: editing.workingHours || '',
                                planId: editing.planId ? String(editing.planId) : '',
                                city: editing.city || '',
                                showOnLanding: editing.showOnLanding ?? false,
                                featuredRank: editing.featuredRank != null ? String(editing.featuredRank) : '',
                                /* r137: الساعات المخزّنة + حقلا التوصيل (Decimal يصل
                                   سلسلة — يُعرض رقمًا نظيفًا). */
                                hours: weeklyHoursFromRows(editing.hours),
                                deliveryFee: editing.deliveryFee != null ? String(Number(editing.deliveryFee)) : '',
                                minOrder: editing.minOrder != null ? String(Number(editing.minOrder)) : '',
                        });
                } else if (o && !editing) {
                        setForm({
                                name: '',
                                slug: '',
                                description: '',
                                phone: '',
                                whatsapp: '',
                                email: '',
                                address: '',
                                workingHours: '',
                                planId: '',
                                city: '',
                                showOnLanding: false,
                                featuredRank: '',
                                hours: emptyWeeklyHours(),
                                deliveryFee: '',
                                minOrder: '',
                        });
                }
                setSubmitted(false);
                onOpenChange(o);
        };

        const save = async () => {
                if (!form.name.trim() || !form.slug.trim()) {
                        premiumToast('error', 'يرجى إدخال الاسم والرابط المختصر');
                        return;
                }
                setSubmitted(true);
                /* r137: تحقق العميل أولاً — نفس المحللات الخادمية المشتركة
                   (رسائل 422 ذاتها toast قبل أي إرسال). */
                const hoursPayload = weeklyHoursToPayload(form.hours);
                const hoursCheck = parseOpeningHoursPayload(hoursPayload);
                if (!hoursCheck.ok) {
                        premiumToast('error', hoursCheck.error);
                        return;
                }
                const feeCheck = parseDeliveryAmount(form.deliveryFee);
                if (!feeCheck.ok) {
                        premiumToast('error', `رسوم التوصيل: ${feeCheck.error}`);
                        return;
                }
                const minCheck = parseDeliveryAmount(form.minOrder);
                if (!minCheck.ok) {
                        premiumToast('error', `الحد الأدنى للطلب: ${minCheck.error}`);
                        return;
                }
                setSaving(true);
                try {
                        const body: Record<string, unknown> = {
                                name: form.name.trim(),
                                slug: form.slug
                                        .trim()
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-]/g, '-'),
                                description: form.description.trim(),
                                phone: form.phone.trim(),
                                whatsapp: form.whatsapp.trim(),
                                email: form.email.trim(),
                                address: form.address.trim(),
                                workingHours: form.workingHours.trim(),
                                city: form.city.trim(),
                                showOnLanding: form.showOnLanding,
                                featuredRank: form.featuredRank ? Number(form.featuredRank) : null,
                                /* r137: الساعات (مصفوفة — الفارغة = إطفاء) + حقلا
                                   التوصيل (null/رقم — الفراغ يصبح null إطفاء). */
                                hours: hoursPayload,
                                deliveryFee: feeCheck.value,
                                minOrder: minCheck.value,
                        };
                        if (form.planId) body.planId = Number(form.planId);
                        if (editing) {
                                const res = await csrfFetch(`/api/restaurants/${editing.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json.error ?? 'تعذّر تحديث المطعم');
                                premiumToast('save', 'تم تحديث المطعم');
                        } else {
                                const res = await csrfFetch('/api/restaurants', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                                ...body,
                                                username: form.slug,
                                                password: generateOwnerPassword(form.slug),
                                        }),
                                });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json.error ?? 'تعذّر إنشاء المطعم');
                                premiumToast('save', 'تمت إضافة المطعم');
                        }
                        onOpenChange(false);
                        onSaved();
                } catch {
                        premiumToast('error', 'تعذّر الحفظ');
                } finally {
                        setSaving(false);
                }
        };

        return (
                <Dialog open={open} onOpenChange={handleOpen}>
                        {/* r121-J-7: 85vh → 85dvh (توحيد مع max-h-[90dvh] للحوار
                            الأساسي — فخ شريط عنوان iOS على الحوارات الطويلة) */}
                        <DialogContent className="max-w-lg rounded-md max-h-[85dvh] overflow-y-auto">
                                <DialogHeader>
                                        <DialogTitle>{editing ? 'تعديل مطعم' : 'إضافة مطعم'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-name">اسم المطعم *</Label>
                                                        <Input
                                                                id="restaurant-name"
                                                                value={form.name}
                                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-slug">الرابط المختصر *</Label>
                                                        <Input
                                                                id="restaurant-slug"
                                                                value={form.slug}
                                                                onChange={(e) =>
                                                                        setForm({
                                                                                ...form,
                                                                                slug: e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase(),
                                                                        })
                                                                }
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                                dir="ltr"
                                                        />
                                                </div>
                                        </div>
                                        <div>
                                                <Label htmlFor="restaurant-desc">الوصف</Label>
                                                <Input
                                                        id="restaurant-desc"
                                                        value={form.description}
                                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                        className="h-11 rounded-xl mt-1.5"
                                                />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-phone">الهاتف</Label>
                                                        <Input
                                                                id="restaurant-phone"
                                                                value={form.phone}
                                                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                                dir="ltr"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-whatsapp">واتساب</Label>
                                                        <Input
                                                                id="restaurant-whatsapp"
                                                                value={form.whatsapp}
                                                                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                                dir="ltr"
                                                        />
                                                </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-email">البريد</Label>
                                                        <Input
                                                                id="restaurant-email"
                                                                value={form.email}
                                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                                dir="ltr"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-plan">الخطة</Label>
                                                        <Select
                                                                value={form.planId}
                                                                onValueChange={(v) => setForm({ ...form, planId: v ?? '' })}
                                                        >
                                                                <SelectTrigger className="h-11 rounded-xl mt-1.5">
                                                                        <SelectValue placeholder="اختر خطة" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                        <SelectItem value="">بدون خطة</SelectItem>
                                                                        {plans.map((p) => (
                                                                                <SelectItem key={p.id} value={String(p.id)}>
                                                                                        {p.nameAr} {Number(p.price) > 0 ? `- ${p.price} د.ل` : '- مجاني'}
                                                                                </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                        </Select>
                                                </div>
                                        </div>
                                        <div>
                                                <Label htmlFor="restaurant-address">العنوان</Label>
                                                <Input
                                                        id="restaurant-address"
                                                        value={form.address}
                                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                                        className="h-11 rounded-xl mt-1.5"
                                                />
                                        </div>
                                        <div>
                                                <Label htmlFor="restaurant-hours">ملاحظات دوام إضافية</Label>
                                                <Input
                                                        id="restaurant-hours"
                                                        value={form.workingHours}
                                                        onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                                                        className="h-11 rounded-xl mt-1.5"
                                                />
                                                {/* r137: النص الحر صار «ملاحظات دوام إضافية» بجانب
                                                    المحرّر المهيكل تحت — الساعات الصارمة تُدار من هناك. */}
                                        </div>
                                        {/* r137: حقلا رسوم التوصيل/الحد الأدنى — التوأم
                                            الكامل لمحرّر المالك. الفراغ = إطفاء؛ لا بوابة
                                            خطة (أمانة منيو جوهرية، كل الباقات). */}
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-delivery-fee">رسوم التوصيل (د.ل)</Label>
                                                        <Input
                                                                id="restaurant-delivery-fee"
                                                                type="number"
                                                                inputMode="decimal"
                                                                min={0}
                                                                step={0.5}
                                                                dir="ltr"
                                                                placeholder="5"
                                                                value={form.deliveryFee}
                                                                onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-min-order">الحد الأدنى للطلب (د.ل)</Label>
                                                        <Input
                                                                id="restaurant-min-order"
                                                                type="number"
                                                                inputMode="decimal"
                                                                min={0}
                                                                step={1}
                                                                dir="ltr"
                                                                placeholder="20"
                                                                value={form.minOrder}
                                                                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5 text-left"
                                                        />
                                                </div>
                                        </div>
                                        {/* r137: محرّر ساعات الدوام الأسبوعي (السبت أولًا —
                                            نفس مكوّن المالك). فارغ = الميزة مطفأة. */}
                                        <div>
                                                <Label>ساعات الدوام (اختياري)</Label>
                                                <div className="mt-2">
                                                        <WeeklyHoursEditor
                                                                value={form.hours}
                                                                onChange={(hours) => setForm({ ...form, hours })}
                                                                submitted={submitted}
                                                        />
                                                </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor="restaurant-city">المدينة</Label>
                                                        <Input
                                                                id="restaurant-city"
                                                                value={form.city}
                                                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="restaurant-rank">ترتيب الظهور</Label>
                                                        <Input
                                                                id="restaurant-rank"
                                                                type="number"
                                                                value={form.featuredRank}
                                                                onChange={(e) => setForm({ ...form, featuredRank: e.target.value })}
                                                                className="h-11 rounded-xl mt-1.5"
                                                                placeholder="1-999"
                                                        />
                                                </div>
                                        </div>
                                        <div>
                                                <label className="flex items-center gap-3 p-3 rounded-lg border border-border/20 cursor-pointer hover:bg-accent/30 transition-colors">
                                                        <input
                                                                type="checkbox"
                                                                checked={form.showOnLanding}
                                                                onChange={(e) => setForm({ ...form, showOnLanding: e.target.checked })}
                                                                className="size-4 accent-orange"
                                                        />
                                                        <div>
                                                                <p className="text-sm font-medium">عرض في الصفحة الرئيسية</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                        ظهور المطعم في قائمة المطاعم المميزة بالصفحة الرئيسية
                                                                </p>
                                                        </div>
                                                </label>
                                        </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                                                إلغاء
                                        </Button>
                                        <Button variant="orange" onClick={save} disabled={saving}>
                                                {saving ? 'جارٍ…' : editing ? 'تحديث' : 'إضافة'}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
