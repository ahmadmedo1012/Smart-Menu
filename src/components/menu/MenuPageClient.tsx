'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import { Armchair, ChefHat, MessageCircle, SearchX, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/store/cart';
import { premiumToast } from '@/lib/premium-toast';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { MenuItemCard, type MenuItemProp } from './MenuItemCard';
import { CategoryTabs } from './CategoryTabs';
import { MenuToolbar } from './MenuToolbar';
import { FeaturedShowcase, type FeaturedItem } from './FeaturedShowcase';
import { CartSwitchDialog, willReplaceOtherRestaurantCart, type CartSwitchInfo } from './CartSwitchDialog';
import dynamic from 'next/dynamic';

// round86-B8: 426 + 369 line dialogs load only when opened — they were
// statically imported and shipped in the initial menu-page chunks.
// 17-SM: قسمان متكاملان — (1) تركيب عند الفتح (أسفل) صار يجلب الشريحة لحظة
// أول فتح فعلًا لا لحظة الترطيب: زبون QR الذي يتصفح بلا فتح حوار لا يجلب
// كود الحوارين إطلاقًا. (2) حالة تحميل مصمّمة (DialogChunkFallback) تظهر
// أثناء جولة الشريحة الباردة الأولى بدل «لا شيء يحدث» بعد النقر.
// بلا إظهار قبل التركيب: الـHTML المخبز مطابق لسابقه (بلا قوالب انسحاب —
// عقيدة r97-W6c/W6d) لأن البوابة نفسها لا تُرندر في الخادم.
const OrderDialog = dynamic(() => import('./OrderDialog').then((m) => ({ default: m.OrderDialog })), {
        ssr: false,
        loading: () => <DialogChunkFallback />,
});
const ReviewSheet = dynamic(() => import('./ReviewSheet').then((m) => ({ default: m.ReviewSheet })), {
        ssr: false,
        loading: () => <DialogChunkFallback />,
});
// حالة تحميل شرائح الحوارات — نفس وصفة الغطاء والقشرة في ui/dialog
import { DialogChunkFallback } from './dialog-chunk-fallback';
import { toArabicNumber, normalizeArabic } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { normalizeWaNumber } from '@/lib/whatsapp';
import { DIETARY_LABELS } from '@/lib/dietary';
// r138-exec-2 (J3): أيقونة × لرقاقة مسح البحث (نفس أيقونة زر المسح في MenuToolbar)
import AnimatedX from '@/components/ui/x-icon';
// r135-TABLE: التقاط ‎?table=N‎ من رابط QR للطاولة — انظر lib/table-session.ts
import { captureTableFromUrl } from '@/lib/table-session';

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string };

/* r135: الترتيب يوسّع بـ«الأعلى تقييماً» — البيانات (avgRating/ratingCount)
 * كانت تعبر السلك منذ w3-f1 لكن الترتيب لم يعرضها قط. */
const SORT_VALUES = ['default', 'price-asc', 'price-desc', 'name', 'rating'] as const;
type SortValue = (typeof SORT_VALUES)[number];

/* r135: فلاتر غذائية عميلة (نمط Deliveroo/talabat) — العميل النباتي لا
 * ينبغي أن يفتّش حبة حبة بين الحبوب؛ الرقائق تُشتق من بيانات المنيو
 * الفعلية (تظهر فقط ما يوجد في المنيو) وتُخزّن في الرابط (قابل للمشاركة). */
const DIETARY_FILTER_KEYS = ['vegetarian', 'vegan', 'gluten_free', 'spicy'] as const;
type DietaryFilterKey = (typeof DIETARY_FILTER_KEYS)[number];

function isValidSort(v: string | null): v is SortValue {
        return v !== null && (SORT_VALUES as readonly string[]).includes(v);
}

// r93-W2a (U2): جمع عربي ديناميكي لعدد نتائج التصفية (نمط cartCountPhrase
// من r92-A9) — «عُثر على صنف واحد / صنفين / 5 أصناف / 12 صنفًا» بدل
// «N صنف» الثابت الذي كان ينكسر عند 2-10. الصفر يُعالج خارج الدالة
// («لا توجد نتائج») لذا لا يحتاج صيغة خاصة هنا. مُصدَّرة ليبثها الاختبار.
// r138-exec-2 (J4): المثنى «صنفين» بدل «صنفان» — المعدود مجرور بعد
// «عُثر على» (إعراب جر)، والمبني للمجهول «عُثر» بدل «تم العثور».
export function foundItemsPhrase(count: number): string {
        const noun = getArabicPlural(count, 'صنف', {
                one: 'صنف واحد',
                two: 'صنفين',
                few: 'أصناف',
                many: 'صنفًا',
        });
        return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

/* r97-W6 (منسّق الجولة): قراءة معلمات URL عبر window.location.search + popstate
 * بدل useSearchParams. القراءة القديمة كانت في جذر MenuPageClient فتُضطرّ
 * Next إلى إسقاط الشجرة كلها إلى الـfallback أثناء التوليد الثابت (ISR) — فكان
 * الـHTML الخام يحمل «جاري تحميل المنيو…» بدل البطاقات والأسعار والصور.
 * النسخة الأولى من الإصلاح (حدّ Suspense ضيق حول hook معلّق) كشفت سباق
 * إعادة تعليق أثناء الماء في React 19 على Next 16.3 (شجرة قديمة مخفية
 * + جديدة مرئية — strict-mode violation في team8) — وهو نفس السباق الذي
 * حذّر منه تعليق round86 السابق. الإزالة الكاملة للـhook المعلّق تُنهيه:
 * لا أي تعليق في شجرة العميل إطلاقًا، الـSSR كامل، والمعلمات تُطبّق
 * بعد الماء بإطار واحد (رابط QR بلا معلمات لا يومض أبدًا).
 * ملاحظة عقد: التنقل الداخلي عبر Link إلى نفس المسار بمعلمات جديدة لن
 * يعيد تشغيل القراءة (المكوّن يُحفظ) — لا يوجد اليوم رابط داخلي يحمل
 * معلمات إلى المنيو؛ إن أُضيف مستقبلًا فأضف مستمعًا لمسار الرواتر. */
function UrlFilterSync({
        categories,
        onParams,
}: {
        categories: CategoryProp[];
        onParams: (p: { q: string; cat: number | null; sort: SortValue; diet: string[] }) => void;
}) {
        useEffect(() => {
                const read = () => {
                        const p = new URLSearchParams(window.location.search);
                        const q = p.get('q') || '';
                        let cat: number | null = null;
                        const raw = p.get('cat');
                        if (raw) {
                                const n = Number(raw);
                                if (!isNaN(n) && categories.some((c) => c.id === n)) cat = n;
                        }
                        const sortRaw = p.get('sort');
                        const sort = isValidSort(sortRaw) ? sortRaw! : 'default';
                        // r135: diet=vegan,spicy — فلاتر غذائية قابلة للمشاركة عبر الرابط
                        const diet = (p.get('diet') || '')
                                .split(',')
                                .map((d) => d.trim())
                                .filter((d): d is DietaryFilterKey =>
                                        (DIETARY_FILTER_KEYS as readonly string[]).includes(d)
                                );
                        onParams({ q, cat, sort, diet });
                };
                read(); // التحميل الكامل/الأول: طبّق معلمات الرابط فور الماء
                window.addEventListener('popstate', read); // رجوع/تقدم المتصفح
                return () => window.removeEventListener('popstate', read);
        }, [categories, onParams]);
        return null;
}

export function MenuPageClient({
        categories,
        items,
        restaurantWhatsapp,
        /* r138-exec-2 (J1): هاتف المطعم للتواصل البديل عند غياب واتساب
           صالح — نفس الرقم الذي يعرض رابط tel: في MenuHero (عرض خام). */
        restaurantPhone,
        restaurantName,
        restaurantId,
        restaurantLogo,
        deliveryFee,
}: {
        categories: CategoryProp[];
        items: Array<MenuItemProp & FeaturedItem>;
        restaurantWhatsapp?: string;
        /* r138-exec-2 (J1): انظر أعلاه — يُذكر في رسالة البوابة عند وجوده. */
        restaurantPhone?: string;
        restaurantName?: string;
        restaurantId: number;
        restaurantLogo?: string;
        /* r137: رسوم التوصيل للمطعم — تسمية خيار التوصيل في OrderDialog
           («التوصيل (5 د.ل رسومًا)»). null = الميزة مطفأة. */
        deliveryFee?: number | null;
}) {
        /* r97-W6: حالة معلمات URL محلية (كانت قراءة useSearchParams مباشرة —
           انظر UrlFilterSync أعلاه). القيم الافتراضية تعرض المنيو كاملًا في
           SSR؛ الرابط المُعلم يُطبّق فور الماء. */
        const [urlState, setUrlState] = useState<{ q: string; cat: number | null; sort: SortValue; diet: string[] }>({
                q: '',
                cat: null,
                sort: 'default',
                diet: [],
        });
        const search = urlState.q;
        const activeCategory = urlState.cat;
        const sort = urlState.sort;
        const activeDietary = urlState.diet;

        const [orderItem, setOrderItem] = useState<MenuItemProp | null>(null);
        /* 17-SM: تركيب عند الفتح — الحوار الديناميكي لا يُرندر إلا بعد أول فتح
         * حقيقي، فلا تُجلب شريحته مع الترطيب. يبقى مركّبًا بعد أول فتح عمدًا:
         * الإغلاق يقلب open=false داخل المكوّن الباقي فتكتمل حركة الخروج
         * (data-ending-style في ui/dialog) بدل بترها بإزالة الشجرة، وإعادة
         * الفتح لاحقًا فورية (الشريحة مخبّأة). إعادة الضبط عند كل فتح من
         * OrderDialog نفسه (useEffect على open). */
        const [orderDialogMounted, setOrderDialogMounted] = useState(false);
        useEffect(() => {
                if (orderItem !== null) setOrderDialogMounted(true);
        }, [orderItem]);
        /* r135-TABLE: رقم الطاولة من رابط QR لكل طاولة (‎?table=N‎). يُقرأ مرة
           واحدة (المعلم لا يدخل حالة التصفية) ويُخزّن في sessionStorage حتى
           ينجو من الانتقال إلى السلة، حيث يُلحق بملاحظات الطلب. الشريحة
           المعلومة تُعلم الزبون أن طلبه سيصل موقّعًا بطاولته. المنطق في
           lib/table-session (مصدر واحد مع صفحة السلة). */
        const [tableNumber, setTableNumber] = useState<number | null>(null);
        useEffect(() => {
                setTableNumber(captureTableFromUrl());
        }, []);
        /* a11y: one shared ReviewSheet instance (was mounted per-card — N dialogs in the DOM).
                Fed by onReview from each card; keeps ReviewSheet's own focus trap/restore.
                17-SM: نفس بوابة «التركيب عند الفتح» (orderDialogMounted أعلاه) —
                شريحة التقييمات ‎~649 سطرًا لا تُجلب إلا عند أول «قيّم»، مع بقاء
                المكوّن بعد الإغلاق لتحية خروج AnimatePresence الخاصة به. */
        const [reviewItem, setReviewItem] = useState<{ id: number; name: string } | null>(null);
        const [reviewSheetMounted, setReviewSheetMounted] = useState(false);
        useEffect(() => {
                if (reviewItem !== null) setReviewSheetMounted(true);
        }, [reviewItem]);
        const cartItems = useCart((s) => s.items);
        const addItem = useCart((s) => s.addItem);
        const updateQuantity = useCart((s) => s.updateQuantity);
        const setRestaurantDetails = useCart((s) => s.setRestaurantDetails);

        // Update URL params (replace, not push, to avoid history spam).
        // round86-B3: history.replaceState instead of router.replace — the latter is
        // a NAVIGATION: it re-fetches the RSC payload for /menu/[slug]?q=… from the
        // server (and every unique query string is a distinct ISR cache key), so a
        // customer typing 4-6 characters triggered 4-6 server renders + full menu
        // flights on the QR path. Next syncs useSearchParams with the History API,
        // so the URL stays shareable with zero server involvement.
        // r97-W6: window.location.search هو المصدر الدائم (لا closure قديمة من
        // searchParams) + تحديث الحالة المحلية فورًا — UrlFilterSync يؤكد نفس
        // القيم عند مزامنة Next للـHistory API (idempotent).
        const updateURL = useCallback(
                (updates: { q?: string; cat?: number | null; sort?: string; diet?: string[] }) => {
                        const p = new URLSearchParams(window.location.search);
                        if (updates.q !== undefined) {
                                if (updates.q) p.set('q', updates.q);
                                else p.delete('q');
                        }
                        if (updates.cat !== undefined) {
                                if (updates.cat !== null) p.set('cat', String(updates.cat));
                                else p.delete('cat');
                        }
                        if (updates.sort !== undefined) {
                                if (updates.sort !== 'default') p.set('sort', updates.sort);
                                else p.delete('sort');
                        }
                        if (updates.diet !== undefined) {
                                if (updates.diet.length > 0) p.set('diet', updates.diet.join(','));
                                else p.delete('diet');
                        }
                        const qs = p.toString();
                        window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
                        setUrlState((prev) => {
                                const next = { ...prev };
                                if (updates.q !== undefined) next.q = updates.q;
                                if (updates.cat !== undefined) next.cat = updates.cat;
                                if (updates.sort !== undefined)
                                        next.sort = isValidSort(updates.sort) ? updates.sort : 'default';
                                if (updates.diet !== undefined) next.diet = updates.diet;
                                return next;
                        });
                },
                []
        );

        const addLockRef = useRef(false);
        const addLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        // Clear the add-lock release timer on unmount so a late ref write can't happen
        useEffect(() => () => {
                if (addLockTimerRef.current) clearTimeout(addLockTimerRef.current);
        }, []);

        /* r110-F11: الفعل المؤجل بعد موافقة تبديل السلة — الإضافة السريعة أو فتح
                نافذة الصنف. يُخزَّن هنا لأن حوار التأكيد لا يعرف سياق الفعل. */
        const [pendingCartSwitch, setPendingCartSwitch] = useState<
                { info: CartSwitchInfo; action: () => void } | null
        >(null);

        /* r110-F11: هل إضافة من هذا المنيو ستفرغ سلة مطعم آخر؟ (شرط المطابقة
                نفسه من store/cart.ts — لكن للقراءة فقط هنا؛ التنفيذ يبقى في addItem) */
        const crossRestaurantCart = useCallback((targetRestaurantId: number) => {
                return willReplaceOtherRestaurantCart(useCart.getState(), targetRestaurantId);
        }, []);

        /* r110-F11: حارس التبديل — يستقبل فعلاً مطلوبًا في مطعم مختلف عن سلة
                المستخدم الحالية؛ إن كان التبديل إتلافيًا (سلة غير فارغة) يعرض تأكيدًا
                صريحًا بدل الإفراغ الصامت، وإلا ينفّذ فورًا. */
        const guardCartSwitch = useCallback(
                (action: () => void, itemDisplayName: string) => {
                        if (!crossRestaurantCart(restaurantId)) {
                                action();
                                return;
                        }
                        const cart = useCart.getState();
                        setPendingCartSwitch({
                                info: {
                                        fromRestaurantName: cart.restaurantName || 'مطعم آخر',
                                        itemCount: cart.items.reduce((a, i) => a + i.quantity, 0),
                                        toRestaurantName: restaurantName || 'هذا المنيو',
                                },
                                action: () => {
                                        action();
                                        premiumToast('info', `أُفرغت سلة «${cart.restaurantName || 'المطعم السابق'}» وبدأنا سلة جديدة — «${itemDisplayName}»`);
                                },
                        });
                },
                [crossRestaurantCart, restaurantId, restaurantName]
        );

        const performQuickAdd = useCallback(
                (item: MenuItemProp) => {
                        /* r135-SOLD-OUT: حزام وأحزمة — البطاقة تعطّل أزرارها أصلًا؛
                           هذا الحارس يمنع أي مسار متبقٍ (لوحة مفاتيح، حالات قديمة). */
                        if (item.isAvailable === false) return;
                        addItem({
                                itemId: item.id,
                                name: item.nameAr || item.name,
                                price: item.discountedPrice ?? item.price,
                                image: item.image || undefined,
                                restaurantId,
                                restaurantName: restaurantName || undefined,
                                restaurantWhatsapp: restaurantWhatsapp || undefined,
                        });
                        premiumToast('cart', 'تمت الإضافة!', item.nameAr || item.name, {
                                duration: 3200,
                                anim: true,
                        });
                },
                [addItem, restaurantId, restaurantName, restaurantWhatsapp]
        );

        const handleQuickAdd = useCallback(
                (item: MenuItemProp) => {
                        /* r138-exec-2 (J1): بوابة واتساب للإضافة السريعة — كانت الإضافة
                           السريعة تُتخطى فحص الواتساب كليًا (نافذة الصنف تعطّل زرها عند
                           الغياب) فيبني الزبون سلة كاملة ثم يصطدم بجدار صفحة السلة
                           (normalizeWaNumber فارغ → الطلب لا يُحفظ أبدًا). البوابة نفسها
                           الآن على المسندين، وقبل حوار تبديل السلة كي لا نُفرغ سلة مطعم
                           آخر ثم نخبر الزبون أن الطلب غير متاح أصلًا. الرسالة بصياغة
                           عائلة «لا واتساب» الموحّدة (OrderDialog/صفحة السلة) مع قناة
                           الهاتف إن وُجد رقم (نفس رابط tel: في MenuHero). */
                        if (!normalizeWaNumber(restaurantWhatsapp)) {
                                premiumToast(
                                        'error',
                                        'الطلب غير متاح حاليًا لهذا المطعم',
                                        restaurantPhone
                                                ? `لم يتم إعداد واتساب بعد — يمكنك الاتصال بالمطعم مباشرة على ${restaurantPhone}`
                                                : 'لم يتم إعداد واتساب بعد للمطعم. يُرجى التواصل مع المطعم مباشرة.',
                                );
                                return;
                        }
                        if (addLockRef.current) return; // H1 fix: block double-tap rapid adds
                        /* r110-F11: اعتراض التبديل قبل القفل — إن رفض المستخدم لا يجب أن
                                يبقى القفل ممسكًا 400ms بلا فعل، وإن ظهر حوار التأكيد فالقفل
                                يُطبَّق عند التنفيذ الفعلي (performQuickAdd يمر بهذا المسار). */
                        guardCartSwitch(() => {
                                addLockRef.current = true;
                                performQuickAdd(item);
                                if (addLockTimerRef.current) clearTimeout(addLockTimerRef.current);
                                addLockTimerRef.current = setTimeout(() => { addLockRef.current = false; }, 400);
                        }, item.nameAr || item.name);
                },
                [guardCartSwitch, performQuickAdd, restaurantWhatsapp, restaurantPhone]
        );

        /* r110-F11: فتح نافذة الصنف يمر بنفس الحارس — أفضل من الاعتراض عند
                «تأكيد» النافذة لأن المستخدم لو خيّر المعدلات ثم عرف أن السلة ستُفرغ
                لضاع جهده؛ الاعتراض المبكر أوضح. r135-SOLD-OUT: الصنف غير المتاح
                لا يفتح نافذة — لا يوجد ما يُطلب أصلًا. */
        const handleOpenOrder = useCallback(
                (item: MenuItemProp) => {
                        if (item.isAvailable === false) return;
                        guardCartSwitch(() => setOrderItem(item), item.nameAr || item.name);
                },
                [guardCartSwitch]
        );

        const handleDecrement = useCallback(
                (item: MenuItemProp) => {
                        const existing = cartItems.find((i) => i.itemId === item.id);
                        if (existing) updateQuantity(existing.id, existing.quantity - 1);
                },
                [cartItems, updateQuantity]
        );

        const getCartQty = useCallback(
                (itemId: number) => cartItems.find((i) => i.itemId === itemId)?.quantity ?? 0,
                [cartItems]
        );

        useEffect(() => {
                if (restaurantId)
                        setRestaurantDetails(restaurantId, restaurantWhatsapp || '', restaurantName || '');
        }, [restaurantId, restaurantWhatsapp, restaurantName, setRestaurantDetails]);

        /* r135-PERF: فهرس عربي مطبّع مُسبق الحساب — كان الفلتر يطبّع اسم ووصف
           كل صنف من جديد عند كل ضغطة حرف (normalizeArabic على C×I في كل
           keystroke). يحسب مرة واحدة لكل تغيير في العناصر ثم بحث O(I) بلا
           تطبيع متكرر. */
        const normalizedIndex = useMemo(() => {
                const m = new Map<number, { name: string; desc: string }>();
                for (const item of items) {
                        m.set(item.id, {
                                name: normalizeArabic(item.nameAr || item.name),
                                desc: normalizeArabic(item.descriptionAr || item.description),
                        });
                }
                return m;
        }, [items]);

        /* r135: خيارات الفلاتر الغذائية — تُشتق من بيانات المنيو الفعلية:
           الرقاقة تظهر فقط إذا وُجد صنف واحد على الأقل يحمل الوسم (لا رقائق
           ميتة على منيو لا يحتويها). التسميات من نفس معجم البطاقات. */
        const dietaryOptions = useMemo(() => {
                const present = new Set<string>();
                for (const item of items) {
                        for (const tag of item.dietaryTags ?? []) present.add(tag);
                }
                return DIETARY_FILTER_KEYS
                        .filter((k) => present.has(k))
                        .map((k) => ({ value: k, label: DIETARY_LABELS[k] ?? k }));
        }, [items]);

        /* ── Filtered + sorted items ──
           r135: الفلترة الغذائية تُطبّق داخل نطاق البحث (AND) — نباتي + «شاورما»
           = شاورما نباتية فقط. الصنف المنتهي يبقى في النتائج (رمادي، غير قابل
           للطلب) — هذا هو نمط «تعطيل لا إخفاء». */
        const filteredItems = useMemo(() => {
                const q = normalizeArabic(search.trim());
                const result = items.filter((item) => {
                        const idx = normalizedIndex.get(item.id)!;
                        const matchesSearch = q === '' || idx.name.includes(q) || idx.desc.includes(q);
                        const matchesCategory = activeCategory === null || item.categoryId === activeCategory;
                        const matchesDietary =
                                activeDietary.length === 0 ||
                                activeDietary.every((tag) => (item.dietaryTags ?? []).includes(tag));
                        return matchesSearch && matchesCategory && matchesDietary;
                });

                switch (sort) {
                        case 'price-asc':
                                result.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? a.price));
                                break;
                        case 'price-desc':
                                result.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price));
                                break;
                        case 'name':
                                result.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name));
                                break;
                        case 'rating':
                                /* r135: الأعلى تقييماً — المصنَّفون أولاً (بأعداد تقييم صحيحة)
                                   ثم الأعلى متوسطاً؛ غير المصنّفين في نهايتهم بترتيبهم الأصلي. */
                                result.sort((a, b) => {
                                        const ra = a.avgRating != null && (a.ratingCount ?? 0) > 0;
                                        const rb = b.avgRating != null && (b.ratingCount ?? 0) > 0;
                                        if (ra && rb) return (b.avgRating ?? 0) - (a.avgRating ?? 0);
                                        if (ra) return -1;
                                        if (rb) return 1;
                                        return 0;
                                });
                                break;
                }
                return result;
        }, [items, search, activeCategory, sort, activeDietary, normalizedIndex]);

        /* ── Popular items ── */
        const popularItems = useMemo(
                () => (activeCategory === null && search === '' ? items.filter((i) => i.isPopular) : []),
                [items, activeCategory, search]
        );

        // round89-coordinator (hidden-item bug): the carousel renders ONLY when
        // there are ≥2 popular items, and shows at most 6. The grid must exclude
        // exactly what the carousel ACTUALLY renders — not "all popular" —
        // otherwise a lone popular item (carousel suppressed) or the 7th+ popular
        // item (carousel sliced at 6) vanished from the page entirely.
        // P18-W2-c (fold law): mobile caps the strip at 2 rows (the demo menu's
        // 6-row block pushed the first category card to y=1265-1900 at 390×844);
        // the desktop grid keeps the full 6. The exclusion stays tied to
        // popularVisible (same truth on every viewport — no hidden-item bug).
        const popularVisible = useMemo(
                () => (popularItems.length >= 2 ? popularItems.slice(0, 6) : []),
                [popularItems]
        );

        const normalItems = useMemo(
                () =>
                        popularVisible.length > 0
                                ? filteredItems.filter((i) => !popularVisible.includes(i))
                                : filteredItems,
                [filteredItems, popularVisible]
        );

        /* r135: العدّادات واعية للبحث والفلاتر الغذائية — كانت تُحسب من القائمة
           الكاملة فتُظهر «المشروبات ٧» بينما نتائج البحث الحالية فيها صنفان
           فقط؛ الآن العدّ يطابق ما يراه الزبون فعلاً (الفئة نفسها غير مفلترة
           عمداً — الرقاقة تعرض ما ستحصل عليه عند اختيارها). */
        const dietAndSearchBase = useMemo(
                () =>
                        items.filter((item) => {
                                const q = normalizeArabic(search.trim());
                                const idx = normalizedIndex.get(item.id)!;
                                const matchesSearch = q === '' || idx.name.includes(q) || idx.desc.includes(q);
                                const matchesDietary =
                                        activeDietary.length === 0 ||
                                        activeDietary.every((tag) => (item.dietaryTags ?? []).includes(tag));
                                return matchesSearch && matchesDietary;
                        }),
                [items, search, activeDietary, normalizedIndex]
        );

        const itemCounts = useMemo(() => {
                const counts = new Map<number | null, number>();
                counts.set(null, dietAndSearchBase.length);
                for (const cat of categories) {
                        counts.set(cat.id, dietAndSearchBase.filter((i) => i.categoryId === cat.id).length);
                }
                return counts;
        }, [dietAndSearchBase, categories]);

        // ponytail: dead scroll listener removed — it was an empty useCallback doing nothing

        const handleSuggestionClick = useCallback(
                (id: number) => {
                        const found = items.find((i) => i.id === id);
                        if (found) handleOpenOrder(found);
                },
                [items, handleOpenOrder]
        );

        const handleReview = useCallback((item: MenuItemProp) => {
                setReviewItem({ id: item.id, name: item.nameAr || item.name });
        }, []);

        const hasActiveFilter = search !== '' || activeCategory !== null || activeDietary.length > 0;

        /* r138-exec-2 (J3): نفس مسند إخفاء البحث (<8 أصناف) — يُستخدم أيضاً
           لعرض رقاقة المسح: ?q= من الرابط يُطبَّق دائماً (UrlFilterSync) حتى
           على المنيوهات التي يُخفى فيها صندوق البحث، فكان المنيو مفلتراً بلا
           أداة إلغاء. */
        const hideSearch = items.length < 8;

        /* r126 (P4-W3b / audit F2): 0 أصناف في كل الفئات = منيو فارغ فعلاً —
           «اختر فئة أخرى» هنا تضلّل الزبون (لا توجد فئة أخرى أصلًا). نسخة
           دافئة + CTA تواصل واتساب بدلها. */
        const menuGenuinelyEmpty = items.length === 0;
        const emptyMenuWhatsapp = normalizeWaNumber(restaurantWhatsapp);

        return (
                <>
                        {/* r97-W6: قارئ معلمات URL بلا أي تعليق — انظر تعليق
                            UrlFilterSync أعلاه (لا حاجة لحدّ Suspense إطلاقًا) */}
                        <UrlFilterSync categories={categories} onParams={setUrlState} />

                        {/* Stage H — cinematic featured showcase (addition only; the
                                full grid below stays untouched). Renders nothing when no
                                item is featured.
                                r135: onSelect — البطاقة المميزة كانت معرضًا بصريًا فقط لا
                                يمكن النقر عليه (خسارة تفاعل كبيرة): الآن كل مشهد
                                قابل للنقر/لوحة المفاتيح ويفتح نافذة الطلب مباشرة.
                                P18-W2-c (fold law): على الجوال (<sm) يقف المشهد قبل
                                البحث — عمق الصفحة قبل أول «أضف» أثقل من قانون السرعة؛
                                الطلب لا ينتظر المسرح. المكتب يبقيه كما كان. */}
                        <FeaturedShowcase items={items} onSelect={handleOpenOrder} />

                        <MenuToolbar
                                search={search}
                                onSearchChange={(v) => updateURL({ q: v })}
                                sort={sort}
                                onSortChange={(v) => updateURL({ sort: v })}
                                items={items}
                                onSuggestionClick={handleSuggestionClick}
                                /* r138-exec-2 (J3): القيمة نفسها كمقام واحد (انظر hideSearch أعلاه). */
                                hideSearch={hideSearch}
                                /* r135: فلاتر غذائية (نمط Deliveroo) — تُشتق من بيانات المنيو
                                   وتُخزّن في الرابط؛ الخيارات الميتة لا تظهر. */
                                dietaryOptions={dietaryOptions}
                                activeDietary={activeDietary}
                                onToggleDietary={(tag) =>
                                        updateURL({
                                                diet: activeDietary.includes(tag)
                                                        ? activeDietary.filter((t) => t !== tag)
                                                        : [...activeDietary, tag],
                                        })
                                }
                        />

                        {/* r135-TABLE: شريحة معلومات — تظهر فقط عندما دخل الزبون من
                            كود QR لطاولة محددة؛ صيغة بصرية هادئة (لا تشتت عن المنيو). */}
                        {tableNumber !== null && (
                                <div
                                        className="mb-3 inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1.5 text-xs text-accent-foreground animate-fade-in"
                                        role="status"
                                >
                                        <Armchair className="size-3.5" aria-hidden="true" />
                                        طاولة {toArabicNumber(tableNumber)} — سيصل طلبك موقّعًا بهذه الطاولة
                                </div>
                        )}

                        {hasActiveFilter && (
                                <div
                                        className="flex items-center gap-2 mb-4 text-sm text-muted-foreground animate-fade-in"
                                        /* round88-E1: announce result-count changes politely — a screen
                                           reader user typing in the combobox hears how many items matched
                                           without hunting for the visually-rendered counter. */
                                        aria-live="polite"
                                >
                                        {/* r95: أيقونة النتائج — عائلة اللهب الأسطع */}
                                        <AnimatedSparkles className="size-3.5 text-accent-foreground" aria-hidden="true" />
                                        <span>
                                                {filteredItems.length === 0
                                                        ? 'لا توجد نتائج'
                                                        : `عُثر على ${foundItemsPhrase(filteredItems.length)}`}
                                        </span>
                                        {/* r138-exec-2 (J3): بحث نشط من الرابط وصندوق البحث مخفي
                                            (<8 أصناف) — لا يوجد صندوق يعرض النص ولا زر مسح؛
                                            رقاقة «بحث: النص ×» بنمط رقاقتي الفئة/الحمية نفسه
                                            (قبل: منيو مفلتر بلا تفسير ولا أداة إلغاء). */}
                                        {hideSearch && search !== '' && (
                                                <button
                                                        type="button"
                                                        onClick={() => updateURL({ q: '' })}
                                                        /* نفس aria-label لزر المسح في MenuToolbar (r120 U8-F-3) —
                                                           لا يجتمعان أبداً: الرقاقة تُعرض فقط حين الصندوق مخفي. */
                                                        aria-label="مسح البحث"
                                                        className="relative inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm bg-primary/10 text-accent-foreground hover:bg-primary/20 transition-colors before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']"
                                                >
                                                        بحث: <span className="max-w-[40vw] truncate">{search}</span>
                                                        <AnimatedX className="size-3 shrink-0" aria-hidden="true" />
                                                </button>
                                        )}
                                        {activeCategory !== null && (
                                                <button
                                                        type="button"
                                                        onClick={() => updateURL({ cat: null })}
                                                        /* r125 (11-b): هدف لمس ٤٤px — الحشوة المرئية ظلّت مضغوطة
                                                           (py-1 ≈ 26px) لكن الطبقة before تمدّد مساحة النقر
                                                           ±10px عموديًا (نمط منطقة النقر دون تضخيم الصف). */
                                                        className="relative text-xs px-2.5 py-1 rounded-sm bg-primary/10 text-accent-foreground hover:bg-primary/20 transition-colors before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']"
                                                >
                                                        إعادة تعيين الفئة
                                                </button>
                                        )}
                                        {activeDietary.length > 0 && (
                                                <button
                                                        type="button"
                                                        onClick={() => updateURL({ diet: [] })}
                                                        className="relative text-xs px-2.5 py-1 rounded-sm bg-primary/10 text-accent-foreground hover:bg-primary/20 transition-colors before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']"
                                                >
                                                        إزالة الفلاتر الغذائية
                                                </button>
                                        )}
                                </div>
                        )}

                        <CategoryTabs
                                categories={categories}
                                activeCategory={activeCategory}
                                onSelect={(id) => updateURL({ cat: id })}
                                itemCounts={itemCounts}
                        />

                        {/* Popular grid — r97-W6: نظام دخول موحّد CSS animate-reveal
                                (كان framer fadeUp مزدوجًا مع دخول البطاقة نفسها ويحتاج JS):
                                يعمل بلا JS، لا دخول مزدوج، وLCP أسرع (البطاقة بلا initial
                                مخفي في الـHTML الخام) — نفس نظام الشبكة العادية أدناه. */}
                        {popularItems.length >= 2 && (
                                /* r125 (11-b): دخول القسم — rise-in (تحويل فقط، مرئي من
                                   أول رسم — عقيدة r120) على رأس القسم قبل تدرّج البطاقات. */
                                <section id="menu-popular" className="mb-6 md:mb-8 animate-rise-in">
                                        <div className="flex items-center gap-2 mb-2 md:mb-3 px-1">
                                                <span className="size-2 rounded-full bg-orange animate-pulse" aria-hidden="true" />
                                                <h2 className="text-sm font-semibold text-foreground">الأكثر طلباً</h2>
                                        </div>
                                        {/* r145 (15-SM P1): grid-cols-1 صريحة — بدونها يبقى العمود
                                           الواحد تحت sm ضمنيًا بحجم auto فيتضخم إلى max-content
                                           لأوسع بطاقة (وكان 480px من بديل عرض contain-intrinsic-size
                                           للأصناف المتخطّاة) فيفيض العمود عن الحاوية 358px على 390.
                                           minmax(0,1fr) الصريح يُلزِم العمود بعرض الحاوية.
                                           P18-W2-c (fold law): على الجوال شريط مضغوط — سطران فقط
                                           (max-sm:hidden من السطر الثالث) + فجوة 3: أول بطاقة فئة
                                           يصبح أقرب بكثير من ياقى قانون 1.2 طاقة العرض. */}
                                        <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {popularVisible.map((item, index) => (
                                                        <div
                                                                key={item.id}
                                                                /* W2-c2 (recovery fix): كان sm:hidden — يخفي السطور
                                                                   ٣-٦ على كل ≥640 أيضًا وينقض «المكتب يبقي الستة».
                                                                   max-sm:hidden = الجوال فقط. */
                                                                className={cn('animate-reveal', index >= 2 && 'max-sm:hidden')}
                                                                style={{ animationDelay: `${(index % 6) * 60}ms` }}
                                                        >
                                                                <MenuItemCard
                                                                        item={item}
                                                                        onOrder={handleOpenOrder}
                                                                        onAddToCart={handleQuickAdd}
                                                                        onDecrementCart={handleDecrement}
                                                                        onReview={handleReview}
                                                                        cartQty={getCartQty(item.id)}
                                                                        variant="featured"
                                                                        /* LCP: first 4 popular items above the fold → eager + fetchPriority=high */
                                                                        eager={index < 4}
                                                                />
                                                        </div>
                                                ))}
                                        </div>
                                </section>
                        )}

                        {/* Normal grid */}
                        {normalItems.length === 0 ? (
                                /* round88-E3: unified EmptyState (icon + friendly copy + action)
                                   replaces the hand-rolled glass-card variant — same texts, same
                                   reset CTA, one shared visual language across all surfaces.
                                   r126 (P4-W3b / audit F2): الحالة الفارغة تتميّز الآن — بحث بلا
                                   نتائج / فئة فارغة داخل منيو حيّ / منيو فارغ فعلاً (0 أصناف)،
                                   لكلٍّ نسخته وCTA الخاص به. */
                                <div className="glass-card rounded-sm">
                                        <EmptyState
                                                icon={search ? SearchX : menuGenuinelyEmpty ? ChefHat : UtensilsCrossed}
                                                title={
                                                        search
                                                                ? 'لا توجد أصناف تطابق بحثك'
                                                                : menuGenuinelyEmpty
                                                                  ? 'قائمتنا قيد التحضير'
                                                                  : 'لا توجد أصناف في هذه الفئة'
                                                }
                                                description={
                                                        search
                                                                ? 'جرب كلمات بحث أخرى'
                                                                : menuGenuinelyEmpty
                                                                  ? 'نجهّز لك أشهى الأطباق، وستظهر هنا فور جاهزيتها — تواصل معنا لأي استفسار'
                                                                  : 'اختر فئة أخرى'
                                                }
                                                action={
                                                        !search && menuGenuinelyEmpty && emptyMenuWhatsapp ? (
                                                                /* r126 (P4-W3b): قناة التواصل الوحيدة المضمونة للمطعم —
                                                                   wa.me على الرقم المطهّر (نمط r103-F8 في MenuHero:
                                                                   رقم غير صالح لا يُصيّر رابطًا ميتًا أبدًا). */
                                                                <a
                                                                        href={`https://wa.me/${emptyMenuWhatsapp}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        /* r133 (A10): brightness hover + stacked ring retired — the orange Button hover
   spelling (bg-orange/95) and the ONE global :focus-visible outline. */
className="inline-flex items-center gap-2 text-sm min-h-11 px-4 py-2 rounded-sm bg-orange text-orange-foreground hover:bg-orange/95 transition-[background-color]"
                                                                >
                                                                        <MessageCircle className="size-4" aria-hidden="true" />
                                                                        تواصل معنا عبر واتساب
                                                                </a>
                                                        ) : hasActiveFilter ? (
                                                                <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                                /* r135: يصفر كل شيء — بحث وفئة وفلاتر غذائية */
                                                                                updateURL({ q: '', cat: null, diet: [] });
                                                                        }}
                                                                        /* r125 (11-b): min-h-11 — زر المال في حالة الفراغ كان
                                                                           py-2 (36px) تحت حدّ ٤٤px للّمس على الجوال. */
                                                                        className="text-sm min-h-11 px-4 py-2 rounded-sm bg-orange text-orange-foreground hover:bg-orange/95 transition-[background-color]"
                                                                >
                                                                        عرض الكل
                                                                </button>
                                                        ) : undefined
                                                }
                                        />
                                </div>
                        ) : (
                                /* r145 (15-SM P1): grid-cols-1 صريحة — نفس عقيدة الشبكة الشعبية
                                   أعلاه: العمود الواحد تحت sm لا يُترك ضمنيًا (auto track يلتقط
                                   أوسع max-content — 480px من بديل عرض contain-intrinsic-size —
                                   فيفيض عن الحاوية 358px على 390). */
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {/* r120 (U9-P3): عمود رابع للشاشات الكبيرة (كانت 3 أعمدة
                                                ثابتة من 1024 حتى 1920+ بهوامش ميتة). */}
                                        {normalItems.map((item, index) => (
                                                <div
                                                        key={item.id}
                                                        className="animate-reveal"
                                                        /* r138-d (F3): قفزة العرض للبطاقات تحت الطية — الخطة المدفوعة
                                                           تسمح بمنيوهات ضخمة (حتى 9999 صنفًا) وكل شيء يُرسم دفعة
                                                           واحدة اليوم (SSR + flight + DOM). content-visibility:auto
                                                           يمنع المتصفح من حساب رسم/تخطيط البطاقات خارج الشاشة،
                                                           وcontain-intrinsic-size يرسم عنصرًا بديلًا بارتفاع تقريبي
                                                           (auto = يتذكر المتصفح الارتفاع الحقيقي بعد أول رسم).
                                                           من البطاقة 8 فصاعدًا فقط — ما فوقها مرشح LCP/أول لقطة.
                                                           r145 (15-SM P1): البديل كان «auto 480px» بقيمتين — أي
                                                           أن 480 كان يصف عرضًا وارتفاعًا معًا، وبديل العرض 480
                                                           كان ينتفخ به العمود الضمني تحت sm (شبكة بلا قالب صريح
                                                           كانت تحسب العمود من max-content). الآن العرض
                                                           بديله 0 (المسار محسوم بـgrid-cols-1) والارتفاع وحده
                                                           auto 480px كما كان. */
                                                        style={index >= 8 ? {
                                                                animationDelay: `${(index % 6) * 60}ms`,
                                                                contentVisibility: 'auto',
                                                                containIntrinsicSize: '0 auto 480px',
                                                        } : { animationDelay: `${(index % 6) * 60}ms` }}
                                                >
                                                        <MenuItemCard
                                                                item={item}
                                                                onOrder={handleOpenOrder}
                                                                onAddToCart={handleQuickAdd}
                                                                onDecrementCart={handleDecrement}
                                                                onReview={handleReview}
                                                                cartQty={getCartQty(item.id)}
                                                                /* LCP: no popular section → first 4 normal items are above the fold */
                                                                eager={popularVisible.length === 0 && index < 4}
                                                        />
                                                </div>
                                        ))}
                                </div>
                        )}

                        {/* 17-SM: بوابات التركيب عند الفتح — بلا بوابة كان الـdynamic
                            يجلب الشريحتين عند الترطيب لأن المكوّن كان يُرندر دائمًا */}
                        {orderDialogMounted && (
                                <OrderDialog
                                        item={orderItem}
                                        open={orderItem !== null}
                                        onOpenChange={(open) => {
                                                if (!open) setOrderItem(null);
                                        }}
                                        restaurantWhatsapp={restaurantWhatsapp}
                                        restaurantName={restaurantName}
                                        restaurantId={restaurantId}
                                        restaurantLogo={restaurantLogo}
                                        deliveryFee={deliveryFee}
                                />
                        )}

                        {/* Shared reviews dialog — single instance for all cards (a11y + DOM size) */}
                        {reviewSheetMounted && (
                                <ReviewSheet
                                        menuItemId={reviewItem?.id ?? 0}
                                        menuItemName={reviewItem?.name ?? ''}
                                        open={reviewItem !== null}
                                        onOpenChange={(o) => {
                                                if (!o) setReviewItem(null);
                                        }}
                                />
                        )}

                        {/* r110-F11: تأكيد صريح قبل إفراغ سلة مطعم آخر — انظر CartSwitchDialog */}
                        <CartSwitchDialog
                                pending={pendingCartSwitch?.info ?? null}
                                onConfirm={() => {
                                        const p = pendingCartSwitch;
                                        setPendingCartSwitch(null);
                                        p?.action();
                                }}
                                onCancel={() => setPendingCartSwitch(null)}
                        />
                </>
        );
}
