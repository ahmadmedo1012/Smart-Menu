'use client';

import { useState, useEffect } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { getErrorMessage } from '@/lib/get-error-message';
import { orderSubmitErrorMessage } from './submit-error';
import { normalizeWaNumber, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { useRouter } from 'next/navigation';
import { premiumToast } from '@/lib/premium-toast';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { useCart, useCartHydrated } from '@/store/cart';
import { useRef } from 'react';
import { buildReceiptMessage } from '@/lib/receipt';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { DefaultLoading } from '@/components/shared/DefaultLoading';
import { useCartTotals } from './use-cart-totals';
import { CartLineItem } from './CartLineItem';
import { ReviewDialog } from './ReviewDialog';
import { PickupTypeSelector } from './PickupTypeSelector';
// r135-TABLE: قراءة رقم الطاولة المخزّن من رابط QR للمنيو — انظر lib/table-session.ts
import { readTableNumber } from '@/lib/table-session';
import { CustomerInfoCard } from './CustomerInfoCard';
import { CartSummaryCard } from './CartSummaryCard';
import { CartEmptyState } from './CartEmptyState';
import { CartConfirmedState } from './CartConfirmedState';
import { OrderStepper } from './OrderStepper';
import { CartUndoBanner } from './CartUndoBanner';
import { LoyaltyCard } from './LoyaltyCard';
import { CartPageHeader } from './CartPageHeader';
import { DeliveryAddressField } from './DeliveryAddressField';
// r121-O-1: labels derive from the canonical pickup map (value/icon stay local)
import { PICKUP_TYPE_META } from '@/lib/order-status';
// r137: رسوم التوصيل/الحد الأدنى — الحقيقة المالية الواحدة للواجهة والخادم
import {
        deliveryFeeFor,
        deliveryFeeLabelCompact,
        hasDeliveryFee,
        isBelowMinOrder,
        minOrderMessage,
        type DeliveryMeta,
} from '@/lib/delivery-meta';

const PICKUP_OPTIONS = (['inside', 'takeaway', 'delivery'] as const).map((k) => ({
        value: k,
        label: PICKUP_TYPE_META[k].label,
        icon: k,
}));

export default function CartPage() {
        const router = useRouter();
        const {
                restaurantId,
                items,
                customerName,
                customerPhone,
                notes,
                pickupType,
                restaurantWhatsapp,
                restaurantName,
                updateQuantity,
                removeItem,
                undoRemove,
                lastRemoved,
                setOrderNotes,
                updateNotes,
                setPickupType,
                setCustomerPhone,
                clearCart,
                /* r138-exec-2 (J4): العدّ بالوحدات لا الأسطر — نفس دلالة الشريحة
                   الجانبية (CartSlideOver totalItems)؛ كانت الصفحتان تعرضان
                   رقمين مختلفين لنفس السلة (أسطر مقابل وحدات). */
                totalItems,
        } = useCart();

        const [showPreview, setShowPreview] = useState(false);
        const [isSubmitting, setIsSubmitting] = useState(false);
        // r121 (H-3): بوابة ترطيب السلة — ترتفع فقط بعد انتهاء rehydrate()
        // (CartHydrator في جذر التخطيط). تمنع ومضة «السلة فارغة» الكاذبة
        // عند التحديث الصلب لـ /cart بينما السلة المحفوظة لم تُحمّل بعد
        // (قياس Q: حتى ~2.3 ث تحت خنق المعالج).
        const cartHydrated = useCartHydrated();

        // Empty-cart shortcut: return to THIS restaurant's menu, never a hardcoded
        // one (the old '/menu/al-waha-cafe' link sent every other restaurant's
        // customers to the wrong menu). The slug comes from the same fetch that
        // loads pickup types; until it arrives we simply don't render shortcuts.
        const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
        const [confirmed, setConfirmed] = useState(false);
        const [animateItems, setAnimateItems] = useState(false);
        const [deliveryAddress, setDeliveryAddress] = useState('');
        const [supportedPickupTypes, setSupportedPickupTypes] = useState<string[]>([]);
        const [isFetchingPickupTypes, setIsFetchingPickupTypes] = useState(false);
        const [pickupTypesError, setPickupTypesError] = useState(false);
        const [waError, setWaError] = useState(false);
        /* r137: رسوم التوصيل/الحد الأدنى للمطعم (من نفس جلب أنواع الطلب —
           GET /api/restaurants/[id] العام). null = الميزة مطفأة. */
        const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMeta>({ fee: null, minOrder: null });
        /* r139 (J5): الأصناف التي رفضها الخادم عند الإرسال (نافدة/مخفية) —
           تُوسَم أسطرها بشارة «لم يعد متوفرًا» بدل رحلة صيد في سلة كبيرة.
           حالة عرض عابرة (لا تُحفظ في المتجر): تُصفّى في العرض إلى ما بقي
           في السلة، وتُمسح عند نجاح الإرسال. */
        const [unavailableIds, setUnavailableIds] = useState<number[]>([]);
        const submittingRef = useRef(false);
        // r106-N1 (Next-actions #6, mirroring mobile N4 with a stronger lifecycle):
        // idempotency key for POST /api/orders. Minted once per checkout attempt
        // and REUSED on retry — an ambiguous failure (network cut after the server
        // committed) resubmits the same key and gets the inert {already:true}
        // confirmation instead of a duplicate order. Cleared ONLY after a confirmed
        // success (201 or already:true) so the NEXT order in the same session mints
        // a fresh key — a session-scoped key would alias the second order onto the
        // first's orderNo. Namespaced "W…" (mobile sends "M…").
        const checkoutKeyRef = useRef('');

        // Warn on accidental navigation if cart has items
        useEffect(() => {
                if (items.length === 0 || confirmed) return;
                const handler = (e: BeforeUnloadEvent) => {
                        e.preventDefault();
                };
                window.addEventListener('beforeunload', handler);
                return () => window.removeEventListener('beforeunload', handler);
        }, [items.length, confirmed]);

        // Fetch restaurant's supported pickup types.
        // Reads the latest pickupType through a ref so the effect only re-runs on
        // restaurant change — every tab switch used to fire a redundant fetch +
        // screen-reader announcement, and out-of-order responses could revert the
        // user's fresh selection against a stale `pickupType` closure.
        const loadPickupTypes = () => {
                setIsFetchingPickupTypes(true);
                setPickupTypesError(false);
                fetch(`/api/restaurants/${restaurantId}`)
                        .then((r) => r.json())
                        .then((d) => {
                                const types = d.data?.pickupTypes || '';
                                const all = ['inside', 'takeaway', 'delivery'] as const;
                                const arr = (types ? types.split(',') : [...all]).filter(
                                        (t: string): t is 'inside' | 'takeaway' | 'delivery' => all.some((p) => p === t)
                                );
                                setSupportedPickupTypes(arr);
                                setRestaurantSlug(d.data?.slug ?? null);
                                /* r137: نفس الجلب يحمل وصفَي التوصيل — الرسوم تظهر على
                                   خيار التوصيل وفي الملخص، والحد الأدنى يُبنى بوابة
                                   عربية صادقة. الفرض الخادمي في POST /api/orders هو
                                   الحقيقة دائماً (هذا عرض فقط). */
                                setDeliveryMeta({
                                        fee: typeof d.data?.deliveryFee === 'number' ? d.data.deliveryFee : null,
                                        minOrder: typeof d.data?.minOrder === 'number' ? d.data.minOrder : null,
                                });
                                // Reset pickupType if current selection isn't supported
                                if (!arr.includes(pickupTypeRef.current)) setPickupType(arr[0] || 'takeaway');
                        })
                        .catch(() => {
                                // Visible error state instead of silent fallback — user can retry.
                                setPickupTypesError(true);
                                setSupportedPickupTypes(['inside', 'takeaway', 'delivery']);
                        })
                        .finally(() => setIsFetchingPickupTypes(false));
        };

        const pickupTypeRef = useRef(pickupType);
        useEffect(() => {
                pickupTypeRef.current = pickupType;
        }, [pickupType]);

        useEffect(() => {
                if (!restaurantId) return;
                loadPickupTypes();
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [restaurantId, setPickupType]);

        const filteredPickupOptions = PICKUP_OPTIONS.filter(
                (o) => supportedPickupTypes.length === 0 || supportedPickupTypes.includes(o.value)
        ).map((o) => ({
                ...o,
                /* r137: خيار التوصيل يعلن رسومه الصريحة — «التوصيل (5 د.ل رسومًا)».
                   r139 (J7): الصيغة المضغوطة «توصيل +5 د.ل» داخل الحبة الضيقة —
                   الكاملة كانت تكسر تخطيط 360px؛ الكاملة في ملخص السلة والمراجعة. */
                label:
                        o.value === 'delivery' && hasDeliveryFee(deliveryMeta)
                                ? deliveryFeeLabelCompact(deliveryMeta.fee!)
                                : o.label,
        }));

        useEffect(() => {
                const id = setTimeout(() => setAnimateItems(true), 50);
                return () => clearTimeout(id);
        }, []);

        // r103-N9: `total` left the destructure — the server re-prices; the
        // checkout payload no longer carries client money fields.
        const { subtotal } = useCartTotals(items);

        /* r137: فصل صادق للرسوم — تُضاف بعد المجموع الفرعي (لا تُذاب فيه)،
           والحد الأدنى يقيّم المجموع الفرعي وحده (الرسوم ليست «قيمة سلة»). */
        const deliveryFeeAmount = deliveryFeeFor(pickupType, deliveryMeta);
        const grandTotal = subtotal + deliveryFeeAmount;
        const belowMinOrder = isBelowMinOrder(subtotal, pickupType, deliveryMeta);

        const handleCheckout = async () => {
                if (submittingRef.current) return; // double-click guard
                /* r137: بوابة الحد الأدنى لطلب التوصيل — نمط r120/r121 نفسه: أغلق
                   حوار المراجعة أولاً (التنبيه والتمرير تحته)، والفحص قبل قفل
                   الإرسال كي يبقى الزر صالحاً لإعادة المحاولة. الفرض الخادمي
                   (422 في POST /api/orders) هو الصندوق الأسود لهذه البوابة. */
                if (belowMinOrder) {
                        setShowPreview(false);
                        premiumToast('error', `${minOrderMessage(deliveryMeta.minOrder!)} — أضف أصنافاً أكثر`);
                        const banner = document.getElementById('min-order-error');
                        banner?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        banner?.focus();
                        return;
                }
                // r119-S5-P1-2: a delivery order with an empty address was silently
                // submitted — the restaurant got «العنوان:» with nothing after it and
                // the customer got a call-back hunt. Block at the source with an
                // Arabic toast + focus the field.
                if (pickupType === 'delivery' && !deliveryAddress.trim()) {
                        /* r120 (U5-F-4): الحوار كان يبقى مفتوحًا فوق حقل العنوان الخامل —
                           التنبيه يظهر خلفه والتركيز لا يعمل. أغلق الحوار أولًا. */
                        setShowPreview(false);
                        premiumToast('error', 'يُرجى إدخال عنوان التوصيل قبل إتمام الطلب');
                        document.getElementById('delivery-address')?.focus();
                        setIsSubmitting(false);
                        return;
                }
                const waNumber = normalizeWaNumber(restaurantWhatsapp);
                if (!waNumber) {
                        setWaError(true);
                        premiumToast('error', 'رقم واتساب المطعم غير متوفر. يُرجى التواصل مع المطعم مباشرة.');
                        setIsSubmitting(false);
                        return;
                }
                // r118-A5-F2: defensive budget guard — the composed notes
                // (ملاحظات + العنوان) must stay within the server's 500-char
                // cap. The inputs are capped to fit (120 + 360), but a stale
                // persisted cart/address (older localStorage shape) could still
                // exceed it — block with an actionable message instead of a
                // doomed 422 that names no field.
                // r121 (H-2): كان هذا الفحص داخل الـ try بعد إغلاق قفل الإرسال
                // (submittingRef/isSubmitting) فيعود دون تحريره — يبقى زر
                // الحوار معطلاً بـ «جاري…» نهائياً حتى إعادة تحميل الصفحة.
                // نُقل الفحص قبل القفل كسابقة PaymentDialog (r120): فشل التحقق
                // يجب أن يترك الزر صالحاً لإعادة المحاولة بعد اختصار النص.
                /* r135-TABLE: رقم الطاولة من رابط QR (‎?table=N‎ يلتقطه المنيو ويخزنه
                   في sessionStorage) يُلحق بالملاحظات — طلب «في المطعم» بلا هوية
                   طاولة كان يترك الموظف يسأل «مين الطالب؟» في كل مرة.
                   المنطق في lib/table-session (keeps the r121 source-order pin —
                   لا كتلة try جديدة في هذا الملف). */
                const tableNumber = readTableNumber();
                const composedNotes = [
                        notes,
                        pickupType === 'delivery' ? `العنوان: ${deliveryAddress}` : '',
                        tableNumber !== null ? `طاولة: ${tableNumber}` : '',
                ]
                        .filter(Boolean)
                        .join('\n');
                if (composedNotes.length > 500) {
                        /* r121 (H-2): نفس نمط حارس العنوان (r120 U5-F-4) — أغلق الحوار
                           أولاً حتى يظهر التنبيه ويصل التركيز للحقل المخالف. */
                        setShowPreview(false);
                        premiumToast('error', 'الملاحظات أو عنوان التوصيل طويل جداً — اختصر قليلاً ثم أعد المحاولة');
                        document
                                .getElementById(pickupType === 'delivery' ? 'delivery-address' : 'cart-notes')
                                ?.focus();
                        return;
                }
                submittingRef.current = true;
                setIsSubmitting(true);

                // 1. Save order to DB first
                let orderNo = '';
                // r119-S2-P1: the server's re-priced echo is the money truth — the
                // localStorage cart can hold stale prices (owner raised a price
                // between add-to-cart and checkout) and previously produced a
                // WhatsApp invoice that diverged from the charged DB total.
                let serverEcho: {
                        orderNo?: string;
                        total?: number | string;
                        notes?: string;
                        customerName?: string;
                        customerPhone?: string | null;
                        pickupType?: string;
                        items?: {
                                quantity: number;
                                price: number | string;
                                notes?: string | null;
                                modifiersJson?: string | null;
                                item?: { name?: string; nameAr?: string | null } | null;
                        }[];
                } | undefined;
                try {
                        // round88-C4 — carry the referral code ReferralHandler stored on the
                        // ?ref= visit (progressive enhancement: absent/invalid → the server
                        // simply skips the link; NO discount effect — round-77 guard intact)
                        let referralCode: string | undefined;
                        try {
                                const stored = localStorage.getItem('smartmenu_referral');
                                if (stored && /^[A-Z0-9]{6,16}$/.test(stored)) referralCode = stored;
                        } catch {
                                /* private mode — referral is a progressive enhancement */
                        }
                        if (!checkoutKeyRef.current) {
                                checkoutKeyRef.current = `W${Date.now().toString(36)}${Math.random()
                                        .toString(36)
                                        .slice(2, 8)}`.toUpperCase();
                        }
                        const res = await csrfFetch('/api/orders', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        idempotencyKey: checkoutKeyRef.current,
                                        items: items.map((i) => ({
                                                itemId: i.itemId,
                                                quantity: i.quantity,
                                                notes: i.notes,
                                                // r103-N9 (companion to r102-A5): the order schema drops
                                                // client money fields — the server re-prices every row from
                                                // DB (price + modifiers + ownership + availability). Kept
                                                // intentionally: itemId/quantity/notes/option ids ONLY.
                                                ...(i.modifierOptionIds?.length
                                                        ? { modifierOptionIds: i.modifierOptionIds }
                                                        : {}),
                                        })),
                                        customerName: customerName.trim(),
                                        customerPhone: customerPhone.trim(),
                                        notes: composedNotes,
                                        pickupType,
                                        restaurantId: restaurantId || undefined,
                                        referralCode,
                                }),
                        });
                        if (!res.ok) {
                                // Non-2xx must abort the flow — previously the order was silently
                                // dropped while the customer believed it was placed (verified live).
                                // round90-F4 (M1): read the server's error envelope (the csrfJson
                                // pattern) and map the status to honest customer copy — the old
                                // generic «أعد المحاولة» toast misled plan-cap (403) and
                                // rate-limit (429) customers, where retrying can never succeed.
                                let serverError: unknown;
                                try {
                                        const body = (await res.json()) as {
                                                error?: unknown;
                                                unavailableItemIds?: unknown;
                                        };
                                        serverError = body?.error;
                                        /* r139 (J5): رفض الأصناف النافدة يحمل الـids — وسّم
                                           الأسطر المخالفة فورًا (الشارة تعيش حتى يزيلها
                                           الزبون أو يُعاد الإرسال بنجاح). */
                                        if (
                                                res.status === 400 &&
                                                Array.isArray(body?.unavailableItemIds)
                                        ) {
                                                const ids = body.unavailableItemIds.filter(
                                                        (v): v is number => typeof v === 'number'
                                                );
                                                if (ids.length > 0) setUnavailableIds(ids);
                                        }
                                } catch {
                                        /* non-JSON body (e.g. proxy 403) — status mapping still applies */
                                }
                                throw new Error(orderSubmitErrorMessage(res.status, serverError));
                        }
                        const json = await res.json();
                        orderNo = json.data?.orderNo ?? '';
                        serverEcho = json.data;
                        // r106-N1: confirmed success (fresh 201 OR the inert already:true
                        // replay) — retire the key so the next checkout mints a new one.
                        checkoutKeyRef.current = '';
                        /* r135: مفتاح الإحالة كان يعيش للأبد — الزبون الذي دخل برابط
                           صديقه مرة واحدة كان يحمل الكود في كل طلب لاحق فيُحتسب لصديقه
                           إلى ما لا نهاية. التحويل اكتمل الآن: الطلب حُفظ بالكود — المفتاح
                           يُنظّف فورًا، والزيارة القادمة برابط ‎?ref=‎ جديد تكتب كودًا
                           جديدًا نظيفًا (ReferralHandler يكتب فوق القيمة عند وجودها). */
                        try {
                                localStorage.removeItem('smartmenu_referral');
                        } catch {
                                /* private mode — لا شيء لتنظيفه */
                        }
                } catch (e) {
                        // round90-F4 (M1): the thrown Error already carries the mapped
                        // server message; network failures fall back to the general copy.
                        premiumToast('error', getErrorMessage(e, 'تعذّر إرسال الطلب. يرجى المحاولة مرة أخرى'));
                        setIsSubmitting(false);
                        submittingRef.current = false;
                        return;
                }

                // 2. Send WhatsApp receipt to restaurant on success
                // r119-S2-P1: prefer the SERVER's re-priced echo (names, per-line
                // prices incl. discountedPrice + modifier snapshot deltas, and the
                // stored notes — which already embed the delivery address line from
                // composedNotes). Falls back to the cart ONLY for the inert idempotent
                // replay ({orderNo, already:true}) whose echo carries no itemization.
                const serverItems = serverEcho?.items ?? [];
                const receipt = serverItems.length
                        ? buildReceiptMessage({
                                  restaurantName: restaurantName || 'المطعم',
                                  orderNo: orderNo || undefined,
                                  items: serverItems.map((i) => {
                                          let modifierNames: string[] = [];
                                          try {
                                                  const mods = JSON.parse(i.modifiersJson || '[]');
                                                  if (Array.isArray(mods)) {
                                                          modifierNames = mods
                                                                  .map((m) =>
                                                                          typeof m === 'object' && m !== null
                                                                                  ? m.nameAr || m.name || ''
                                                                                  : ''
                                                                  )
                                                                  .filter(Boolean);
                                                  }
                                          } catch {
                                                  /* corrupt snapshot — receipt keeps the bare item line */
                                          }
                                          return {
                                                  name: i.item?.nameAr || i.item?.name || '',
                                                  qty: i.quantity,
                                                  price: Number(i.price),
                                                  // w3-f1 pattern preserved: modifier choices ride the notes line
                                                  notes:
                                                          [...modifierNames, i.notes || undefined]
                                                                  .filter(Boolean)
                                                                  .join('\n') || undefined,
                                          };
                                  }),
                                  totalPrice: Number(serverEcho?.total ?? 0),
                                  /* r137: سطر الرسوم يفسّر الإجمالي الخادمي (الإجمالي
                                     شاملها — الخادم أضافها في POST /api/orders). */
                                  deliveryFee: deliveryFeeAmount,
                                  notes: serverEcho?.notes || undefined,
                                  customerName: serverEcho?.customerName?.trim() || undefined,
                                  customerPhone: serverEcho?.customerPhone?.trim() || undefined,
                                  pickupType: serverEcho?.pickupType || pickupType,
                          })
                        : buildReceiptMessage({
                                  restaurantName: restaurantName || 'المطعم',
                                  orderNo: orderNo || undefined,
                                  items: items.map((i) => ({
                                          name: i.name,
                                          qty: i.quantity,
                                          price: i.price,
                                          notes: [i.modifiersSummary, i.notes || undefined].filter(Boolean).join('\n') || undefined,
                                  })),
                                  totalPrice: grandTotal,
                                  deliveryFee: deliveryFeeAmount,
                                  notes:
                                          pickupType === 'delivery'
                                                  ? `${notes || ''}\nالعنوان: ${deliveryAddress}`.trim()
                                                  : notes || undefined,
                                  customerName: customerName.trim() || undefined,
                                  customerPhone: customerPhone.trim() || undefined,
                                  pickupType,
                          });
                // r109-F10: stash the FULL receipt (items/totals/address) keyed by
                // orderNo — the order-confirmed fallback button re-sends the itemized
                // invoice instead of the old bare thank-you note. sessionStorage is
                // per-tab: the confirmation page (same tab, router.push) reads it.
                try {
                        sessionStorage.setItem(
                                'smartmenu_last_receipt',
                                JSON.stringify({ orderNo, receipt })
                        );
                } catch {
                        /* private mode — fallback text still works */
                }
                // H4 fix: clear cart immediately after successful order (prevents double-submit on popup-block)
                clearCart();
                /* r139 (J5): وسم النافدين انتهى دوره — الطلب نجح والسلة أُفرغت. */
                setUnavailableIds([]);
                // round97-X3: shared wa.me builder (encodes internally; waNumber is
                // guaranteed non-null here — the checkout guard returned early above).
                window.open(buildWhatsAppShareUrl(receipt, waNumber), '_blank');

                setConfirmed(true);
                setIsSubmitting(false);
                submittingRef.current = false;
                setTimeout(() => {
                        // r95-F1: تمرير سياق المطعم في مسار التأكيد — السلة تُفرّغ قبل فتح
                        // حوار الإحالة فيفقد معرف المطعم فيرسل POST /api/loyalty بلا
                        // restaurantId فيُرفض 400 «معرف المطعم مطلوب» (خلل r93-S1-A).
                        router.push(
                                `/order-confirmed?orderNo=${encodeURIComponent(orderNo)}&wa=${encodeURIComponent(waNumber ?? '')}&rid=${restaurantId || ''}&slug=${encodeURIComponent(restaurantSlug ?? '')}`
                        );
                }, 1500);
        };

        if (items.length === 0 && !confirmed) {
                /* r121 (H-3): قبل اكتمال ترطيب السلة المحفوظة كان هذا الفرع
                   يُرسَل من الخادم نفسه («السلة فارغة») لأن المتجر يبدأ فارغاً
                   مع skipHydration. نرسم هيكل التحميل حتى انتهاء الترطيب —
                   السلة الفارغة فعلاً تُعرض بعدها مباشرة، والسلة الممتلئة لا
                   تومض أبداً. الصفحة noindex (cart/layout.tsx) — لا كلفة SEO،
                   وحارس beforeunload يقرأ المتجر مباشرة فلا يتأثر. */
                if (!cartHydrated) {
                        return (
                                <>
                                        <Header />
                                        <DefaultLoading />
                                </>
                        );
                }
                return (
                        <>
                                <Header />
                                {/* r118-A5-F5: removing the LAST item used to early-return
                                        here — the undo banner was unreachable exactly when it
                                        mattered most (the only removal that empties the cart). */}
                                {lastRemoved && (
                                        <div className="max-w-2xl mx-auto px-4 pt-20">
                                                <CartUndoBanner item={lastRemoved} onUndo={undoRemove} />
                                        </div>
                                )}
                                <CartEmptyState
                                        restaurantId={restaurantId}
                                        restaurantSlug={restaurantSlug}
                                        restaurantName={restaurantName}
                                />
                        </>
                );
        }

        if (confirmed) {
                return (
                        <>
                                <Header />
                                <CartConfirmedState />
                        </>
                );
        }

        return (
                <>
                        <Header />
                        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in pt-20 overflow-x-clip">
                                {/* r138-exec-2 (J4): وحدات لا أسطر — انظر التعليق عند التفكيك أعلاه. */}
                                <CartPageHeader count={totalItems()} />

                                <OrderStepper />

                                <PickupTypeSelector
                                        isFetching={isFetchingPickupTypes}
                                        error={pickupTypesError}
                                        onRetry={loadPickupTypes}
                                        options={filteredPickupOptions}
                                        value={pickupType}
                                        onChange={setPickupType}
                                />

                                {pickupType === 'delivery' && (
                                        <DeliveryAddressField value={deliveryAddress} onChange={setDeliveryAddress} />
                                )}

                                {/* r137: بوابة الحد الأدنى لطلب التوصيل — سلة دون الحد تُعلن
                                    صراحة (لا زر معطل بلا سبب). focusable كي يقود إليه حوار
                                    المراجعة عند محاولة الإرسال (نمط scroll-to-error r135). */}
                                {belowMinOrder && (
                                        <div
                                                id="min-order-error"
                                                role="alert"
                                                tabIndex={-1}
                                                /* r138 (P1-1): danger-ink — كان destructive
                                                   2.77:1 على destructive/10 في الفاتح. */
                                                className="rounded-md bg-destructive/10 border border-destructive/30 p-4 mb-6 text-sm text-danger-ink text-center animate-fade-in focus:outline-none"
                                        >
                                                {minOrderMessage(deliveryMeta.minOrder!)} — أضف أصنافاً أكثر لإتمام طلب التوصيل
                                        </div>
                                )}

                                {/* Cart items */}
                                <div className="space-y-4 mb-8">
                                        {items.map((item, idx) => (
                                                <CartLineItem
                                                        key={item.id}
                                                        item={item}
                                                        index={idx}
                                                        animateItems={animateItems}
                                                        /* r139 (J5): وسم السطر النافد من الخادم — يُصفّى إلى ما
                                                           بقي في السلة (حذف السطر يُخفي الشارة تلقائيًا). */
                                                        unavailable={unavailableIds.includes(item.itemId)}
                                                        onUpdateQuantity={updateQuantity}
                                                        onRemove={removeItem}
                                                        onUpdateNotes={updateNotes}
                                                />
                                        ))}
                                </div>

                                {/* Undo banner — appears after removing an item (outside items.map so it
                                    stays visible once the item is gone) */}
                                {lastRemoved && (
                                        <CartUndoBanner item={lastRemoved} onUndo={undoRemove} />
                                )}

                                {/* Customer info */}
                                <CustomerInfoCard
                                        notes={notes}
                                        phone={customerPhone}
                                        onNotesChange={setOrderNotes}
                                        onPhoneChange={setCustomerPhone}
                                />

                                <CartSummaryCard items={items} total={subtotal} deliveryFee={deliveryFeeAmount} />

                                {/* Loyalty — earn points */}
                                {restaurantId && (
                                        <LoyaltyCard />
                                )}

                                {waError && (
                                        /* r138 (P1-1): danger-ink — كان destructive
                                           2.77:1 على destructive/10 في الفاتح. */
                                        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 mb-6 text-sm text-danger-ink text-center animate-fade-in">
                                                رقم واتساب المطعم غير متوفر. يُرجى التواصل مع المطعم مباشرة.
                                        </div>
                                )}

                                {/* r131 (A2 P2-13 / A12): شريط الدفع السفلي اللاصق — نمط SO checkout:
                                    mobile = fixed + safe-area + سطح ضبابي + حدّ علوي؛ md+ يعود
                                    للسرد العادي. الحاشر يعوّض ارتفاع الشريط على الجوال فقط. */}
                                <div className="h-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:hidden" aria-hidden="true" />
                                <div
                                        className={cn(
                                                /* z-35: تحت نافذة المراجعة (z-40/50 اليوم، --z-modal بعد
                                                   جولة توحيد z) وفوق نطاق الأزرار العائمة (z-30/33) —
                                                   زر الدفع هو مسار المال في هذه الصفحة. */
                                                'fixed bottom-0 inset-x-0 z-35 md:static md:z-auto',
                                                'border-t border-border/60 bg-background/90 backdrop-blur-md safe-area-pb',
                                                'md:border-0 md:bg-transparent md:backdrop-blur-0 animate-slide-up'
                                        )}
                                >
                                        <div className="mx-auto max-w-2xl px-4 py-3 md:px-0 md:py-0 flex items-center gap-3 md:block">
                                                <div className="flex-1 min-w-0 md:hidden">
                                                        <p className="text-2xs text-muted-foreground">المجموع الإجمالي</p>
                                                        <p className="font-heading font-bold text-lg tabular-nums">
                                                                {/* r137: الرسوم مضافة بعد المجموع الفرعي (فصل صادق) */}
                                                                {formatPrice(grandTotal)}
                                                        </p>
                                                </div>
                                                {/* r131 (A2 P1-1): الظلّ الملوّن shadow-lg shadow-orange/20
                                                    أُزيل — وصفة Button البرتقالية تحمل زوج الظلّ الحيادي
                                                    الممتاز + رفع −2px (sheen على الأساسي فقط). */}
                                                <Button
                                                        className="flex-1 md:w-full h-14 text-base font-semibold gap-2"
                                                        onClick={() => setShowPreview(true)}
                                                        size="lg"
                                                        disabled={items.length === 0}
                                                >
                                                        <AnimatedMessageCircle className="size-5" />
                                                        مراجعة الطلب وإرساله
                                                </Button>
                                        </div>
                                </div>

                                <ReviewDialog
                                        open={showPreview}
                                        onOpenChange={setShowPreview}
                                        items={items}
                                        pickupType={pickupType}
                                        notes={notes}
                                        /* r138-exec-2 (J2): يُعرض سطر العنوان في الملخص عند التوصيل. */
                                        deliveryAddress={deliveryAddress}
                                        total={grandTotal}
                                        deliveryFee={deliveryFeeAmount}
                                        isSubmitting={isSubmitting}
                                        onCheckout={handleCheckout}
                                />
                        </div>
                </>
        );
}
