'use client';

/**
 * 17-DEBT-SM (r147): حقل الملاحظات الحر داخل نافذة الطلب + عدّاد الأحرف.
 * فُصل عن OrderDialog.tsx كما هو حرفيًا؛ قيمة الحقل مملوكة للأب وتُمرَّر كما هي.
 */
import type { Dispatch, SetStateAction } from 'react';
import { toArabicNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { glassPillInput, NOTES_MAX } from './constants';

export function OrderNotes({
        notes,
        setNotes,
}: {
        notes: string;
        setNotes: Dispatch<SetStateAction<string>>;
}) {
        /* Notes textarea — glass-pill
            r135-B: عدّاد الأحرف (٥٠٠ سقف) يظهر فقط بعد
            بدء الكتابة — يطمئن العميل أن ملاحظته تُحفظ. */
        return (
                <div>
                        <textarea
                                id="order-notes"
                                name="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="ملاحظات إضافية للطلب…"
                                rows={2}
                                maxLength={NOTES_MAX}
                                aria-label="ملاحظات إضافية"
                                className={cn(glassPillInput, 'h-auto py-3 resize-none')}
                        />
                        {notes.length > 0 && (
                                <p className="mt-1 text-end text-2xs tabular-nums text-muted-foreground">
                                        {toArabicNumber(notes.length)}/{toArabicNumber(NOTES_MAX)}
                                </p>
                        )}
                </div>
        );
}
