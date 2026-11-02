'use client';

/* P42-W3 (الأرشفة الحقيقية) — لوحة «الأصناف المؤرشفة» في صفحة منيو المالك.
 *
 * لماذا هذه اللوحة: الأرشفة غياب كامل عن العرض العام (ليست sold-out — ذلك
 * يُبقي بطاقة رمادية بقرار r135 المتعمد). بدون لوحة استرجاع، الصنف المؤرشف
 * يبدو «مفقودًا» ولا سبيل لاسترجاعه أو حتى رؤيته. اللوحة تجلب
 * ‎/api/items?archived=true‎ (حق مالك/طاقم فقط — المعامل محروس في المسار)،
 * تعرض كل صنف مؤرشف بتاريخ أرشفته، وتتيح الاسترجاع الفوري (PUT archivedAt:
 * null) — الاسترجاع يعيد الصنف إلى القائمة العامة خلال ≤60 ثانية (ISR) أو
 * فورًا (revalidateMenu في PUT).
 *
 * عقود مشتركة مع بقية الصفحة: premiumToast للنتيجة، getErrorMessage لرسائل
 * الخادم العربية كما هي (403 الاشتراك المنتهي يظهر صريحًا — نمط r121-P-5)،
 * وEmptyState للفراغ (نفس قواعد r131). */

import { useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, Archive, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { csrfJson } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import { type Item } from './types';

interface ArchivedItemsProps {
        restaurantId: number;
        /** يُرفع بعد كل أرشفة/استرجاع كي يُحدّث شريط الاستخدام (PlanUsageBadge). */
        onUsageChanged: () => void;
        /** يُستدعى بعد استرجاع صنف كي تعيد القائمة الحية تحميلها فورًا. */
        onItemRestored: () => void;
}

/** تنسيق تاريخ الأرشفة بالعربية — نفس أسلوب عرض التواريخ في لوحة المالك. */
function formatArchivedDate(iso: string): string {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ArchivedItems({ restaurantId, onUsageChanged, onItemRestored }: ArchivedItemsProps) {
        const [open, setOpen] = useState(false);
        const [items, setItems] = useState<Item[] | null>(null);
        const [loading, setLoading] = useState(false);
        const [restoringId, setRestoringId] = useState<number | null>(null);
        const [hasFetched, setHasFetched] = useState(false);

        const fetchArchived = useCallback(async () => {
                setLoading(true);
                try {
                        const r = await fetch(`/api/items?restaurantId=${restaurantId}&archived=true`);
                        if (!r.ok) throw Error(`${r.status}`);
                        const j = await r.json();
                        const rows: Item[] = Array.isArray(j.data ?? j) ? (j.data ?? j) : [];
                        setItems(rows);
                } catch {
                        premiumToast('error', 'تعذّر تحميل الأصناف المؤرشفة');
                        setItems([]);
                } finally {
                        setLoading(false);
                }
        }, [restaurantId]);

        /* الفتح الأول فقط يجلب — ثم تبقى القائمة في الذاكرة حتى إعادة الفتح
         * (المعاملة نادرة والعدد صغير بطبيعته؛ لا سبب لجلبها عند كل رسم).
         * hasFetched منفصل عن items كي تبقى المصفوفة فارغة بعد أول جلب
         * ناجح حالتها المقصودة (لا إعادة جلب بلا سبب). */
        useEffect(() => {
                if (open && !hasFetched) {
                        setHasFetched(true);
                        fetchArchived();
                }
        }, [open, hasFetched, fetchArchived]);

        /* تبديل المطعم يبدأ حالة نظيفة — الأرشيف المعروض يجب أن يتبع
         * المطعم النشط (نفس قاعدة التحديد الجماعي في الصفحة الأم). */
        useEffect(() => {
                setHasFetched(false);
                setItems(null);
        }, [restaurantId]);

        const restore = async (item: Item) => {
                if (restoringId === item.id) return;
                setRestoringId(item.id);
                try {
                        await csrfJson(`/api/items/${item.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ archivedAt: null }),
                        });
                        premiumToast('save', `تم استرجاع «${item.nameAr || item.name}» إلى القائمة`);
                        setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev));
                        onUsageChanged();
                        onItemRestored();
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر الاسترجاع'));
                } finally {
                        setRestoringId(null);
                }
        };

        const count = items?.length ?? 0;

        return (
                <section
                        aria-label="الأصناف المؤرشفة"
                        className="rounded-xl border border-border/60 bg-card/40 overflow-hidden"
                >
                        <button
                                type="button"
                                onClick={() => setOpen((o) => !o)}
                                aria-expanded={open}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start hover:bg-muted/40 transition-colors"
                        >
                                <span className="flex items-center gap-2 text-sm font-bold">
                                        <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                                        الأصناف المؤرشفة
                                        {items !== null && count > 0 && (
                                                <span className="text-xs font-normal text-muted-foreground">
                                                        ({toArabicNumber(count)})
                                                </span>
                                        )}
                                </span>
                                <ChevronDown
                                        className={cn(
                                                'size-4 text-muted-foreground shrink-0 transition-transform duration-fast',
                                                open && 'rotate-180',
                                        )}
                                        aria-hidden="true"
                                />
                        </button>

                        {open && (
                                <div className="border-t border-border/40 p-4">
                                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                                الصنف المؤرشف مختفٍ من القائمة العامة وتطبيق الجوال ولا يمكن
                                                طلبه — بينما يبقى سجل طلباته وتقييماته سليمًا. الاسترجاع
                                                يعيده إلى القائمة فورًا.
                                        </p>
                                        {loading ? (
                                                <div className="space-y-2" aria-busy="true" aria-label="جارٍ التحميل">
                                                        {[0, 1].map((i) => (
                                                                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-breath" />
                                                        ))}
                                                </div>
                                        ) : items === null ? null : items.length === 0 ? (
                                                <EmptyState
                                                        size="compact"
                                                        icon={Archive}
                                                        title="لا توجد أصناف مؤرشفة"
                                                />
                                        ) : (
                                                <ul className="space-y-2">
                                                        {items.map((item) => (
                                                                <li
                                                                        key={item.id}
                                                                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2"
                                                                >
                                                                        {item.image ? (
                                                                                <OptimizedImage
                                                                                        src={item.image}
                                                                                        alt={item.nameAr || item.name}
                                                                                        className="size-10 rounded-md border border-border/30 shrink-0"
                                                                                        sizes="40px"
                                                                                        skeleton={false}
                                                                                />
                                                                        ) : (
                                                                                <span
                                                                                        className="size-10 rounded-md border border-border/30 shrink-0 inline-flex items-center justify-center bg-gradient-to-br from-orange-muted/40 to-transparent"
                                                                                        aria-hidden="true"
                                                                                >
                                                                                        <Archive className="size-4 text-orange/40" />
                                                                                </span>
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                                <p className="text-sm font-bold truncate">
                                                                                        {item.nameAr || item.name}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground/70 truncate">
                                                                                        {item.archivedAt
                                                                                                ? `أُرشف في ${formatArchivedDate(item.archivedAt)}`
                                                                                                : 'مؤرشف'}
                                                                                </p>
                                                                        </div>
                                                                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:inline">
                                                                                {formatPrice(item.discountedPrice ?? item.price, { suffix: 'د.ل' })}
                                                                        </span>
                                                                        <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="gap-1.5 shrink-0 border-orange/30 text-accent-foreground hover:bg-orange-muted"
                                                                                disabled={restoringId === item.id}
                                                                                onClick={() => restore(item)}
                                                                        >
                                                                                <ArchiveRestore className="size-3.5" aria-hidden="true" />
                                                                                استرجاع
                                                                        </Button>
                                                                </li>
                                                        ))}
                                                </ul>
                                        )}
                                </div>
                        )}
                </section>
        );
}
