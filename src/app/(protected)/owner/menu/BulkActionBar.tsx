'use client';
/*
 * owner/menu/BulkActionBar.tsx — P43 SM-1c (العمليات الجماعية).
 *
 * شريط لاصق (أسفل الشاشة) يظهر فقط عند وجود تحديد — العدّاد بجمع عربي
 * ديناميكي والأفعال: إخفاء/إظهار المحدد، أرشفة المحدد (غير تدميري —
 * الاسترجاع من لوحة «المؤرشفة»)، نقل المحدد إلى تصنيف (داخل المطعم نفسه).
 * التحديد مقيد بالقسم المفتوح (عقد W6-B6) — الشريط يرث القيد نفسه.
 */

import { Button } from '@/components/ui/button';
import { Archive, ArrowLeftRight, Eye, EyeOff } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import type { Category } from './types';

export function BulkActionBar({
        selectedCount,
        busy,
        /** تصنيفات الوجهة المتاحة للنقل (نفس المطعم، دون القسم المفتوح). */
        moveTargets,
        onSetStatus,
        onArchive,
        onMove,
        onClear,
}: {
        selectedCount: number;
        busy: boolean;
        moveTargets: Category[];
        onSetStatus: (status: 'available' | 'unavailable') => void;
        onArchive: () => void;
        onMove: (categoryId: number) => void;
        onClear: () => void;
}) {
        if (selectedCount === 0) return null;

        return (
                <div
                        role="toolbar"
                        aria-label="إجراءات جماعية على الأصناف المحددة"
                        className="sticky bottom-4 z-30 mx-auto w-fit max-w-full"
                >
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange/30 bg-card/95 backdrop-blur-md shadow-lg px-4 py-2.5">
                                <span className="text-xs font-semibold text-muted-foreground tabular-nums" aria-live="polite">
                                        تم تحديد {toArabicNumber(selectedCount)}{' '}
                                        {getArabicPlural(selectedCount, 'صنف', 'صنفان', 'أصناف')}
                                </span>
                                <span className="w-px h-5 bg-border/60" aria-hidden="true" />
                                <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSetStatus('unavailable')}
                                        disabled={busy}
                                        className="gap-1 text-destructive hover:border-destructive/40"
                                >
                                        <EyeOff className="size-3.5" aria-hidden="true" /> إخفاء المحدد
                                </Button>
                                <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSetStatus('available')}
                                        disabled={busy}
                                        className="gap-1 text-success-ink hover:border-orange/40"
                                >
                                        <Eye className="size-3.5" aria-hidden="true" /> إظهار المحدد
                                </Button>
                                <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onArchive}
                                        disabled={busy}
                                        className="gap-1 text-muted-foreground hover:text-accent-foreground"
                                >
                                        <Archive className="size-3.5" aria-hidden="true" /> أرشفة المحدد
                                </Button>
                                {moveTargets.length > 0 && (
                                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                                                <span className="sr-only sm:not-sr-only">نقل إلى</span>
                                                <select
                                                        value=""
                                                        onChange={(e) => {
                                                                const v = Number(e.target.value);
                                                                if (Number.isInteger(v) && v > 0) onMove(v);
                                                                e.currentTarget.value = '';
                                                        }}
                                                        disabled={busy}
                                                        aria-label="نقل الأصناف المحددة إلى تصنيف"
                                                        className="h-9 rounded-md border border-border/50 bg-background px-2 text-xs text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                        <option value="">اختر تصنيفًا…</option>
                                                        {moveTargets.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                        {c.nameAr || c.name}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                )}
                                <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
                                        إلغاء التحديد
                                </Button>
                        </div>
                </div>
        );
}
