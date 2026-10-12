'use client';

/**
 * 17-DEBT-SM (r147): شرائح الملاحظات السريعة داخل نافذة الطلب — toggles
 * متعددة الاختيار (aria-pressed) فوق حقل الملاحظات. فُصلت عن OrderDialog.tsx
 * كما هي حرفيًا؛ المسند isQuickNoteApplied انتقل معها (حكرٌ على هذه الكتلة)،
 * والتأليف النقي toggleQuickNoteValue يبقى في الأب (مُصدَّر ليثبته الاختبار).
 */
import { cn } from '@/lib/utils';
import { QUICK_NOTES } from './constants';

/** (r138 — J9): هل الملاحظة مفعّلة كجزء كامل؟ — نفس مسند الإزالة في
 *  toggleQuickNoteValue أعلى OrderDialog.tsx (وإلا أضاءت الشريحة لنص حر
 *  يحوي الملاحظة جزءًا بينما الضغطة تُلحقها). */
function isQuickNoteApplied(prev: string, note: string): boolean {
        return prev.split('،').some((p) => p.trim() === note);
}

export function QuickNotes({
        notes,
        toggleQuickNote,
}: {
        notes: string;
        toggleQuickNote: (note: string) => void;
}) {
        return (
                <div>
                        <label className="text-sm font-medium mb-2 block">إضافات</label>
                        <div className="flex flex-wrap gap-1.5">
                                {QUICK_NOTES.map((note) => {
                                        /* (r138 — J9): حالة «مفعّلة» = جزء مطابق تمامًا
                                           (نفس مسند الإزالة) — كانت includes جزئية فتضيء
                                           الشريحة لنص حر يحوي الملاحظة جزءًا بينما الضغطة
                                           تُلحقها من جديد؛ الآن الضوء والفعل متطابقان. */
                                        const applied = isQuickNoteApplied(notes, note);
                                        return (
                                                <button
                                                        key={note}
                                                        type="button"
                                                        aria-pressed={applied}
                                                        onClick={() => toggleQuickNote(note)}
                                                        className={cn(
                                                                'px-3.5 min-h-11 inline-flex items-center rounded-full text-xs font-medium transition-colors border',
                                                                applied
                                                                        /* r95: الشريحة المحددة — نص accent-foreground الأسطع (AA) */
                                                                        ? 'bg-orange/10 border-orange/30 text-accent-foreground'
                                                                        : 'bg-glass-bg/30 border-glass-border text-muted-foreground hover:border-orange/30 hover:text-foreground'
                                                        )}
                                                >
                                                        {note}
                                                </button>
                                        );
                                })}
                        </div>
                </div>
        );
}
