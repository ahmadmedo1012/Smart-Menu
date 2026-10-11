'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
/* r138 (P1-3): المعلن المعتمد للتحميل — نفس نمط PickupTypeSelector
   في رحلة الزبون (role=status + sr-only + إعلان الاكتمال). */
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';

const starAnimate = { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] };

/* r135-C: حجم صفحة الـAPI الافتراضي (parsePagination في lib/api-helpers) —
   يُمرَّر صراحةً كي يكون كشف «الصفحة الممتلئة» (قد توجد المزيد) سليمًا
   على العميل. */
const PAGE_SIZE = 50;

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
        /* r135-C: ترقيم الصفحات — الـAPI يرقّم الصفوف (parsePagination: 50
           افتراضيًا، ويعيد meta/page/pageSize). نتتبع آخر صفحة محمّلة وهل
           أتت ممتلئة (قد توجد المزيد) لعرض زر «عرض المزيد» الذي يُلحق
           النتائج لا يستبدلها. */
        const [page, setPage] = useState(1);
        const [hasMore, setHasMore] = useState(false);
        const [loadingMore, setLoadingMore] = useState(false);
        /* r135-C: مُلغي مشترك — إطلاق جلب جديد (فتح/فلتر/إعادة محاولة)
           يقتل أي «عرض المزيد» جارٍ كي لا يُلحق نتائج فلتر قديم. */
        const abortRef = useRef<AbortController | null>(null);

        // Submit form state
        const [formRating, setFormRating] = useState(0);
        const [formComment, setFormComment] = useState('');
        const [formName, setFormName] = useState('');
        const [submitting, setSubmitting] = useState(false);
        const [submitError, setSubmitError] = useState('');

        useEffect(() => {
                if (!open || !menuItemId) return;
                // r135-C: اقتل أي «عرض المزيد» جارٍ قبل جلب صفحة أولى جديدة
                abortRef.current?.abort();
                const abort = new AbortController();
                abortRef.current = abort;
                setFetchError(false);
                setLoading(true);
                /* r135-C: page/pageSize صريحان (نفس افتراضي الـAPI) — كشف
                   «الصفحة الممتلئة» يحتاج حجمًا معروفًا على العميل. */
                const params = new URLSearchParams();
                if (filterStar) params.set('minRating', String(filterStar));
                params.set('page', '1');
                params.set('pageSize', String(PAGE_SIZE));
                fetch(`/api/items/${menuItemId}/reviews?${params.toString()}`, { signal: abort.signal })
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.success) {
                                        setReviews(json.data);
                                        setPage(1);
                                        // r135-C: صفحة ممتلئة = قد توجد المزيد
                                        setHasMore(Array.isArray(json.data) && json.data.length >= PAGE_SIZE);
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
                                /* r135-C: الإلغاء (تغيّر الفلتر/إغلاق الورقة/إعادة
                                   محاولة) ليس خطأ شبكة — كان يضبط fetchError على
                                   طلبٍ مُلغى فيبقى الخطأ ظاهرًا فوق القائمة. */
                                if (abort.signal.aborted) return;
                                setFetchError(true);
                                premiumToast('error', 'تعذّر تحميل التقييمات', 'تأكد من اتصالك بالإنترنت وحاول مرة أخرى');
                        })
                        .finally(() => {
                                /* r135-C: لا تلمس حالة جلبٍ أحدث (الطلب القديم
                                   المُلغى كان يطفئ مؤشر تحميل الطلب الجديد). */
                                if (!abort.signal.aborted) setLoading(false);
                        });

                return () => abort.abort();
        }, [open, menuItemId, filterStar, retryKey]);

        /* r135-C: «عرض المزيد من التقييمات» — يجلب الصفحة التالية بنفس الفلتر
           ويُلحق النتائج (لا يستبدلها)؛ يُعطَّل أثناء الجلب ويختفي الزر متى
           أتت آخر صفحة ناقصة (لا المزيد). */
        async function loadMoreReviews() {
                if (loadingMore || !hasMore) return;
                setLoadingMore(true);
                const next = page + 1;
                abortRef.current?.abort();
                const abort = new AbortController();
                abortRef.current = abort;
                try {
                        const params = new URLSearchParams();
                        if (filterStar) params.set('minRating', String(filterStar));
                        params.set('page', String(next));
                        params.set('pageSize', String(PAGE_SIZE));
                        const res = await fetch(`/api/items/${menuItemId}/reviews?${params.toString()}`, {
                                signal: abort.signal,
                        });
                        const json = await res.json();
                        if (json.success) {
                                setReviews((prev) => [...prev, ...json.data]);
                                setPage(next);
                                setHasMore(Array.isArray(json.data) && json.data.length >= PAGE_SIZE);
                        }
                } catch {
                        if (!abort.signal.aborted) {
                                premiumToast('error', 'تعذّر تحميل المزيد', 'تأكد من اتصالك بالإنترنت وحاول مرة أخرى');
                        }
                } finally {
                        if (!abort.signal.aborted) setLoadingMore(false);
                }
        }

        /* r135-C: مدرّج التقييمات ٥→١ — يُحسب من القائمة المحمّلة نفسها
           (client-side) فيتحدّث تلقائيًا بعد الإرفاق المتفائل لتقييم جديد ومع
           كل صفحة إضافية؛ التسمية صادقة: «معروض» لا «إجمالي». */
        const histogram = useMemo(() => {
                const counts = new Map<number, number>();
                for (const r of reviews) counts.set(r.rating, (counts.get(r.rating) ?? 0) + 1);
                const total = reviews.length;
                return [5, 4, 3, 2, 1].map((star) => ({
                        star,
                        count: counts.get(star) ?? 0,
                        pct: total > 0 ? Math.round(((counts.get(star) ?? 0) / total) * 100) : 0,
                }));
        }, [reviews]);

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
                        if (!json.success) throw new Error(json.error || 'تعذّر إرسال التقييم');

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
                        setSubmitError(e instanceof Error ? e.message : 'تعذّر إرسال التقييم');
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
                                                className="fixed bottom-0 inset-x-0 z-50 max-h-[85dvh] rounded-t-2xl bg-card border border-border/30 shadow-[var(--shadow-modal)] flex flex-col overflow-y-auto overflow-x-hidden"
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
                                                                className="size-11 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                aria-label="إغلاق"
                                                        >
                                                                <AnimatedX className="size-4" />
                                                        </button>
                                                </div>

                                                {/* r135-C: مدرّج التقييمات — انظر histogram أعلاه. يُعرض من القائمة
                                                    المحمّلة (قد تكون صفحة أولى فقط، أو مجموعة مفلترة) لذا التسمية
                                                    «معروض» صادقة ولا تدّعي الإجمال. */}
                                                {!loading && !fetchError && reviews.length > 0 && (
                                                        <div className="px-5 py-3 border-b border-border/10 space-y-1.5">
                                                                <p className="text-2xs text-muted-foreground">
                                                                        توزيع النجوم — من {toArabicNumber(reviews.length)} تقييم معروض
                                                                </p>
                                                                {histogram.map((row) => (
                                                                        <div key={row.star} className="flex items-center gap-2">
                                                                                <span className="flex w-10 shrink-0 items-center gap-1 text-2xs text-muted-foreground">
                                                                                        {toArabicNumber(row.star)}
                                                                                        <Star className="size-3 fill-current" aria-hidden="true" />
                                                                                </span>
                                                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                                                                        <span
                                                                                                className="block h-full rounded-full bg-orange transition-[width] duration-base"
                                                                                                style={{ width: `${row.pct}%` }}
                                                                                        />
                                                                                </span>
                                                                                <span className="w-14 shrink-0 text-end text-2xs tabular-nums text-muted-foreground">
                                                                                        {toArabicNumber(row.count)} ({toArabicNumber(row.pct)}%)
                                                                                </span>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                                {/* Star filter — r135-C: الفلترة على الخادم minRating أي «N نجوم
                                                    وأعلى» (gte) — التسميات كانت «N ★» فقط فتوهم حصرًا بالنجم
                                                    المفرد؛ صُحّحت: «٤★ وأعلى»… و«٥★» تامة لأنها القمة. aria-pressed
                                                    لكل رقاقة (نمط toggle الفلتر) + اسم مجموعة للقارئ. */}
                                                <div
                                                        role="group"
                                                        aria-label="تصفية التقييمات حسب النجوم"
                                                        className="flex gap-1.5 px-5 py-3 border-b border-border/10 overflow-x-auto"
                                                >
                                                        {[null, 5, 4, 3, 2, 1].map((star) => (
                                                                <button
                                                                        key={star ?? 'all'}
                                                                        onClick={() => setFilterStar(star)}
                                                                        aria-pressed={filterStar === star}
                                                                        className={cn(
                                                                                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                filterStar === star
                                                                                        ? 'bg-orange text-orange-foreground border-orange shadow-sm'
                                                                                        : 'bg-muted/30 text-muted-foreground border-border/20 hover:bg-muted/50'
                                                                        )}
                                                                >
                                                                        {/* r97-X1: رقم عربي + نجمة lucide بدل `${star} ⭐` */}
                                                                        {star ? (
                                                                                <>
                                                                                        {toArabicNumber(star)}
                                                                                        <Star className="size-3 fill-current" aria-hidden="true" />
                                                                                        {/* r135-C: «وأعلى» — الفلتر gte يشمل النجوم الأعلى */}
                                                                                        {star < 5 && ' وأعلى'}
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
                                                        {/* Star picker — r135-C: radiogroup حقيقي (كانت خمسة أزرار بلا
                                                            دور/حالة): الأسهم تنقّل وتحدّث الاختيار معًا (RTL: النجوم من
                                                            اليمين ١ إلى اليسار ٥ — اليسار = التالي)، Space/Enter يختار
                                                            (سلوك الزر الأصلي)، أهداف اللمس 44px (size-11)، roving tabindex
                                                            (المختار — أو الأول — هو وحده Tab)، والتركيز بالمخطط العام (r133). */}
                                                        <div
                                                                role="radiogroup"
                                                                aria-label="التقييم"
                                                                className="flex gap-1"
                                                                onKeyDown={(e) => {
                                                                        const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']"));
                                                                        if (radios.length === 0) return;
                                                                        const cur = radios.findIndex((r) => r === document.activeElement);
                                                                        let next: number;
                                                                        switch (e.key) {
                                                                                case 'ArrowLeft':
                                                                                case 'ArrowDown':
                                                                                        next = cur < 0 ? 0 : Math.min(cur + 1, radios.length - 1);
                                                                                        break;
                                                                                case 'ArrowRight':
                                                                                case 'ArrowUp':
                                                                                        next = cur < 0 ? radios.length - 1 : Math.max(cur - 1, 0);
                                                                                        break;
                                                                                case 'Home':
                                                                                        next = 0;
                                                                                        break;
                                                                                case 'End':
                                                                                        next = radios.length - 1;
                                                                                        break;
                                                                                default:
                                                                                        return;
                                                                        }
                                                                        e.preventDefault();
                                                                        radios[next]?.focus();
                                                                        setFormRating(next + 1);
                                                                        setSubmitError('');
                                                                }}
                                                        >
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                        <m.button
                                                                                key={s}
                                                                                type="button"
                                                                                role="radio"
                                                                                aria-checked={s === formRating}
                                                                                aria-label={`${toArabicNumber(s)} من ٥ نجوم`}
                                                                                tabIndex={s === (formRating || 1) ? 0 : -1}
                                                                                whileTap={{ scale: 1.3 }}
                                                                                animate={formRating >= s ? starAnimate : {}}
                                                                                transition={{ duration: 0.3 }}
                                                                                onClick={() => {
                                                                                        setFormRating(s);
                                                                                        setSubmitError('');
                                                                                }}
                                                                                className={cn(
                                                                                        'size-11 flex items-center justify-center rounded-lg cursor-pointer transition-colors',
                                                                                        /* round94 (D/A2): نمط r84 — ember فاتح 6.31:1 بدل saffron
                                                                                           غير المحروس (كان 2.05:1 في الفاتح؛ hover /50 كان 1.42:1) */
                                                                                        s <= formRating
                                                                                                ? 'text-ember dark:text-saffron'
                                                                                                /* r127-F4: /20 → /60 — نجوم غير المختارة كانت تحت أرضية AA
                                                                                                   في عنصر تفاعلي (زر تقييم قابل للنقر) */
                                                                                                : 'text-muted-foreground/60 hover:text-ember dark:hover:text-saffron/50'
                                                                                )}
                                                                        >
                                                                                <AnimatedStar className={cn('size-6', s <= formRating && 'fill-ember dark:fill-saffron')} />
                                                                        </m.button>
                                                                ))}
                                                        </div>
                                                        {/* Comment */}
                                                        <textarea
                                                                /* r135-C: aria-label — القارئ كان يقرأ الـplaceholder فقط
                                                                   (axe: WCAG 3.3.2/4.1.2 على حقل بلا اسم). */
                                                                aria-label="تعليقك"
                                                                id="review-comment"
                                                                name="comment"
                                                                placeholder="اكتب تعليقك (اختياري)"
                                                                value={formComment}
                                                                onChange={(e) => setFormComment(e.target.value)}
                                                                rows={2}
                                                                maxLength={500}
                                                                className="w-full rounded-lg border border-border/20 bg-muted/20 p-3 text-[16px] placeholder:text-placeholder-text resize-none outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]"
                                                        />
                                                        {/* Name */}
                                                        <input
                                                                /* r135-C: aria-label — نفس إصلاح حقل التعليق (اسم/placeholder). */
                                                                aria-label="اسمك"
                                                                id="review-name"
                                                                name="name"
                                                                placeholder="الاسم (اختياري)"
                                                                value={formName}
                                                                onChange={(e) => setFormName(e.target.value)}
                                                                maxLength={50}
                                                                className="w-full rounded-lg border border-border/20 bg-muted/20 p-3 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]"
                                                        />
                                                        {/* Error */}
                                                        {submitError && (
                                                                /* r138 (P1-1): danger-ink — كان destructive
                                                                   3.19:1 على أبيض الفاتح. */
                                                                <p className="text-xs text-danger-ink" role="alert">
                                                                        {submitError}
                                                                </p>
                                                        )}
                                                        {/* Submit */}
                                                        {/* r139 (P2-8 من تدقيق r138-a، 4.1.3): السبينر
                                                           وحده كان صامتًا لقارئات الشاشة — منطقة بثّ
                                                           تُعلن «جارٍ إرسال التقييم» (بلا رسالة اكتمال:
                                                           النجاح له توست والفشل له نص خطأ مرئي — لا
                                                           كذب على قارئ الشاشة أبدًا). */}
                                                        <LoadingAnnouncer
                                                                loading={submitting}
                                                                message="جارٍ إرسال التقييم"
                                                                completedMessage=""
                                                        />
                                                        <button
                                                                onClick={handleSubmit}
                                                                aria-label="إرسال التقييم"
                                                                disabled={formRating < 1 || submitting}
                                                                className={cn(
                                                                        'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                        formRating < 1
                                                                                ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                                                                                : 'bg-orange text-orange-foreground shadow-sm hover:shadow-md active:scale-[0.97]'
                                                                )}
                                                        >
                                                                {submitting ? (
                                                                        <>
                                                                                <div
                                                                                        className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                                                                                        aria-hidden="true"
                                                                                />
                                                                                <span className="sr-only">جارٍ إرسال التقييم</span>
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                <AnimatedSend className="size-3.5" />
                                                                                إرسال التقييم
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>

                                                {/* Reviews list */}
                                                {/* r138 (P1-3): السبينر كان صامتًا لقارئات الشاشة —
                                                   aria-busy على الحاوية + LoadingAnnouncer (4.1.3
                                                   — تدقيق r138-b: «جارٍ تحميل التقييمات»). */}
                                                <div
                                                        className="flex-1 overflow-y-auto p-5 space-y-4"
                                                        aria-busy={loading || undefined}
                                                >
                                                        <LoadingAnnouncer
                                                                loading={loading}
                                                                message="جارٍ تحميل التقييمات"
                                                                completedMessage="تم تحميل التقييمات"
                                                        />
                                                        {loading ? (
                                                                <div className="flex justify-center py-8">
                                                                        <div className="size-6 rounded-full border-2 border-border border-t-orange animate-spin" />
                                                                </div>
                                                        ) : fetchError ? (
                                                                <div className="text-center py-10" role="alert" aria-live="assertive">
                                                                        <AnimatedMessageCircle className="size-10 text-destructive/50 mx-auto mb-3" />
                                                                        {/* r138 (P1-1): danger-ink — كان destructive
                                                                            3.19:1 على أبيض الفاتح (الأيقونة زخرفية /50 تبقى). */}
                                                                        <p className="text-sm text-danger-ink mb-3">
                                                                                تعذّر تحميل التقييمات. تحقق من اتصالك بالإنترنت.
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
                                                                        /* r135-C: نفس تصحيح رقائق الفلتر — الفلتر gte لا حصر؛ والرقم عربي. */
                                                                        title={`لا توجد تقييمات${filterStar ? ` بتقييم ${toArabicNumber(filterStar)} نجوم${filterStar < 5 ? ' وأعلى' : ''}` : ''}`}
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
                                                                                                                                /* r127-F4: /20 → /60 — نجمة العرض غير المعبأة تحت أرضية AA */
                                                                                                                                : 'text-muted-foreground/60'
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
                                                {/* r135-C: «عرض المزيد» — يظهر فقط إذا أتت آخر صفحة ممتلئة (قد
                                                    توجد المزيد)، يُعطَّل أثناء الجلب، ويختفي متى أتت صفحة ناقصة.
                                                    r139 (P2-8 من r138-a، 4.1.3): التعطيل الصامت أصبح
                                                    معلنًا — منطقة بثّ تُعلن «جارٍ تحميل المزيد» (بلا
                                                    اكتمال: ظهور المراجعات الجديدة هو الإشارة، والفشل
                                                    له توست). */}
                                                {!loading && !fetchError && reviews.length > 0 && hasMore && (
                                                        <div className="pt-1 text-center">
                                                                <LoadingAnnouncer
                                                                        loading={loadingMore}
                                                                        message="جارٍ تحميل المزيد من التقييمات"
                                                                        completedMessage=""
                                                                />
                                                                <button
                                                                        type="button"
                                                                        onClick={loadMoreReviews}
                                                                        disabled={loadingMore}
                                                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border/20 bg-muted/30 px-5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
                                                                >
                                                                        {loadingMore && (
                                                                                <span className="size-3.5 rounded-full border-2 border-border border-t-orange animate-spin" aria-hidden="true" />
                                                                        )}
                                                                        عرض المزيد من التقييمات
                                                                </button>
                                                        </div>
                                                )}
                                                </div>
                                        </m.div>
                                </>
                        )}
                </AnimatePresence>
        );
}
