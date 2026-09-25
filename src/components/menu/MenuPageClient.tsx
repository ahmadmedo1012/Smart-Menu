'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import { SearchX, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/store/cart';
import { premiumToast } from '@/lib/premium-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { MenuItemCard, type MenuItemProp } from './MenuItemCard';
import { CategoryTabs } from './CategoryTabs';
import { MenuToolbar } from './MenuToolbar';
import { FeaturedShowcase, type FeaturedItem } from './FeaturedShowcase';
import { CartSwitchDialog, willReplaceOtherRestaurantCart, type CartSwitchInfo } from './CartSwitchDialog';
import dynamic from 'next/dynamic';

// round86-B8: 426 + 369 line dialogs load only when opened — they were
// statically imported and shipped in the initial menu-page chunks
const OrderDialog = dynamic(() => import('./OrderDialog').then((m) => ({ default: m.OrderDialog })), { ssr: false });
const ReviewSheet = dynamic(() => import('./ReviewSheet').then((m) => ({ default: m.ReviewSheet })), { ssr: false });
import { toArabicNumber, normalizeArabic } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';

type CategoryProp = { id: number; name: string; nameAr: string | null; icon: string };

const SORT_VALUES = ['default', 'price-asc', 'price-desc', 'name'] as const;
type SortValue = (typeof SORT_VALUES)[number];

function isValidSort(v: string | null): v is SortValue {
        return v !== null && (SORT_VALUES as readonly string[]).includes(v);
}

// r93-W2a (U2): جمع عربي ديناميكي لعدد نتائج التصفية (نمط cartCountPhrase
// من r92-A9) — «تم العثور على صنف واحد / صنفان / 5 أصناف / 12 صنفًا» بدل
// «N صنف» الثابت الذي كان ينكسر عند 2-10. الصفر يُعالج خارج الدالة
// («لا توجد نتائج») لذا لا يحتاج صيغة خاصة هنا. مُصدَّرة ليبثها الاختبار.
export function foundItemsPhrase(count: number): string {
        const noun = getArabicPlural(count, 'صنف', {
                one: 'صنف واحد',
                two: 'صنفان',
                few: 'أصناف',
                many: 'صنفًا',
        });
        return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

/* r97-W6 (منسّق الجولة): قراءة معلمات URL عبر window.location.search + popstate
 * بدل useSearchParams. القراءة القديمة كانت في جذر MenuPageClient فتُضطرّ
 * Next إلى إسقاط الشجرة كلها إلى الـfallback أثناء التوليد الثابت (ISR) — فكان
 * الـHTML الخام يحمل «جاري تحميل المنيو...» بدل البطاقات والأسعار والصور.
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
        onParams: (p: { q: string; cat: number | null; sort: SortValue }) => void;
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
                        onParams({ q, cat, sort });
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
        restaurantName,
        restaurantId,
        restaurantLogo,
}: {
        categories: CategoryProp[];
        items: Array<MenuItemProp & FeaturedItem>;
        restaurantWhatsapp?: string;
        restaurantName?: string;
        restaurantId: number;
        restaurantLogo?: string;
}) {
        /* r97-W6: حالة معلمات URL محلية (كانت قراءة useSearchParams مباشرة —
           انظر UrlFilterSync أعلاه). القيم الافتراضية تعرض المنيو كاملًا في
           SSR؛ الرابط المُعلم يُطبّق فور الماء. */
        const [urlState, setUrlState] = useState<{ q: string; cat: number | null; sort: SortValue }>({
                q: '',
                cat: null,
                sort: 'default',
        });
        const search = urlState.q;
        const activeCategory = urlState.cat;
        const sort = urlState.sort;

        const [orderItem, setOrderItem] = useState<MenuItemProp | null>(null);
        /* a11y: one shared ReviewSheet instance (was mounted per-card — N dialogs in the DOM).
                Fed by onReview from each card; keeps ReviewSheet's own focus trap/restore. */
        const [reviewItem, setReviewItem] = useState<{ id: number; name: string } | null>(null);
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
                (updates: { q?: string; cat?: number | null; sort?: string }) => {
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
                        const qs = p.toString();
                        window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
                        setUrlState((prev) => {
                                const next = { ...prev };
                                if (updates.q !== undefined) next.q = updates.q;
                                if (updates.cat !== undefined) next.cat = updates.cat;
                                if (updates.sort !== undefined)
                                        next.sort = isValidSort(updates.sort) ? updates.sort : 'default';
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
                [guardCartSwitch, performQuickAdd]
        );

        /* r110-F11: فتح نافذة الصنف يمر بنفس الحارس — أفضل من الاعتراض عند
                «تأكيد» النافذة لأن المستخدم لو خيّر المعدلات ثم عرف أن السلة ستُفرغ
                لضاع جهده؛ الاعتراض المبكر أوضح. */
        const handleOpenOrder = useCallback(
                (item: MenuItemProp) => {
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

        /* ── Filtered + sorted items ── */
        const filteredItems = useMemo(() => {
                const result = items.filter((item) => {
                        const q = normalizeArabic(search.trim());
                        const matchesSearch =
                                q === '' ||
                                normalizeArabic(item.nameAr || item.name).includes(q) ||
                                normalizeArabic(item.descriptionAr || item.description).includes(q);
                        const matchesCategory = activeCategory === null || item.categoryId === activeCategory;
                        return matchesSearch && matchesCategory;
                });

                switch (sort) {
                        case 'price-asc':
                                result.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price));
                                break;
                        case 'price-desc':
                                result.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price));
                                break;
                        case 'name':
                                result.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name));
                                break;
                }
                return result;
        }, [items, search, activeCategory, sort]);

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

        const itemCounts = useMemo(() => {
                const counts = new Map<number | null, number>();
                counts.set(null, items.length);
                for (const cat of categories) {
                        counts.set(cat.id, items.filter((i) => i.categoryId === cat.id).length);
                }
                return counts;
        }, [items, categories]);

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

        const hasActiveFilter = search !== '' || activeCategory !== null;

        return (
                <>
                        {/* r97-W6: قارئ معلمات URL بلا أي تعليق — انظر تعليق
                            UrlFilterSync أعلاه (لا حاجة لحدّ Suspense إطلاقًا) */}
                        <UrlFilterSync categories={categories} onParams={setUrlState} />

                        {/* Stage H — cinematic featured showcase (addition only; the
                                full grid below stays untouched). Renders nothing when no
                                item is featured. */}
                        <FeaturedShowcase items={items} />

                        <MenuToolbar
                                search={search}
                                onSearchChange={(v) => updateURL({ q: v })}
                                sort={sort}
                                onSortChange={(v) => updateURL({ sort: v })}
                                items={items}
                                onSuggestionClick={handleSuggestionClick}
                                hideSearch={items.length < 8}
                        />

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
                                                        : `تم العثور على ${foundItemsPhrase(filteredItems.length)}`}
                                        </span>
                                        {activeCategory !== null && (
                                                <button
                                                        type="button"
                                                        onClick={() => updateURL({ cat: null })}
                                                        className="text-xs px-2.5 py-1 rounded-sm bg-primary/10 text-accent-foreground hover:bg-primary/20 transition-colors"
                                                >
                                                        إعادة تعيين
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
                                <section id="menu-popular" className="mb-8">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                                <span className="size-2 rounded-full bg-orange animate-pulse" aria-hidden="true" />
                                                <h2 className="text-sm font-semibold text-foreground">الأكثر طلباً</h2>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {popularVisible.map((item, index) => (
                                                        <div
                                                                key={item.id}
                                                                className="animate-reveal"
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
                                   reset CTA, one shared visual language across all surfaces. */
                                <div className="glass-card rounded-sm">
                                        <EmptyState
                                                icon={search ? SearchX : UtensilsCrossed}
                                                title={search ? 'لا توجد أصناف تطابق بحثك' : 'لا توجد أصناف في هذه الفئة'}
                                                description={search ? 'جرب كلمات بحث أخرى' : 'اختر فئة أخرى'}
                                                action={
                                                        hasActiveFilter ? (
                                                                <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                                updateURL({ q: '', cat: null });
                                                                        }}
                                                                        className="text-sm px-4 py-2 rounded-sm bg-orange text-white hover:brightness-110 transition-[filter,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                                                >
                                                                        عرض الكل
                                                                </button>
                                                        ) : undefined
                                                }
                                        />
                                </div>
                        ) : (
                                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {/* r120 (U9-P3): عمود رابع للشاشات الكبيرة (كانت 3 أعمدة
                                                ثابتة من 1024 حتى 1920+ بهوامش ميتة). */}
                                        {normalItems.map((item, index) => (
                                                <div
                                                        key={item.id}
                                                        className="animate-reveal"
                                                        style={{ animationDelay: `${(index % 6) * 60}ms` }}
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
                        />

                        {/* Shared reviews dialog — single instance for all cards (a11y + DOM size) */}
                        <ReviewSheet
                                menuItemId={reviewItem?.id ?? 0}
                                menuItemName={reviewItem?.name ?? ''}
                                open={reviewItem !== null}
                                onOpenChange={(o) => {
                                        if (!o) setReviewItem(null);
                                }}
                        />

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
