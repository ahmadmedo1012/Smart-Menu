'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {Store} from 'lucide-react';
import { MotionMinus } from '@/components/ui/motion-icons';
import { MotionPlus } from '@/components/ui/motion-icons';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedX from '@/components/ui/x-icon';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { MenuItemProp } from './MenuItemCard';
import {
        type ModifierSelection,
        toggleModifierOption,
        validateModifierGroups,
        modifierDelta,
        modifierGroupHint,
        visibleModifierGroups,
        isOptionDisabled,
        unitPriceWithModifiers,
        selectedCount,
        buildModifierPayload,
} from './menu-types';
import { formatPrice, toArabicNumber } from '@/lib/format';
// r121-O-1: canonical pickup labels for the order-type segmented control
import { getPickupTypeMeta } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import { premiumToast } from '@/lib/premium-toast';
import { MAX_ITEM_QUANTITY } from '@/lib/constants';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useCart } from '@/store/cart';

type OrderDialogProps = {
        item: MenuItemProp | null;
        open: boolean;
        onOpenChange: (open: boolean) => void;
        restaurantWhatsapp?: string;
        restaurantName?: string;
        restaurantId: number;
        restaurantLogo?: string;
};

const QUICK_NOTES = ['بدون سكر', 'سكر زيادة', 'بدون ثلج', 'حار', 'بارد', 'بدون بصل'];

export function OrderDialog({
        item,
        open,
        onOpenChange,
        restaurantWhatsapp,
        restaurantName,
        restaurantId,
        restaurantLogo,
}: OrderDialogProps) {
        const [isMobile, setIsMobile] = useState(false);
        useEffect(() => {
                setIsMobile(window.innerWidth < 640);
        }, []);
        const [notes, setNotes] = useState('');
        const [quantity, setQuantity] = useState(1);
        const [submitting, setSubmitting] = useState(false);
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
        const router = useRouter();

        // Clear the whatsapp-redirect timer on unmount so a late navigation can't fire
        useEffect(() => () => {
                if (whatsappTimerRef.current) clearTimeout(whatsappTimerRef.current);
        }, []);

        useEffect(() => {
                if (open) {
                        setNotes('');
                        setQuantity(1);
                        setSubmitting(false);
                        setConfirmed(false);
                        setModSelection({});
                        setModError(null);
                        setOrderType(cartPickupType ?? 'inside');
                        setCustomerName('');
                        setCustomerPhone('');
                }
        }, [open, item?.id, cartPickupType]);

        const handleConfirm = useCallback(() => {
                if (!item) return null;
                if (!restaurantWhatsapp) return;
                // w3-f1: required-group gate BEFORE any cart write — the shared pure
                // validator returns the first unmet group with a ready Arabic reason.
                const groups = visibleModifierGroups(item.modifierGroups);
                const validation = validateModifierGroups(groups, modSelection);
                if (!validation.ok) {
                        setModError({ groupId: validation.groupId, message: validation.message });
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
                        setSubmitting(true);

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
                                if (customerPhone.trim()) s.setCustomerPhone(customerPhone.trim());
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

                        setSubmitting(false);
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
                        setSubmitting(false);
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
                setNotes((prev) => {
                        if (prev.includes(note)) return prev.replace(note, '').replace(/\s+/g, ' ').trim();
                        return prev ? `${prev}، ${note}` : note;
                });
        };

        if (!item) return null;

        const displayName = item.nameAr || item.name;
        /* w3-f1: the live per-unit estimate (base + Σ modifier deltas — mirrors
         * the server math; see the F1-5 comment in handleConfirm). */
        const modGroups = visibleModifierGroups(item.modifierGroups);
        const modDelta = modifierDelta(modGroups, modSelection);
        const unitPrice = unitPriceWithModifiers(item.price, item.discountedPrice, modDelta);
        const totalPrice = unitPrice * quantity;
        const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;

        const glassPillInput =
                'h-11 rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border px-4 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25';
        const glassPillCard = 'rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border';

        const innerContent = (
                <>
                        {/* Screen-reader name — base-ui warns and SR announces bare "dialog" without a Title */}
                        <DialogTitle className="sr-only">{displayName}</DialogTitle>
                        {/* Image header with gradient overlay */}
                        {item.image && (
                                /* r121 (Q-3): على الجوال (الورقة السفلية <sm) كان الرأس h-44 (176px)
                                   يدفع زر «أضف إلى السلة» 50.7px تحت الحافة المرئية عند 375×667
                                   (قياس Q) فيلزم تمرير داخل الورقة قبل رؤية زر المال. تقليص
                                   الرأس للجوال فقط — سطح المكتب (sm:h-52) كما هو. */
                                <div className="relative h-28 sm:h-52 overflow-hidden">
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
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                        <button
                                                type="button"
                                                onClick={() => onOpenChange(false)}
                                                className="absolute top-3 start-3 size-11 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                aria-label="إغلاق"
                                        >
                                                <AnimatedX className="size-4" />
                                        </button>
                                        <div className="absolute bottom-4 end-4 start-16">
                                                <h3 className="text-white font-bold text-xl drop-shadow-lg">{displayName}</h3>
                                        </div>
                                </div>
                        )}

                        {confirmed ? (
                                <div className="p-10 text-center animate-scale-in">
                                        <div className="size-20 rounded-2xl bg-glass-bg/60 backdrop-blur-sm border border-glass-border flex items-center justify-center mx-auto mb-4">
                                                {/* decorative backdrop — checkmark lives in the orange circle only */}
                                        </div>
                                        <div className="size-16 rounded-full bg-orange flex items-center justify-center mx-auto -mt-24 mb-6 shadow-lg shadow-orange/30">
                                                <MotionCheck className="size-10 text-orange-foreground" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-1">تمت الإضافة إلى السلة!</h3>
                                        {/* r120 (U5-F-3): الكذبة القديمة «تم إرسال الطلب! جاري تحويلك
                                            إلى واتساب...» كانت توحي بإتمام الطلب بينما الحقيقة إضافة
                                            للسلة → مراجعة → إرسال. الصدق يمنع مغادرة العميل مبكرًا. */}
                                        <p className="text-sm text-muted-foreground">جاري فتح السلة لمراجعة الطلب وإرساله عبر واتساب...</p>
                                </div>
                        ) : (
                                <div className={cn('p-4 sm:p-5 space-y-3 sm:space-y-4', !item.image && 'pt-8')}>
                                        {!item.image && (
                                                <div className="text-center pb-2">
                                                        <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                                                </div>
                                        )}

                                        {/* Restaurant info bar — glass-card */}
                                        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                                                <div className="size-12 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shrink-0 shadow-md">
                                                        {restaurantLogo ? (
                                                                /* round88-A2: box is size-12 (48px) */
                                                                <OptimizedImage
                                                                        src={restaurantLogo}
                                                                        alt=""
                                                                        className="size-full"
                                                                        aspectRatio="square"
                                                                        skeleton={false}
                                                                        sizes="48px"
                                                                />
                                                        ) : (
                                                                <Store className="size-6 text-orange-foreground" />
                                                        )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm">{restaurantName || 'المطعم'}</p>
                                                        <p className="text-xs text-muted-foreground">طلب جديد</p>
                                                </div>
                                                {hasDiscount && (
                                                        /* round80: unified savings semantic — success family (matches
                                                           MenuItemCard's discount badge), destructive stays for errors. */
                                                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                                                                -{toArabicNumber(Math.round((1 - item.discountedPrice! / item.price) * 100))}%
                                                        </span>
                                                )}
                                        </div>

                                        {/* w3-f1 (F1-4/F1-9): modifier groups — rendered under the item's
                                                restaurant bar, BEFORE customer data (choices configure the line;
                                                quantity/notes operate on the configured line). Each group is a
                                                real fieldset/legend; option chips are aria-pressed toggles; the
                                                counter + price changes are announced via aria-live below. */}
                                        {modGroups.length > 0 && (
                                                <div className="space-y-3">
                                                        {modGroups.map((g) => {
                                                                const groupName = g.nameAr || g.name;
                                                                const count = selectedCount(modSelection, g.id);
                                                                const groupError = modError?.groupId === g.id ? modError.message : null;
                                                                return (
                                                                        <fieldset
                                                                                key={g.id}
                                                                                className={cn(glassPillCard, 'p-4')}
                                                                                aria-label={groupName}
                                                                        >
                                                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                                        <div className="min-w-0">
                                                                                                <span className="text-sm font-bold">{groupName}</span>
                                                                                                <span className="text-2xs text-muted-foreground ms-1.5">
                                                                                                        {modifierGroupHint(g)}
                                                                                                </span>
                                                                                        </div>
                                                                                        {/* «المحدد ١/٢» counter — Western digits per app convention */}
                                                                                        {(g.maxSelect > 1 || g.minSelect > 0) && (
                                                                                                <span
                                                                                                        className="shrink-0 text-2xs font-medium tabular-nums text-muted-foreground bg-glass-bg/60 border border-glass-border rounded-full px-2 py-0.5"
                                                                                                >
                                                                                                        المحدد {toArabicNumber(count)}/{toArabicNumber(g.maxSelect)}
                                                                                                </span>
                                                                                        )}
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                        {g.options.map((o) => {
                                                                                                const selected = modSelection[g.id]?.includes(o.id) ?? false;
                                                                                                const disabled = isOptionDisabled(g, modSelection, o.id);
                                                                                                return (
                                                                                                        <button
                                                                                                                key={o.id}
                                                                                                                type="button"
                                                                                                                aria-pressed={selected}
                                                                                                                disabled={disabled}
                                                                                                                onClick={() => {
                                                                                                                        setModError(null);
                                                                                                                        setModSelection((prev) =>
                                                                                                                                toggleModifierOption(modGroups, prev, g.id, o.id)
                                                                                                                        );
                                                                                                                }}
                                                                                                                className={cn(
                                                                                                                        'px-3.5 min-h-11 inline-flex items-center rounded-xl text-xs font-medium border transition-[background-color,border-color,color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                                                        selected
                                                                                                                                /* r95: الشريحة المحددة — نص accent-foreground الأسطع (AA 5.42:1) */
                                                                        ? 'bg-orange/10 border-orange/40 text-accent-foreground'
                                                                                                                                : 'bg-glass-bg/30 border-glass-border text-muted-foreground hover:border-orange/30 hover:text-foreground',
                                                                                                                        // gentle maxSelect ceiling: not-selected options dim at capacity
                                                                                                                        disabled && 'opacity-40 cursor-not-allowed'
                                                                                                                )}
                                                                                                        >
                                                                                                                {o.nameAr || o.name}
                                                                                                                {/* r121 (H-1): سحب decimals:1 من فروق الخيارات — «+2.0» صارت
                                                                                                                    «+2» و«0.25» تبقى «0.25» بدل تدويرها إلى «0.3». */}
                                                                                                                {o.priceDelta !== 0 && (
                                                                                                                        <span
                                                                                                                                className={cn(
                                                                                                                                        'ms-1.5 tabular-nums font-bold',
                                                                                                                                        o.priceDelta > 0 ? 'text-accent-foreground' : 'text-success'
                                                                                                                                )}
                                                                                                                        >
                                                                                                                                {o.priceDelta > 0
                                                                                                                                        ? `+${formatPrice(o.priceDelta, { suffix: '' })}`
                                                                                                                                        : formatPrice(o.priceDelta, { suffix: '' })}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </button>
                                                                                                );
                                                                                        })}
                                                                                </div>
                                                                                {/* F1-6: required-group blocker — role=alert so SR users hear it */}
                                                                                {groupError && (
                                                                                        <p role="alert" className="text-2xs font-medium text-destructive mt-2.5">
                                                                                                {groupError}
                                                                                        </p>
                                                                                )}
                                                                        </fieldset>
                                                                );
                                                        })}
                                                </div>
                                        )}

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
                                                        dir="ltr"
                                                        aria-label="رقم الهاتف"
                                                        className={cn(glassPillInput, 'text-left')}
                                                />
                                        </div>

                                        {/* Quantity selector — glass-card */}
                                        <div className={cn(glassPillCard, 'flex items-center justify-between p-4')}>
                                                <div>
                                                        <span className="text-xs text-muted-foreground">السعر</span>
                                                        <div className="flex items-baseline gap-1.5 mt-0.5">
                                                                {/* w3-f1: unit price INCLUDING selected modifiers (live) */}
                                                                {/* r95: حبر السعر — أسعار الأصناف بعائلة accent-foreground (#df5a00)
                                                                   5.42:1 — كان text-primary (#bc4700) 3.9:1 بلا AA على الزجاج الداكن. */}
                                                                <span className="font-bold text-xl text-accent-foreground tabular-nums">
                                                                        {formatPrice(unitPrice, { suffix: '' })}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">د.ل</span>
                                                        </div>
                                                        {modDelta !== 0 && (
                                                                <p className="text-3xs text-muted-foreground mt-0.5">
                                                                        شامل الخيارات {modDelta > 0 ? '+' : ''}
                                                                        {/* r121 (H-1): عيار العرض الذكي بدل decimals:1. */}
                                                                        {formatPrice(modDelta, { suffix: '' })} د.ل
                                                                </p>
                                                        )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                        <button
                                                                type="button"
                                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                                disabled={quantity <= 1}
                                                                className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-[background-color,border-color,transform,translate,scale,rotate,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                aria-label="إنقاص الكمية"
                                                        >
                                                                <MotionMinus className="size-4" />
                                                        </button>
                                                        <span className="font-bold text-xl min-w-[2.5ch] text-center tabular-nums">
                                                                {toArabicNumber(quantity)}
                                                        </span>
                                                        <button
                                                                type="button"
                                                                onClick={() => setQuantity(Math.min(MAX_ITEM_QUANTITY, quantity + 1))}
                                                                disabled={quantity >= MAX_ITEM_QUANTITY}
                                                                className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-[background-color,border-color,transform,translate,scale,rotate,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                aria-label="زيادة الكمية"
                                                        >
                                                                <MotionPlus className="size-4" />
                                                        </button>
                                                </div>
                                        </div>

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
                                                                        'flex-1 min-h-11 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                        orderType === type
                                                                                ? 'bg-orange text-orange-foreground shadow-md'
                                                                                : 'text-muted-foreground hover:text-foreground'
                                                                )}
                                                        >
                                                                {getPickupTypeMeta(type).label}
                                                        </button>
                                                ))}
                                        </div>

                                        {/* Quick notes — glass-pill chips (multi-select toggles → aria-pressed) */}
                                        <div>
                                                <label className="text-sm font-medium mb-2 block">إضافات</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                        {QUICK_NOTES.map((note) => (
                                                                <button
                                                                        key={note}
                                                                        type="button"
                                                                        aria-pressed={notes.includes(note)}
                                                                        onClick={() => toggleQuickNote(note)}
                                                                        className={cn(
                                                                                'px-3.5 min-h-11 inline-flex items-center rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                notes.includes(note)
                                                                                        /* r95: الشريحة المحددة — نص accent-foreground الأسطع (AA) */
                                                                                ? 'bg-orange/10 border-orange/30 text-accent-foreground'
                                                                                        : 'bg-glass-bg/30 border-glass-border text-muted-foreground hover:border-orange/30 hover:text-foreground'
                                                                        )}
                                                                >
                                                                        {note}
                                                                </button>
                                                        ))}
                                                </div>
                                        </div>

                                        {/* Notes textarea — glass-pill */}
                                        <textarea
                                                id="order-notes"
                                                name="notes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="ملاحظات إضافية للطلب..."
                                                rows={2}
                                                maxLength={500}
                                                aria-label="ملاحظات إضافية"
                                                className={cn(glassPillInput, 'h-auto py-3 resize-none')}
                                        />

                                        {/* Total + WhatsApp — r121-ADV4-1: sticky footer. The whole
                                            sheet scrolls (max-h 94dvh) so a plain CTA sat 44px below
                                            the visible fold at 375×667 (measured). Pinning the money
                                            block to the sheet's bottom edge keeps «أضف إلى السلة»
                                            always visible; -mx/px matches the body padding. */}
                                        <div className="sticky bottom-0 z-10 space-y-3 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-1 glass-strong border-t border-glass-border">
                                                {/* round88-E1 pattern: polite live region announces price changes
                                                        (modifier toggles + quantity) to screen readers */}
                                                <div
                                                        className="flex items-center justify-between pt-0"
                                                        aria-live="polite"
                                                >
                                                        <span className="font-bold text-sm">المجموع</span>
                                                        {/* r95: المجموع — accent-foreground الأسطع (#df5a00) 5.42:1 */}
                                                        <span className="font-bold text-2xl text-accent-foreground tabular-nums">
                                                                {formatPrice(totalPrice, { suffix: '' })}{' '}
                                                                <span className="text-sm font-normal text-muted-foreground">د.ل</span>
                                                        </span>
                                                </div>
                                                {/* r120 (U5-F-3 + U8-F-2): الزر يضيف للسلة (لا يرسل واتساب
                                                    مباشرة) — النص الصادق «أضف إلى السلة». والنص الأبيض على
                                                    أخضر واتساب كان 1.98:1 فقط؛ الأخضر الداكن يعطي 6.15:1. */}
                                                <button
                                                        type="button"
                                                        className="w-full h-12 rounded-xl bg-whatsapp hover:bg-whatsapp-deep shadow-lg shadow-whatsapp/20 text-whatsapp-ink flex items-center justify-center gap-2 text-base font-bold transition-[background-color,transform,translate,scale,rotate,box-shadow] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                        onClick={handleConfirm}
                                                        disabled={submitting || !restaurantWhatsapp}
                                                >
                                                        {submitting ? (
                                                                <span className="flex items-center gap-2">
                                                                        <span className="size-4 rounded-full border-2 border-whatsapp-ink/40 border-t-whatsapp-ink animate-spin" />
                                                                        جاري...
                                                                </span>
                                                        ) : (
                                                                <>
                                                                        <AnimatedMessageCircle className="size-5 text-whatsapp-ink" /> أضف إلى السلة
                                                                </>
                                                        )}
                                                </button>
                                                {!restaurantWhatsapp && (
                                                        <p className="text-2xs text-center text-destructive">
                                                                لم يتم إعداد واتساب بعد للمطعم. يُرجى التواصل مع المطعم مباشرة.
                                                        </p>
                                                )}
                                                <p className="text-2xs text-center text-muted-foreground">
                                                        سيتم فتح السلة لمراجعة الطلب وإرساله عبر واتساب
                                                </p>
                                        </div>
                                </div>
                        )}
                </>
        );

        const sharedProps = {
                open,
                onOpenChange: ((o: boolean) => {
                        if (!o && !submitting) onOpenChange(false);
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
                                showCloseButton={!item?.image}
                        >
                                {innerContent}
                        </SheetContent>
                </Sheet>
        ) : (
                <Dialog {...sharedProps}>
                        <DialogContent
                                className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-2xl glass-strong max-h-[90dvh] overflow-y-auto"
                                showCloseButton={!item?.image}
                        >
                                {innerContent}
                        </DialogContent>
                </Dialog>
        );
}
