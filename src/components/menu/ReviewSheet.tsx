'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import AnimatedSend from '@/components/ui/send-icon';
import AnimatedX from '@/components/ui/x-icon';
import { MessageCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatDateShort } from '@/lib/format';
import { premiumToast } from '@/lib/premium-toast';
import { csrfFetch } from '@/lib/csrf-client';
import AnimatedStar from '@/components/ui/star-icon';
import { EmptyState } from '@/components/ui/empty-state';

const starAnimate = { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] };

type Review = {
        id: number;
        rating: number;
        comment: string;
        customerName: string;
        createdAt: string;
};

type ReviewSheetProps = {
        menuItemId: number;
        menuItemName: string;
        open: boolean;
        onOpenChange: (open: boolean) => void;
};

export function ReviewSheet({ menuItemId, menuItemName, open, onOpenChange }: ReviewSheetProps) {
        const [reviews, setReviews] = useState<Review[]>([]);
        const [loading, setLoading] = useState(false);
        const [stats, setStats] = useState<{ avgRating: number | null; totalCount: number }>({
                avgRating: null,
                totalCount: 0,
        });
        const [filterStar, setFilterStar] = useState<number | null>(null);
        const [fetchError, setFetchError] = useState(false);
        const [retryKey, setRetryKey] = useState(0);

        // Submit form state
        const [formRating, setFormRating] = useState(0);
        const [formComment, setFormComment] = useState('');
        const [formName, setFormName] = useState('');
        const [submitting, setSubmitting] = useState(false);
        const [submitError, setSubmitError] = useState('');

        useEffect(() => {
                if (!open || !menuItemId) return;
                const abort = new AbortController();
                setFetchError(false);
                setLoading(true);
                const params = filterStar ? `?minRating=${filterStar}` : '';
                fetch(`/api/items/${menuItemId}/reviews${params}`, { signal: abort.signal })
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.success) {
                                        setReviews(json.data);
                                        // Defensive: API may return stats in different shapes; never crash the sheet
                                        if (!filterStar) {
                                                setStats(
                                                        json.stats ?? {
                                                                avgRating: null,
                                                                totalCount: json.meta?.total ?? json.data?.length ?? 0,
                                                        }
                                                );
                                        }
                                }
                        })
                        .catch(() => {
                                setFetchError(true);
                                premiumToast('error', 'فشل تحميل التقييمات', 'تأكد من اتصالك بالإنترنت وحاول مرة أخرى');
                        })
                        .finally(() => setLoading(false));

                return () => abort.abort();
        }, [open, menuItemId, filterStar, retryKey]);

        const sheetRef = useRef<HTMLDivElement>(null);
        // round94 (A9): آخر نسخة من onOpenChange للمستمع الثابت على مستوى المستند
        // (Escape يعمل دائماً حتى لو هرب التركيز من الورقة) بلا إعادة اشتراك عند كل تصيير.
        const closeRef = useRef(onOpenChange);
        useEffect(() => {
                closeRef.current = onOpenChange;
        });

        const trapFocus = useCallback((e: KeyboardEvent) => {
                const sheet = sheetRef.current;
                if (!sheet) return;
                // Escape يغلق من أي مكان في المستند — كان يعمل فقط إذا كان التركيز داخل
                // الورقة (onKeyDown على العنصر) فكان يفشل بعد نقر منطقة غير قابلة للتركيز.
                if (e.key === 'Escape') {
                        closeRef.current(false);
                        return;
                }
                if (e.key !== 'Tab') return;
                const focusable = sheet.querySelectorAll<HTMLElement>(
                        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) {
                        e.preventDefault();
                        return;
                }
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const active = document.activeElement;
                // سد ثقب المصيدة: نقر حاشية غير قابلة للتركيز يرمي التركيز إلى body —
                // أعده إلى داخل الورقة (Tab → أول، Shift+Tab → آخر).
                if (!sheet.contains(active)) {
                        e.preventDefault();
                        (e.shiftKey ? last : first).focus();
                        return;
                }
                if (e.shiftKey) {
                        if (active === first) {
                                e.preventDefault();
                                last.focus();
                        }
                } else {
                        if (active === last) {
                                e.preventDefault();
                                first.focus();
                        }
                }
        }, []);

        useEffect(() => {
                if (!open || !sheetRef.current) return;
                // Remember the trigger so focus returns on close (WCAG 2.4.3).
                const opener = document.activeElement as HTMLElement | null;
                const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
                        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                firstFocusable?.focus();
                const raf = requestAnimationFrame(() => document.addEventListener('keydown', trapFocus));
                return () => {
                        cancelAnimationFrame(raf);
                        document.removeEventListener('keydown', trapFocus);
                        // round94 (A9): الحارس القديم `!open &&` كان يقرأ قيمة ملتقطة أثناء
                        // التشغيل (true دائماً) فلم يُرجَع التركيز للمُشغّل أبداً. التنظيف يعمل
                        // عند الإغلاق/الإزالة فقط — الإرجاع غير مشروط (نمط Header.MobileMenu).
                        opener?.focus();
                };
        }, [open, trapFocus]);

        async function handleSubmit() {
                if (formRating < 1) return;
                setSubmitting(true);
                setSubmitError('');
                try {
                        const res = await csrfFetch(`/api/items/${menuItemId}/reviews`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ rating: formRating, comment: formComment, customerName: formName }),
                        });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل إرسال التقييم');

                        // Optimistic: prepend review & update stats
                        setReviews((prev) => [json.data, ...prev]);
                        setStats((prev) => ({
                                avgRating: prev.avgRating
                                        ? (prev.avgRating * prev.totalCount + formRating) / (prev.totalCount + 1)
                                        : formRating,
                                totalCount: prev.totalCount + 1,
                        }));
                        setFormRating(0);
                        setFormComment('');
                        setFormName('');
                        premiumToast('star', 'شكراً لتقييمك!', 'تم إضافة تقييمك بنجاح');
                } catch (e) {
                        setSubmitError(e instanceof Error ? e.message : 'فشل إرسال التقييم');
                } finally {
                        setSubmitting(false);
                }
        }

        return (
                <AnimatePresence>
                        {open && (
                                <>
                                        {/* Backdrop */}
                                        <m.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                                                onClick={() => onOpenChange(false)}
                                        />

                                        {/* Sheet */}
                                        <m.div
                                                ref={sheetRef}
                                                initial={{ y: '100%' }}
                                                animate={{ y: 0 }}
                                                exit={{ y: '100%' }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                /* r121-J-7: 85vh → 85dvh — الأوراق السفلية بوحدات vh
                                                   (المنفذ الكبير على iOS) تدفع مقبضها/رأسها تحت
                                                   شريط عنوان سفاري؛ النظام كله على dvh
                                                   (OrderDialog 90dvh، ui/dialog 90dvh). */
                                                className="fixed bottom-0 inset-x-0 z-50 max-h-[85dvh] rounded-t-2xl bg-card border border-border/30 shadow-2xl flex flex-col overflow-y-auto overflow-x-hidden"
                                                dir="rtl"
                                                role="dialog"
                                                aria-modal="true"
                                                aria-label={menuItemName}
                                                onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
                                        >
                                                {/* Handle */}
                                                <div className="flex justify-center pt-2 pb-1">
                                                        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                                                </div>

                                                {/* Header */}
                                                <div className="flex items-center justify-between px-5 pb-3 border-b border-border/20">
                                                        <div>
                                                                <h3 className="text-base font-bold">تقييمات {menuItemName}</h3>
                                                                {stats.totalCount > 0 && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                                <span className="text-ember dark:text-saffron font-bold">
                                                                                        {toArabicNumber(stats.avgRating?.toFixed(1) ?? '0')}
                                                                                </span>{' '}
                                                                                {/* r97-X1: نجمة lucide SVG بدل الإيموجي (قاعدة «لا إيموجي كأيقونات»)
                                                                                   — نفس عائلة ألوان النجوم في MenuItemCard (fill-ember/saffron). */}
                                                                                <Star
                                                                                        className="size-3 fill-ember dark:fill-saffron inline"
                                                                                        aria-hidden="true"
                                                                                />{' '}
                                                                                · {toArabicNumber(stats.totalCount)} تقييم
                                                                        </p>
                                                                )}
                                                        </div>
                                                        <button
                                                                onClick={() => onOpenChange(false)}
                                                                className="size-11 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                                                aria-label="إغلاق"
                                                        >
                                                                <AnimatedX className="size-4" />
                                                        </button>
                                                </div>

                                                {/* Star filter */}
                                                <div className="flex gap-1.5 px-5 py-3 border-b border-border/10 overflow-x-auto">
                                                        {[null, 5, 4, 3, 2, 1].map((star) => (
                                                                <button
                                                                        key={star ?? 'all'}
                                                                        onClick={() => setFilterStar(star)}
                                                                        className={cn(
                                                                                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                filterStar === star
                                                                                        ? 'bg-orange text-orange-foreground border-orange shadow-sm'
                                                                                        : 'bg-muted/30 text-muted-foreground border-border/20 hover:bg-muted/50'
                                                                        )}
                                                                >
                                                                        {/* r97-X1: رقم عربي + نجمة lucide بدل `${star} ⭐` */}
                                                                        {star ? (
                                                                                <>
                                                                                        {toArabicNumber(star)}{' '}
                                                                                        <Star className="size-3 fill-current inline" aria-hidden="true" />
                                                                                </>
                                                                        ) : (
                                                                                'الكل'
                                                                        )}
                                                                </button>
                                                        ))}
                                                </div>

                                                {/* Submit form */}
                                                <div className="border-b border-border/10 px-5 py-4 space-y-3">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase">أضف تقييمك</h4>
                                                        {/* Star picker */}
                                                        <div className="flex gap-1">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                        <m.button
                                                                                key={s}
                                                                                whileTap={{ scale: 1.3 }}
                                                                                animate={formRating >= s ? starAnimate : {}}
                                                                                transition={{ duration: 0.3 }}
                                                                                onClick={() => {
                                                                                        setFormRating(s);
                                                                                        setSubmitError('');
                                                                                }}
                                                                                aria-label={'تقييم ' + s + ' نجوم'}
                                                                                className={cn(
                                                                                        'transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        /* round94 (D/A2): نمط r84 — ember فاتح 6.31:1 بدل saffron
                                                                                           غير المحروس (كان 2.05:1 في الفاتح؛ hover /50 كان 1.42:1) */
                                                                                        s <= formRating
                                                                                                ? 'text-ember dark:text-saffron'
                                                                                                : 'text-muted-foreground/20 hover:text-ember dark:hover:text-saffron/50'
                                                                                )}
                                                                        >
                                                                                <AnimatedStar className={cn('size-6', s <= formRating && 'fill-ember dark:fill-saffron')} />
                                                                        </m.button>
                                                                ))}
                                                        </div>
                                                        {/* Comment */}
                                                        <textarea
                                                                id="review-comment"
                                                                name="comment"
                                                                placeholder="اكتب تعليقك (اختياري)"
                                                                value={formComment}
                                                                onChange={(e) => setFormComment(e.target.value)}
                                                                rows={2}
                                                                maxLength={500}
                                                                className="w-full rounded-lg border border-border/20 bg-muted/20 p-2.5 text-xs placeholder:text-muted-foreground/40 resize-none outline-none focus-visible:border-orange/50 transition-colors"
                                                        />
                                                        {/* Name */}
                                                        <input
                                                                id="review-name"
                                                                name="name"
                                                                placeholder="الاسم (اختياري)"
                                                                value={formName}
                                                                onChange={(e) => setFormName(e.target.value)}
                                                                maxLength={50}
                                                                className="w-full rounded-lg border border-border/20 bg-muted/20 p-2.5 text-xs placeholder:text-muted-foreground/40 outline-none focus-visible:border-orange/50 transition-colors"
                                                        />
                                                        {/* Error */}
                                                        {submitError && (
                                                                <p className="text-xs text-destructive" role="alert">
                                                                        {submitError}
                                                                </p>
                                                        )}
                                                        {/* Submit */}
                                                        <button
                                                                onClick={handleSubmit}
                                                                aria-label="إرسال التقييم"
                                                                disabled={formRating < 1 || submitting}
                                                                className={cn(
                                                                        'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                        formRating < 1
                                                                                ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                                                                                : 'bg-orange text-orange-foreground shadow-sm hover:shadow-md active:scale-[0.97]'
                                                                )}
                                                        >
                                                                {submitting ? (
                                                                        <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                                ) : (
                                                                        <>
                                                                                <AnimatedSend className="size-3.5" />
                                                                                إرسال التقييم
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>

                                                {/* Reviews list */}
                                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                                        {loading ? (
                                                                <div className="flex justify-center py-8">
                                                                        <div className="size-6 rounded-full border-2 border-border border-t-orange animate-spin" />
                                                                </div>
                                                        ) : fetchError ? (
                                                                <div className="text-center py-10" role="alert" aria-live="assertive">
                                                                        <AnimatedMessageCircle className="size-10 text-destructive/50 mx-auto mb-3" />
                                                                        <p className="text-sm text-destructive mb-3">
                                                                                فشل تحميل التقييمات. تحقق من اتصالك بالإنترنت.
                                                                        </p>
                                                                        {/* r95: رابط إعادة المحاولة — accent-foreground الأسطع (AA) */}
                                                                        <button
                                                                                onClick={() => setRetryKey((k) => k + 1)}
                                                                                className="text-xs text-accent-foreground underline underline-offset-2 hover:no-underline"
                                                                        >
                                                                                إعادة المحاولة
                                                                        </button>
                                                                </div>
                                                        ) : reviews.length === 0 ? (
                                                                /* round88-E3: unified EmptyState — compact variant inside the
                                                                   sheet (same copy, one shared visual language). */
                                                                <EmptyState
                                                                        icon={MessageCircle}
                                                                        title={`لا توجد تقييمات${filterStar ? ` بتقييم ${filterStar} نجوم` : ''}`}
                                                                        description="كن أول من يشارك رأيه في هذا الصنف من النموذج أعلاه"
                                                                        className="py-8"
                                                                />
                                                        ) : (
                                                                reviews.map((review, i) => (
                                                                        <m.div
                                                                                key={review.id}
                                                                                initial={{ opacity: 0, y: 12 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: i * 0.04 }}
                                                                                className="pb-4 border-b border-border/10 last:border-0"
                                                                        >
                                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                                        <div className="flex gap-0.5">
                                                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                                                        <AnimatedStar
                                                                                                                key={s}
                                                                                                                className={cn(
                                                                                                                        'size-3',
                                                                                                                        s <= review.rating
                                                                                                                                ? 'text-ember dark:text-saffron fill-ember dark:fill-saffron'
                                                                                                                                : 'text-muted-foreground/20'
                                                                                                                )}
                                                                                                        />
                                                                                                ))}
                                                                                        </div>
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                {review.customerName || 'مجهول'} ·{' '}
                                                                                                {formatDateShort(new Date(review.createdAt))}
                                                                                        </span>
                                                                                </div>
                                                                                {review.comment && (
                                                                                        <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                                                                                )}
                                                                        </m.div>
                                                                ))
                                                        )}
                                                </div>
                                        </m.div>
                                </>
                        )}
                </AnimatePresence>
        );
}
