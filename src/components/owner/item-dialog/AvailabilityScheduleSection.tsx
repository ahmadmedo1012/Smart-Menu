'use client';
/*
 * item-dialog/AvailabilityScheduleSection.tsx — P43 SM-1 (توافر مجدول).
 *
 * قسم حوار الصنف: «متاح دائماً» / «جدولة» — نافذة HH:MM بنظام 24 ساعة
 * (input[type=time] — أرقام غربية بسياسة المنصة r135) + رقائق أيام الأسبوع
 * بترتيب الأسبوع الليبي (LIBYAN_WEEK_ORDER من opening-hours — التخزين
 * باتفاقية getDay). كل السبعة محددة = «يومياً» (تُخزّن null).
 *
 * الفرض الخادمي (POST /api/orders يرفض خارج الجدولة بـ 422 «هذا الصنف غير
 * متاح حالياً») والعرض العام (الزبون يرى البطاقة رمادية بشارة «غير متوفر
 * الآن») يقرآن نفس الأعمدة التي يكتبها هذا القسم — مصدر حقيقة واحد
 * (lib/item-availability.ts).
 */

import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { DAY_NAMES_AR, LIBYAN_WEEK_ORDER } from '@/lib/opening-hours';
import type { ItemFormState } from './types';

export function AvailabilityScheduleSection({
        fId,
        form,
        patch,
}: {
        fId: string;
        form: ItemFormState;
        patch: (p: Partial<ItemFormState>) => void;
}) {
        const scheduled = form.scheduleMode === 'scheduled';
        const allDays = form.availableDays.length === 7;

        const toggleDay = (day: number) => {
                patch({
                        availableDays: form.availableDays.includes(day)
                                ? form.availableDays.filter((d) => d !== day)
                                : [...form.availableDays, day].sort((a, b) => a - b),
                });
        };

        return (
                <div className="rounded-md border border-border/40 p-3 space-y-3">
                        {/* ترويسة القسم — نفس بنية بقية أقسام الحوار */}
                        <div className="min-w-0">
                                <span id={`${fId}-schedule`} className="text-sm font-medium leading-none block">
                                        التوافر المجدول
                                </span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                        حدد نافذة وقت وأيامًا يظهر فيها الصنف — خارجها يُعرض للزبون «غير متوفر الآن» ولا يمكن طلبه
                                </p>
                        </div>

                        {/* المبدّل: متاح دائماً / جدولة — أزرار aria-pressed (نمط K-9 الصادق r127-F3) */}
                        <div className="flex gap-2" role="group" aria-labelledby={`${fId}-schedule`}>
                                <button
                                        type="button"
                                        aria-pressed={!scheduled}
                                        onClick={() => patch({ scheduleMode: 'always' })}
                                        className={cn(
                                                'flex-1 min-h-11 rounded-md border px-3 text-sm font-medium transition-colors',
                                                !scheduled
                                                        ? 'border-orange bg-orange-muted text-accent-foreground'
                                                        : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                                        )}
                                >
                                        متاح دائماً
                                </button>
                                <button
                                        type="button"
                                        aria-pressed={scheduled}
                                        onClick={() => patch({ scheduleMode: 'scheduled' })}
                                        className={cn(
                                                'flex-1 min-h-11 rounded-md border px-3 text-sm font-medium transition-colors gap-1 inline-flex items-center justify-center',
                                                scheduled
                                                        ? 'border-orange bg-orange-muted text-accent-foreground'
                                                        : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                                        )}
                                >
                                        <Clock className="size-3.5" aria-hidden="true" />
                                        جدولة
                                </button>
                        </div>

                        {scheduled && (
                                <div className="space-y-3 animate-fade-in">
                                        {/* نافذة الوقت: من / إلى — HH:MM بـ 24 ساعة */}
                                        <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                        <label htmlFor={`${fId}-avail-from`} className="text-xs font-medium text-muted-foreground">
                                                                يبدأ من
                                                        </label>
                                                        <Input
                                                                id={`${fId}-avail-from`}
                                                                type="time"
                                                                value={form.availableFrom}
                                                                onChange={(e) => patch({ availableFrom: e.target.value })}
                                                                aria-describedby={`${fId}-avail-hint`}
                                                        />
                                                </div>
                                                <div className="space-y-1.5">
                                                        <label htmlFor={`${fId}-avail-to`} className="text-xs font-medium text-muted-foreground">
                                                                حتى
                                                        </label>
                                                        <Input
                                                                id={`${fId}-avail-to`}
                                                                type="time"
                                                                value={form.availableTo}
                                                                onChange={(e) => patch({ availableTo: e.target.value })}
                                                                aria-describedby={`${fId}-avail-hint`}
                                                        />
                                                </div>
                                        </div>
                                        <p id={`${fId}-avail-hint`} className="text-2xs text-muted-foreground">
                                                {form.availableFrom && form.availableTo && form.availableFrom > form.availableTo
                                                        ? 'النافذة تعبر منتصف الليل — مثل 22:00 حتى 02:00 تُتاح بعد منتصف الليل حتى وقت الإغلاق'
                                                        : 'بنظام 24 ساعة — مثل 10:00 حتى 17:00'}
                                        </p>

                                        {/* أيام الأسبوع — ترتيب ليبي (السبت أولًا)، التخزين باتفاقية getDay */}
                                        <div className="space-y-1.5">
                                                <span className="text-xs font-medium text-muted-foreground">أيام الظهور</span>
                                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="أيام ظهور الصنف">
                                                        {LIBYAN_WEEK_ORDER.map((day) => {
                                                                const on = form.availableDays.includes(day);
                                                                return (
                                                                        <button
                                                                                key={day}
                                                                                type="button"
                                                                                aria-pressed={on}
                                                                                onClick={() => toggleDay(day)}
                                                                                className={cn(
                                                                                        'min-h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                                                                                        on
                                                                                                ? 'border-orange/50 bg-orange-muted text-accent-foreground'
                                                                                                : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                                                                                )}
                                                                        >
                                                                                {DAY_NAMES_AR[day]}
                                                                        </button>
                                                                );
                                                        })}
                                                </div>
                                                <p className="text-2xs text-muted-foreground">
                                                        {allDays
                                                                ? 'كل الأيام محددة — يومياً'
                                                                : `محدد ${toArabicNumber(form.availableDays.length)} ${form.availableDays.length === 1 ? 'يوم' : 'أيام'} — حدد يومًا واحدًا على الأقل`}
                                                </p>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
