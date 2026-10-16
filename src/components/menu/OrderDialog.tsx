'use client';

/**
 * 17-DEBT-SM (r147) — خريطة التفكيك (موجة الديون الهندسية):
 * نافذة الطلب كانت 872 سطرًا (أكبر ملف في المستودع). فُصلت الكتل العرضية
 * الحرة إلى وحدات مركزة تحت order-dialog/ (نقل حرفي — لا سلوك جديد):
 *   order-dialog/types.ts            — عقود الخصائص
 *   order-dialog/constants.ts        — QUICK_NOTES/NOTES_MAX/glassPill*
 *   order-dialog/confirmed-block.tsx — شاشة «تمت الإضافة إلى السلة»
 *   order-dialog/item-summary.tsx    — العنوان بلا صورة + الوصف + الحمية
 *   order-dialog/restaurant-bar.tsx  — شريط المطعم + شارة التوفير
 *   order-dialog/modifier-groups.tsx — fieldsets الخيارات (w3-f1)
 *   order-dialog/quantity-card.tsx   — السعر الحيّ + درجتا الكمية
 *   order-dialog/quick-notes.tsx     — شرائح الملاحظات السريعة (r138-J9)
 *   order-dialog/order-notes.tsx     — حقل الملاحظات + العدّاد
 *   order-dialog/sticky-cta.tsx      — المجموع اللاصق + «أضف إلى السلة»
 *
 * جدار المسامير (يبقى هنا عمدًا — مسامير parity/unit تقرأ نص THIS الملف):
 *   tests/design/parity.test.ts r134-W2 #2/#3/#12 → addLockRef/addLockTimerRef
 *   داخل handleConfirm + عقد type/inputMode/autoComplete="tel" + تهيئة
 *   isMobile عبر matchMedia؛ r137 S7 + r139-J7 → deliveryFeeLabelCompact +
 *   whitespace-nowrap في مقسّم نوع الطلب؛ A10 → className زر المقسّم حرفيًا.
 *   tests/unit/r121-cart-ux.test.ts → h-28 sm:h-52 + line-clamp-1/title في
 *   رأس الصورة، قشرة 94dvh للورقة، غلاف p-4 sm:p-5، وجسم toggleQuickNoteValue
 *   (prev.split('،') + تصديره من هذا المسار بالضبط).
 * لذا تبقى هنا: كل منطق الحالة والتأثيرات وhandleConfirm، رأس الصورة، حقول
 * الزبون، مقسّم نوع الطلب، وقشرتا Sheet/Dialog — التركيب والمصدر الوحيد للحالة.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedX from '@/components/ui/x-icon';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { contentLang } from '@/lib/format';
import { normalizeCustomerPhone } from '@/lib/phone';
/* r138-exec-2 (J1): مسند صلاحية الواتساب الموحّد — انظر التعليق عند waValid. */
import { normalizeWaNumber } from '@/lib/whatsapp';
import {
        type ModifierSelection,
        validateModifierGroups,
        modifierDelta,
        visibleModifierGroups,
        unitPriceWithModifiers,
        buildModifierPayload,
        defaultModifierSelection,
} from './menu-types';
// r137: تسمية خيار التوصيل مع الرسوم («التوصيل (5 د.ل رسومًا)»)
import { deliveryFeeLabelCompact } from '@/lib/delivery-meta';
// r121-O-1: canonical pickup labels for the order-type segmented control
import { getPickupTypeMeta } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import { premiumToast } from '@/lib/premium-toast';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useCart } from '@/store/cart';
import type { OrderDialogProps } from './order-dialog/types';
import { glassPillCard, glassPillInput } from './order-dialog/constants';
import { ConfirmedBlock } from './order-dialog/confirmed-block';
import { ItemSummary } from './order-dialog/item-summary';
import { RestaurantBar } from './order-dialog/restaurant-bar';
import { ModifierGroups } from './order-dialog/modifier-groups';
import { QuantityCard } from './order-dialog/quantity-card';
import { QuickNotes } from './order-dialog/quick-notes';
import { OrderNotes } from './order-dialog/order-notes';
import { StickyCta } from './order-dialog/sticky-cta';

/**
 * (r138 — J9 من تدقيق r138-a): تركيب قيمة حقل الملاحظات عند تبديل شريحة
 * ملاحظة سريعة. كان الحذف يستبدل نص الشريحة فقط فيترك الفاصلة العربية
 * معلقة («بدون سكر،» أو «، سكر زيادة») — والنص يسافر هكذا إلى فاتورة
 * واتساب. الآن: تفكيك على الفاصلة، إسقاط الجزء المطابق تمامًا (لا
 * تمزيق لنص حر كتبه الزبون)، ثم لصق بفاصلة+مسافة واحدة — لا فاصلة بلا
 * نص بعدها أبدًا، والتقسيم يشفي أي فاصلة معلقة متبقية من قيمة قديمة.
 * مُصدَّرة ليثبتها الاختبار (سابقة peakOrdersPhrase وcartCountPhrase).
 */
export function toggleQuickNoteValue(prev: string, note: string): string {
        const parts = prev.split('،').map((p) => p.trim()).filter(Boolean);
        const without = parts.filter((p) => p !== note);
        if (without.length !== parts.length) return without.join('، ');
        return parts.length > 0 ? `${parts.join('، ')}، ${note}` : note;
}

export function OrderDialog({
        item,
        open,
        onOpenChange,
        restaurantWhatsapp,
        restaurantName,
        restaurantId,
        restaurantLogo,
        deliveryFee,
}: OrderDialogProps) {
        /* r134-W2 (#12): lazy CSS-media detection — the old useEffect ran AFTER
         * first paint, so mobile users saw the desktop Dialog for one frame
         * before the bottom Sheet swapped in. The initializer is SSR-safe
         * (window guarded) and this dialog only ever mounts OPEN on client
         * interaction (item starts null), so the first real render is already
         * on the correct surface. Tailwind's sm breakpoint = min-width 640px,
         * so NOT sm ⇒ mobile — the exact inverse of the old innerWidth < 640. */
        const [isMobile] = useState(
                () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 640px)').matches
        );
        const [notes, setNotes] = useState('');
        const [quantity, setQuantity] = useState(1);
        /* w3-f1: modifier selection (groupId → selected optionIds, insertion order)
         * + the first unmet-group error from the shared pure validation. */
        const [modSelection, setModSelection] = useState<ModifierSelection>({});
        const [modError, setModError] = useState<{ groupId: number | null; message: string } | null>(null);
        const [orderType, setOrderType] = useState<'inside' | 'delivery' | 'takeaway'>('inside');
        const [customerName, setCustomerName] = useState('');
        const [customerPhone, setCustomerPhone] = useState('');
        const [confirmed, setConfirmed] = useState(false);
        const cartPickupType = useCart((s) => s.pickupType);
        const whatsappTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        /* r134-W2 (#2): double-tap guard on «أضف إلى السلة» — the MenuPageClient
         * H1 twin (addLockRef 400ms). The handler is synchronous, so the old
         * `submitting` flag flipped true→false within one tick and never gated
         * anything: two fast taps added the line TWICE before the 800ms close. */
        const addLockRef = useRef(false);
        const addLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const router = useRouter();

        // Clear the whatsapp-redirect + add-lock release timers on unmount so a
        // late navigation/ref write can't fire
        useEffect(() => () => {
                if (whatsappTimerRef.current) clearTimeout(whatsappTimerRef.current);
                if (addLockTimerRef.current) clearTimeout(addLockTimerRef.current);
        }, []);

        useEffect(() => {
                if (open) {
                        setNotes('');
                        setQuantity(1);
                        setConfirmed(false);
                        /* r135-B (نمط Starbucks): اختيارات مسبقة ذكية — كل مجموعة
                         * إلزامية تُملأ بأرخص الخيارات المتاحة فور الفتح، فيصبح
                         * «أضف إلى السلة» نقرة واحدة. المجموعات الاختيارية تبقى
                         * فارغة — لا إضافة مدفوعة لم يطلبها العميل. */
                        setModSelection(
                                defaultModifierSelection(visibleModifierGroups(item?.modifierGroups))
                        );
                        setModError(null);
                        setOrderType(cartPickupType ?? 'inside');
                        setCustomerName('');
                        setCustomerPhone('');
                }
        }, [open, item, cartPickupType]);

        const handleConfirm = useCallback(() => {
                if (!item) return null;
                /* r138-exec-2 (J1): كان الفحص خامًا truthy فقط — قيمة موجودة لكن
                   غير صالحة كانت تعبر فتصطدم بجدار صفحة السلة. المسند نفسه
                   الموحّد الآن (normalizeWaNumber). */
                if (!normalizeWaNumber(restaurantWhatsapp)) return;
                // r134-W2 (#2): swallow the second tap of a double-tap before any
                // validation/store work — the lock is taken below on the real add
                // path and released after 400ms (MenuPageClient H1 pattern).
                if (addLockRef.current) return;
                // w3-f1: required-group gate BEFORE any cart write — the shared pure
                // validator returns the first unmet group with a ready Arabic reason.
                const groups = visibleModifierGroups(item.modifierGroups);
                const validation = validateModifierGroups(groups, modSelection);
                if (!validation.ok) {
                        setModError({ groupId: validation.groupId, message: validation.message });
                        /* r135-B: تمرير أول مجموعة ناقصة إلى منتصف الشاشة — في قوائم
                         * الإضافات الطويلة قد يكون حقل الخطأ خارج الإطار فلا يفهم
                         * العميل سبب المنع. مع prefers-reduced-motion: قفز فوري.
                         * يرافق رسالة role=alert الموجودة (لا يغني عنها). */
                        if (validation.groupId != null && typeof document !== 'undefined') {
                                document
                                        .getElementById(`mod-group-${validation.groupId}`)
                                        ?.scrollIntoView({
                                                block: 'center',
                                                behavior:
                                                        typeof window !== 'undefined' &&
                                                        window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                                                ? 'auto'
                                                                : 'smooth',
                                        });
                        }
                        return;
                }
                // r127-F2 (Q-4) defense-in-depth: the submit body below talks to the
                // cart store (addItem / updateNotes / setCustomerInfo) and reads back
                // from it — a crash in there used to propagate out of the click
                // handler and take the whole menu page down with it (the 1-in-10
                // blank-menu symptom this dialog is the last unguarded seam of).
                // Contain it: an Arabic error toast, the dialog stays mounted and
                // usable, and the customer can simply retry — the page never dies.
                try {
                        setModError(null);
                        // r134-W2 (#2): the lock rides with the cart write — a validation
                        // failure above never locks (the customer can fix + retry at once),
                        // a store crash keeps the 400ms lock (no hammering a broken seam).
                        addLockRef.current = true;
                        if (addLockTimerRef.current) clearTimeout(addLockTimerRef.current);
                        addLockTimerRef.current = setTimeout(() => {
                                addLockRef.current = false;
                        }, 400);

                        const displayName = item.nameAr || item.name;
                        /* F1-5 — SERVER IS THE ONLY SOURCE OF TRUTH FOR MONEY:
                         * this unit price is a display ESTIMATE that mirrors the server math
                         * (orders/route.ts: eff = discountedPrice ?? price, then + Σ priceDelta,
                         * × quantity). The cart line price and every total derived from it are
                         * informational; POST /api/orders re-prices from its own DB rows and
                         * REJECTS options that do not belong to this item — nothing here is
                         * ever used for validation or persistence. */
                        const unit = unitPriceWithModifiers(
                                item.price,
                                item.discountedPrice,
                                modifierDelta(groups, modSelection)
                        );
                        const { modifierOptionIds, modifiersSummary } = buildModifierPayload(groups, modSelection);
                        const modSignature = modifierOptionIds.join(',');

                        // Sync item to cart store (unified path with MenuPageClient)
                        const addItem = useCart.getState().addItem;
                        const setCustomerInfo = () => {
                                const s = useCart.getState();
                                if (customerName.trim()) s.setCustomerName(customerName.trim());
                                // r136 (ليبي أولاً): طيّ الأرقام الشرقية والفواصل قبل
                                // تخزينها للسلة — القيمة المعروضة في السلة والإيصال
                                // تصبح قابلة للاتصال فوراً (نفس تطبيع المسار الخادمي).
                                const phone = normalizeCustomerPhone(customerPhone);
                                if (phone) s.setCustomerPhone(phone);
                                s.setPickupType(orderType);
                                // r102-W1: notes live on the ITEM line only (updateNotes below).
                                // The previous setOrderNotes(notes.trim()) double-wrote the same
                                // text into order-level notes (duplicated in the WhatsApp receipt)
                                // and — worse — ran UNCONDITIONALLY, so an empty dialog notes
                                // field wiped order notes the user had typed on /cart.
                        };
                        // Add item with quantity matching dialog selection. A configured line
                        // (modifier ids + summary) is carried on EVERY call — the store merges
                        // repeats by itemId + modifier signature, so qty lands on one line.
                        // r103-N3: restaurant meta rides along so a cross-restaurant reset in
                        // the store lands on a fully consistent state (see cart.ts).
                        const preAddCart = useCart.getState();
                        if (
                                preAddCart.items.length > 0 &&
                                preAddCart.restaurantId &&
                                preAddCart.restaurantId !== restaurantId
                        ) {
                                premiumToast('info', 'بدأنا سلة جديدة لهذا المنيو');
                        }
                        for (let i = 0; i < quantity; i++) {
                                addItem({
                                        itemId: item.id,
                                        name: displayName,
                                        price: unit,
                                        image: item.image || undefined,
                                        restaurantId,
                                        restaurantName,
                                        restaurantWhatsapp,
                                        ...(modifierOptionIds.length > 0
                                                ? { modifierOptionIds, modifiersSummary }
                                                : {}),
                                });
                        }
                        // Set notes on THIS configured line (same signature), not any line of the item
                        const cartItem = useCart
                                .getState()
                                .items.find(
                                        (i) => i.itemId === item.id && (i.modifierOptionIds ?? []).join(',') === modSignature
                                );
                        if (cartItem && notes.trim()) {
                                useCart.getState().updateNotes(cartItem.id, notes.trim());
                        }
                        setCustomerInfo();

                        setConfirmed(true);
                        if (whatsappTimerRef.current) clearTimeout(whatsappTimerRef.current);
                        whatsappTimerRef.current = setTimeout(() => {
                                onOpenChange(false);
                                // Redirect to the unified cart page where the user reviews + sends WhatsApp.
                                // r120 (U3-P2-2): router.push بدل window.location — التحميل الكامل كان
                                // يبيّض الشاشة ويعيد جلب كل شيء (أسوأ قياس 6.0s على 3G). السلة تُقرأ
                                // من متجر Zustand عند التركيب — التنقل الداخلي يعطي نفس الحالة النظيفة.
                                router.push('/cart');
                        }, 800);
                } catch {
                        // a store crash must never unmount the menu page — the dialog
                        // recovers in place and the customer can retry (the cart is
                        // server-repriced anyway, so a half-applied line is harmless)
                        premiumToast('error', 'تعذّرت إضافة الطلب إلى السلة', 'حدث خلل غير متوقع — حاول مرة أخرى');
                }
        }, [
                item,
                restaurantWhatsapp,
                restaurantName,
                customerName,
                customerPhone,
                orderType,
                notes,
                quantity,
                modSelection,
                restaurantId,
                onOpenChange,
                router,
        ]);

        const toggleQuickNote = (note: string) => {
                /* (r138 — J9): المنطق النقي في toggleQuickNoteValue أعلى الملف —
                   لا فاصلة معلقة عند أي مسار إضافة/إزالة. */
                setNotes((prev) => toggleQuickNoteValue(prev, note));
        };

        if (!item) return null;

        /* r138-exec-2 (J1): توحيد مسند بوابة الواتساب مع جدار صفحة السلة
           (cart/page.tsx: normalizeWaNumber) والإضافة السريعة (MenuPageClient
           handleQuickAdd) — كان الزر يُفعّل لمجرد وجود نص خام غير صالح فيبني
           الزبون السلة من النافذة ثم يصطدم بالجدار ولا يُحفظ الطلب أبدًا
           (البوابة المبكرة كانت تعمل فقط عند الغياب الكامل). */
        const waValid = normalizeWaNumber(restaurantWhatsapp);
        const displayName = item.nameAr || item.name;
        /* w3-f1: the live per-unit estimate (base + Σ modifier deltas — mirrors
         * the server math; see the F1-5 comment in handleConfirm). */
        const modGroups = visibleModifierGroups(item.modifierGroups);
        const modDelta = modifierDelta(modGroups, modSelection);
        const unitPrice = unitPriceWithModifiers(item.price, item.discountedPrice, modDelta);
        const totalPrice = unitPrice * quantity;

        const innerContent = (
                <>
                        {/* Screen-reader name — base-ui warns and SR announces bare "dialog" without a Title */}
                        <DialogTitle lang={contentLang(item.nameAr)} className="sr-only">{displayName}</DialogTitle>
                        {/* Image header with gradient overlay — P18-W2-c (Banzai P3
                            «product-zoom»): the dish is STAGED, not pasted: (a) the title
                            rides a dedicated bottom scrim band (espresso → transparent)
                            instead of drop-shadow alone — the live contrast defect (white
                            title over a bright coffee photo) is fixed by a surface, not a
                            blur halo; (b) a warm key-light from the top (terracotta radial
                            at 8%) + the macro presentation (taller 4:3 band on desktop)
                            read as zooming INTO the dish. Sheet-on-mobile + all focus/
                            a11y contracts below stay exactly as they were. */}
                        {item.image && (
                                /* r121 (Q-3): على الجوال (الورقة السفلية <sm) كان الرأس h-44 (176px)
                                   يدفع زر «أضف إلى السلة» 50.7px تحت الحافة المرئية عند 375×667
                                   (قياس Q) فيلزم تمرير داخل الورقة قبل رؤية زر المال. تقليص
                                   الرأس للجوال فقط — سطح المكتب (sm:h-52) كما هو. */
                                <div className="relative h-28 sm:h-52 overflow-hidden">
                                        {/* the staged key-light — warm candle over the dish */}
                                        <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(194,69,45,0.08),transparent_60%)]"
                                        />
                                        <OptimizedImage
                                                src={item.image}
                                                alt={displayName}
                                                /* r97-X1: rounded-none — رأس الحوار ممتد لمقصّ DialogContent
                                                   rounded-2xl الذي يعرّف الزوايا العلوية */
                                                className="size-full rounded-none"
                                                aspectRatio="video"
                                                skeleton
                                                /* round88-A2: dialog is sm:max-w-md (448px); header image fills it.
                                                   Old generic sizes fetched 50vw/33vw — undersized on mobile
                                                   (dialog is ~full-width) and over on desktop. Lazy is correct
                                                   here (opens on interaction, never LCP). */
                                                sizes="(max-width: 640px) 100vw, 448px"
                                        />
                                        {/* Phase 5 (r152): warm food-imagery grade — espresso scrim (was cold black). */}
                                        <div className="absolute inset-0 warm-scrim-strong" />
                                        {/* P18-W2-c: the title's own legibility band — a stronger
                                            espresso gradient anchored where the title lives; the
                                            white 21px bold text now sits on a guaranteed ≥4.5:1
                                            surface regardless of the photo beneath. */}
                                        <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,rgb(26_17_12/0.88),rgb(26_17_12/0.42)_60%,transparent)]"
                                        />
                                        {/* P16-4b (Banzai card-over-list → Smart Menu): the close
                                            affordance is TOP-CENTER over the card (Banzai's character
                                            cards) — the list underneath keeps its scroll position
                                            because this is an overlay, never a route change. */}
                                        <button
                                                type="button"
                                                onClick={() => onOpenChange(false)}
                                                /* r138 (P2): الخلفية أسود/45 بدل /30 — الأيقونة
                                                   البيضاء فوق صورة فاتحة كانت 2.10:1 (1.4.11
                                                   للرسوميات) والآن 3.36:1 في أسوأ حالة. */
                                                className="absolute top-3 left-1/2 -translate-x-1/2 size-11 rounded-lg bg-black/45 text-white hover:bg-black/65 backdrop-blur-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                aria-label="إغلاق"
                                        >
                                                <AnimatedX className="size-4" />
                                        </button>
                                        <div className="absolute bottom-4 end-4 start-16">
                                                {/* (r138 — J13 من تدقيق r138-a): الاسم الطويل كان يلتف
                                                    ويلتصق بالحافة السفلية لرأس h-28 القصير على الجوال —
                                                    سطر واحد مقصوص (نفس نمط اسم الصنف في MenuItemCard) مع
                                                    title ليقرأ الزبون الاسم كاملًا عند الوقوف عليه.
                                                    P18-W2-c: بالو (الخط الطهوي) هو صوت عنوان الحوار —
                                                    عقيدة الصوتين P5 — محسومًا على شريط الحبر الجديد. */}
                                                <h3
                                                        lang={contentLang(item.nameAr)}
                                                        title={displayName}
                                                        className="font-display text-2xl font-bold text-white line-clamp-1 drop-shadow-lg"
                                                >
                                                        {displayName}
                                                </h3>
                                        </div>
                                </div>
                        )}

                        {confirmed ? (
                                <ConfirmedBlock />
                        ) : (
                                <div className={cn('p-4 sm:p-5 space-y-3 sm:space-y-4')}>
                                        {/* P16-4b: no-image path gets the same TOP-CENTER close —
                                            a dedicated 44px strip replaces the old corner button
                                            (showCloseButton=false on both shells below). */}
                                        {!item.image && (
                                                <div className="relative h-11 -mt-1">
                                                        <button
                                                                type="button"
                                                                onClick={() => onOpenChange(false)}
                                                                aria-label="إغلاق"
                                                                className="absolute top-0 left-1/2 -translate-x-1/2 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                        >
                                                                <AnimatedX className="size-4" />
                                                        </button>
                                                </div>
                                        )}
                                        <ItemSummary item={item} displayName={displayName} />

                                        {/* Restaurant info bar — glass-card */}
                                        <RestaurantBar
                                                item={item}
                                                restaurantName={restaurantName}
                                                restaurantLogo={restaurantLogo}
                                        />

                                        {/* w3-f1: مجموعات الخيارات — الحالة ملك الأب، والوحدة
                                            تعرضها وتنقر عبر المُغيّرات نفسها (لا منطق جديد). */}
                                        <ModifierGroups
                                                modGroups={modGroups}
                                                modSelection={modSelection}
                                                modError={modError}
                                                setModSelection={setModSelection}
                                                setModError={setModError}
                                        />

                                        {/* Customer info — glass-pill inputs */}
                                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                                <input
                                                        id="customer-name"
                                                        name="customerName"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        placeholder="الاسم (اختياري)"
                                                        maxLength={30}
                                                        aria-label="الاسم"
                                                        className={glassPillInput}
                                                />
                                                <input
                                                        id="customer-phone"
                                                        name="customerPhone"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        placeholder="رقم الهاتف (اختياري)"
                                                        maxLength={15}
                                                        /* r134-W2 (#3): numeric-keyboard + autofill contract — was a bare
                                                           text input, so phones offered the alphabet keyboard and never
                                                           offered the saved number. */
                                                        type="tel"
                                                        inputMode="tel"
                                                        autoComplete="tel"
                                                        dir="ltr"
                                                        aria-label="رقم الهاتف"
                                                        className={cn(glassPillInput, 'text-left')}
                                                />
                                        </div>

                                        {/* Quantity selector — glass-card */}
                                        <QuantityCard
                                                unitPrice={unitPrice}
                                                modDelta={modDelta}
                                                quantity={quantity}
                                                setQuantity={setQuantity}
                                        />

                                        {/* Order type — segmented with bg-orange active (single-select → radio group).
                                                a11y (APG radiogroup): roving tabindex + ArrowLeft/Right/Up/Down moves
                                                selection. In RTL the LEFT arrow advances forward (visual order matches
                                                DOM order here), so both left/down = next and right/up = previous. */}
                                        <div
                                                role="radiogroup"
                                                aria-label="نوع الطلب"
                                                className={cn(glassPillCard, 'flex p-1 gap-1')}
                                                onKeyDown={(e) => {
                                                        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                                                        e.preventDefault();
                                                        const types = ['inside', 'delivery', 'takeaway'] as const;
                                                        const curIdx = types.indexOf(orderType);
                                                        const delta =
                                                                e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : -1;
                                                        const nextIdx = (curIdx + delta + types.length) % types.length;
                                                        setOrderType(types[nextIdx]);
                                                        const groupEl = e.currentTarget;
                                                        requestAnimationFrame(() => {
                                                                groupEl
                                                                        .querySelector<HTMLButtonElement>(`[data-order-type='${types[nextIdx]}']`)
                                                                        ?.focus();
                                                        });
                                                }}
                                        >
                                                {(['inside', 'delivery', 'takeaway'] as const).map((type) => (
                                                        <button
                                                                key={type}
                                                                type="button"
                                                                role="radio"
                                                                data-order-type={type}
                                                                aria-checked={orderType === type}
                                                                tabIndex={orderType === type ? 0 : -1}
                                                                onClick={() => setOrderType(type)}
                                                                className={cn(
                                                                        'flex-1 min-h-11 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-[color,background-color] whitespace-nowrap px-1',
                                                                        orderType === type
                                                                                ? 'bg-orange text-orange-foreground shadow-md'
                                                                                : 'text-muted-foreground hover:text-foreground'
                                                                )}
                                                        >
                                                                {/* r137: خيار التوصيل يعلن رسومه الصريحة — «التوصيل
                                                                   (5 د.ل رسومًا)» (لا مفاجآت عند الدفع؛ الرسوم
                                                                   تُفرض خادميًا في POST /api/orders). بلا رسوم /
                                                                   ميزة مطفأة: التسمية القانونية كما هي.
                                                                   r139 (J7): الصيغة المضغوطة «توصيل +5 د.ل» داخل
                                                                   المقسّم — الكاملة كانت تكسر تخطيط 360px (التفاف
                                                                   2-3 أسطر)؛ التسمية الكاملة في الملخص والمراجعة. */}
                                                                {type === 'delivery' && deliveryFee != null && deliveryFee > 0
                                                                        ? deliveryFeeLabelCompact(deliveryFee)
                                                                        : getPickupTypeMeta(type).label}
                                                        </button>
                                                ))}
                                        </div>

                                        {/* Quick notes — glass-pill chips (multi-select toggles → aria-pressed) */}
                                        <QuickNotes notes={notes} toggleQuickNote={toggleQuickNote} />

                                        <OrderNotes notes={notes} setNotes={setNotes} />

                                        {/* Total + WhatsApp — التذييل اللاصق للمال: وحدة sticky-cta */}
                                        <StickyCta totalPrice={totalPrice} waValid={waValid} onConfirm={handleConfirm} />
                                </div>
                        )}
                </>
        );

        const sharedProps = {
                open,
                onOpenChange: ((o: boolean) => {
                        if (!o) onOpenChange(false);
                }) as (open: boolean) => void,
        };
        // ponytail: two render paths — CSS approach would need display:none hack, this is cleaner
        return isMobile ? (
                <Sheet {...sharedProps}>
                        <SheetContent
                                side="bottom"
                                /* r121 (Q-3): 94dvh بدل 90dvh — يرفع الحافة المرئية ~27px
                                   على 667px فلا يختفي زر «أضف إلى السلة» عند الفتح الأول. */
                                className="gap-0 p-0 max-h-[94dvh] overflow-y-auto rounded-t-2xl glass-strong"
                                showCloseButton={false}
                        >
                                {innerContent}
                        </SheetContent>
                </Sheet>
        ) : (
                <Dialog {...sharedProps}>
                        <DialogContent
                                className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-2xl glass-strong max-h-[90dvh] overflow-y-auto"
                                showCloseButton={false}
                        >
                                {innerContent}
                        </DialogContent>
                </Dialog>
        );
}
