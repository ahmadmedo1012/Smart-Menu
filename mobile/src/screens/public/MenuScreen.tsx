import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, ScrollView, RefreshControl, TextInput, Alert, BackHandler } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Search, ShoppingCart, Plus, Minus, X, ShoppingBag, AlertCircle, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import Animated from "react-native-reanimated";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { elevation } from "@/theme/elevation";
import { toast } from "@/app/providers";
import { useCart } from "@/store/cart";
import { buildWhatsAppShareUrl, normalizeWaNumber } from "@/lib/whatsapp";
import { buildReceiptMessage } from "@/lib/receipt";
import { getOrCreateCheckoutIdempotencyKey, retireCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { formatPrice, toArabicNumber, normalizeArabic } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "@/lib/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  type ModifierGroupProp, type ModifierSelection,
  visibleModifierGroups, toggleModifierOption, validateModifierGroups,
  modifierDelta, unitPriceWithModifiers, buildModifierPayload,
  isOptionDisabled, modifierGroupHint, selectedCount,
} from "@/lib/menu-types";
import { AppBottomSheet, type AppBottomSheetHandle } from "@/components/shared/AppBottomSheet";
import { DotLeader, DotLeaderRule } from "@/components/DotLeader";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import type { RootNavigation } from "@/navigation/types";

import { Text } from "@/components/ui/Text";
import { colors, pastelFamilies } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { fieldFocusBorderStyle } from "@/components/ui/Input";

interface RestaurantInfo {
  id: number; name: string; slug: string; description: string;
  logo: string; phone: string; whatsapp: string; email: string;
  address: string; workingHours: string; themeColor: string; currency: string;
}
interface MenuCategory { id: number; nameAr: string | null; name: string | null; sortOrder: number; isActive: boolean; }
interface MenuItem {
  id: number; name: string; nameAr: string | null; description: string;
  price: number; discountedPrice: number | null; image: string;
  isAvailable: boolean; isFeatured: boolean; categoryId: number;
  /** r102-M4: served by /api/public/menu/[slug] — same data the web
   * OrderDialog configures its modifier groups from. */
  modifierGroups?: ModifierGroupProp[];
}

/** Same shape the server enforces on the referral claim (REFERRAL_CODE_RE). */
const REFERRAL_RE = /^[A-Z0-9]{6,16}$/;

export function MenuScreen() {
  const route = useRoute();
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const { slug, ref } = (route.params || {}) as { slug?: string; ref?: string };

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  // r131-F10 (fix 7): search-row focus halo state — the field grammar every
  // other mobile input now rides (fieldFocusBorderStyle).
  const [searchFocused, setSearchFocused] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  const cartItems = useCart((s) => s.items);

  // r126-M5 (A6 P1-6): React Query owns the fetch/loading/error state (was
  // hand-rolled useState+useEffect). Also fixes the A6 P2-1 defensive gap:
  // the old `if (!slug) return;` left loading=true forever — an infinite
  // spinner — when Menu mounted without params; now it's a real error state.
  // r119-B2-M (S8 P1-3) still applies: the public menu endpoint is the
  // single source (no legacy fallback chain), and its real error message
  // surfaces through the ErrorState + retry below.
  const { data, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["public-menu", slug],
    enabled: Boolean(slug),
    staleTime: 60_000,
    queryFn: () =>
      api.get<{ restaurant: RestaurantInfo; categories: MenuCategory[]; items: MenuItem[] }>(
        `/api/public/menu/${slug}`,
      ),
  });

  const restaurant = data?.restaurant ?? null;
  // NOTE: no `const items = data?.items ?? []` here — the `?? []` mints a new
  // array identity every render, which would defeat the filteredItems useMemo
  // below (react-hooks/exhaustive-deps caught exactly that). The filter reads
  // data?.items directly and depends on `data` (React Query keeps the result
  // object identity-stable between renders).
  const categories = useMemo(
    () => (data?.categories ?? []).filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  );

  const loading = isPending && Boolean(slug);
  const loadError = !slug ? "رابط المنيو غير صالح" : error ? getErrorMessage(error, "تعذّر تحميل المنيو") : null;

  // r126-M5: keep the cart store's restaurant handshake as a data effect
  // (zustand actions are identity-stable — no dependency entry needed).
  useEffect(() => {
    const r = data?.restaurant;
    if (r) useCart.getState().setRestaurantDetails(r.id, r.whatsapp || r.phone, r.name);
  }, [data]);

  // Default the category filter to the first active category once loaded.
  useEffect(() => {
    if (categories.length > 0) setActiveCategory((prev) => prev ?? categories[0].id);
  }, [categories]);

  // r126-M4 (A6 P1-5): content fade-in, fast rung (160ms).
  const enterFade = useEnterFade();

  // r102-M7: deep-link attribution — the Menu route type carries ref? (r101) but
  // it was never persisted, so ?ref=CODE died on arrival and the checkout's
  // AsyncStorage lookup always found nothing. Store it exactly like the web's
  // ReferralHandler does (localStorage key smartmenu_referral).
  useEffect(() => {
    if (!ref) return;
    const code = ref.toUpperCase();
    if (REFERRAL_RE.test(code)) {
      void AsyncStorage.setItem("smartmenu_referral", code);
    }
  }, [ref]);

  const onRefresh = useCallback(() => { void refetch(); }, [refetch]);

  // r133-F3 (A4 S3): the filter now rides useMemo — it was a plain .filter()
  // recomputed on EVERY render, so each search keystroke (and each cart tick —
  // the screen subscribes to cartItems) rebuilt the array and re-rendered every
  // visible card. Deps are [data, activeCategory, search] (data is the query
  // result — identity-stable between renders).
  const filteredItems = useMemo(() => (data?.items ?? []).filter((it) => {
    if (activeCategory && it.categoryId !== activeCategory) return false;
    if (search.trim()) {
      // r118-B3 (A6 P3-2): web-parity matcher (round88-E1) — the mobile
      // src/lib/format.ts copy of normalizeArabic is byte-identical to the
      // web's (tashkeel/tatweel strip + alef folding أإآ→ا + ى→ي + ة→ه +
      // latin lowercase). The old raw toLowerCase().includes made searching
      // "احمد" miss items stored as "أحمد".
      const q = normalizeArabic(search.trim());
      return (
        normalizeArabic(it.name).includes(q) ||
        normalizeArabic(it.nameAr ?? "").includes(q) ||
        normalizeArabic(it.description).includes(q)
      );
    }
    return true;
  }), [data, activeCategory, search]);

  // r133-F3 (A4 S3): stable open-callback + memoized card + memoized
  // renderItem — FlashList re-renders all visible rows when renderItem's
  // identity changes, and the old inline `() => setDetailItem(item)` lambda
  // guaranteed a new identity per render. The card takes the item itself so
  // one stable callback covers every row.
  const openItem = useCallback((item: MenuItem) => setDetailItem(item), []);
  const renderMenuItem = useCallback(
    ({ item }: { item: MenuItem }) => <MenuItemCard item={item} onPress={openItem} />,
    [openItem],
  );

  if (loading) {
    /* r132-F2b (A4 S1, r131 fleet ruling "skeleton 1200 linear + RM kill"):
       the money path's first paint is a SHAPE skeleton — header + search +
       pills + 4 item-card rows ([64px thumb + two text lines + price row] on
       surface r-12 hairline cards, exactly the MenuItemCard geometry) riding
       the family Skeleton primitive. Was a centered spinner: told the diner
       nothing about the page and made fast networks look slow. */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]} accessibilityLabel="جارٍ تحميل المنيو">
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={48} height={48} borderRadius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={"60%"} height={18} />
              <Skeleton width={"40%"} height={12} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Skeleton width={"100%"} height={44} borderRadius={8} />
        </View>
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
            {[72, 56, 64, 56].map((w, i) => <Skeleton key={i} width={w} height={30} borderRadius={16} />)}
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline }}>
              <Skeleton width={64} height={64} borderRadius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={"55%"} height={14} />
                <Skeleton width={"80%"} height={11} />
                <Skeleton width={60} height={14} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadError || !restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={loadError ?? "تعذّر تحميل المنيو"} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0);
  const subtotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <ConnectivityBanner />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface2 }}>
            {restaurant.logo ? <OptimizedImage uri={restaurant.logo} style={{ width: "100%", height: "100%" }} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink }}>{restaurant.name}</Text>
            {restaurant.description ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{restaurant.description}</Text> : null}
          </View>
          {/* r131-F10 (A2 P1-4): raw Pressable → PressableScale (0.97@80ms)
              — r130's migration covered Buttons/cards only; the header cart
              was a silent tap. hitSlop 4: the 40px visual (24 icon + 8×2 pad)
              clears the 44px floor (fix 5). */}
          <PressableScale onPress={() => setCartOpen(true)} hitSlop={4} style={{ position: "relative", padding: 8 }} accessibilityLabel="عرض السلة">
            <ShoppingCart size={24} color={colors.ink} />
            {cartCount > 0 ? (
              // r130 W2-4 (RTL): end-anchored badge — the web twin's cart
              // badge is `absolute -top-2.5 -end-2.5` (CartSlideOver.tsx:90);
              // physical right:0 put it on the wrong corner in forced-RTL.
              <View style={{ position: "absolute", top: 0, end: 0, minWidth: 18, height: 18, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: colors.onAccent, fontSize: 10, fontFamily: "IBM Plex Sans Arabic", fontWeight: "700", fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(cartCount)}</Text>
              </View>
            ) : null}
          </PressableScale>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {/* r126-M6: minHeight (was height: 40) — the search row grows with
            system font scale instead of clipping the input text. */}
        {/* r131-F10 (fix 7): the search row rides the field-focus halo
            (fieldFocusBorderStyle) — hairline at rest, 2px gold while typing;
            the prefix glyph warms with it. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, minHeight: 44, ...fieldFocusBorderStyle(searchFocused) }}>
          <Search size={16} color={searchFocused ? colors.terracotta : colors.muted} />
          <TextInput placeholder="ابحث عن صنف…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} style={{ flex: 1, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, paddingVertical: 10 }} />
        </View>
      </View>

      {categories.length > 0 ? (
        <View style={{ paddingVertical: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {categories.map((c) => {
              const active = activeCategory === c.id;
              // r131-F10 (A2 P1-4): raw Pressable → PressableScale + the
              // selected state TalkBack/VoiceOver was missing (fix 5);
              // hitSlop 7 lifts the ~30px pill past the 44px floor.
              return (
                <PressableScale
                  key={c.id}
                  onPress={() => setActiveCategory(active ? null : c.id)}
                  hitSlop={7}
                  accessibilityLabel={c.nameAr || c.name || "فئة"}
                  accessibilityState={{ selected: active }}
                  style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: active ? colors.terracotta : colors.surface, borderWidth: 1, borderColor: active ? colors.terracotta : colors.hairline }}>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: active ? colors.onAccent : colors.muted }} maxFontSizeMultiplier={1.4}>{c.nameAr || c.name || "فئة"}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <FlashList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={120}
          renderItem={renderMenuItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.terracotta} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={<EmptyState title="لا توجد أصناف" description="جرّب فئة أخرى أو ابحث بكلمة مختلفة" icon={<ShoppingBag size={24} color={pastelFamilies.grey.deep} />} />}
        />
      </Animated.View>

      {/* r133-F3 (A4 N2): logical start/end replaces the inert physical
          left/right pair — the r131 sweep's standard spelling. */}
      {cartCount > 0 && !cartOpen && !detailItem ? (
        <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16, zIndex: 50 }}>
          {/* r126-M4 (canonical press feedback), r130 W2-4: the register is
              scale 0.97 + opacity, 80/160ms (--press-scale, tokens.css:163;
              was 0.98) — was opacity-only 0.9. Inset-aware bottom (A6 P2-10):
              the old bottom:16 overlapped the Android gesture bar / iOS
              indicator. Metrics ride tabular lining numerals (W2-4). */}
          <PressableScale
            onPress={() => setCartOpen(true)}
            accessibilityLabel={`عرض السلة — ${toArabicNumber(cartCount)} صنف`}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: colors.terracotta, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
              // r132-F2b (A4 N1): the shadow consumes theme/elevation rung 6
              // (the floating-CTA register) instead of hand-rolling twins.
              ...elevation[6],
            }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} color={colors.onAccent} />
              <Text style={{ color: colors.onAccent, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", fontVariant: METRIC_FONT_VARIANT }} maxFontSizeMultiplier={1.4}>{toArabicNumber(cartCount)} صنف</Text>
            </View>
            <Text style={{ color: colors.onAccent, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", fontVariant: METRIC_FONT_VARIANT }} maxFontSizeMultiplier={1.4}>{formatPrice(subtotal)}</Text>
          </PressableScale>
        </View>
      ) : null}

      {cartOpen ? <CartSheet restaurant={restaurant} onDone={(orderNo, waUrl) => { setCartOpen(false); navigation.navigate("OrderConfirmed", { orderId: orderNo, waUrl }); }} onClose={() => setCartOpen(false)} /> : null}

      {detailItem ? <ItemDetailSheet item={detailItem} restaurant={restaurant} onClose={() => setDetailItem(null)} /> : null}
    </SafeAreaView>
  );
}

const MenuItemCard = memo(function MenuItemCard({ item, onPress }: { item: MenuItem; onPress: (item: MenuItem) => void }) {
  // r133-F3 (A4 S3): memo — with a stable onPress (openItem) the card stops
  // re-rendering on every keystroke/cart tick; only its own item identity
  // change (or availability) re-renders it.
  const price = item.discountedPrice ?? item.price;
  const groups = visibleModifierGroups(item.modifierGroups);
  return (
    // r130 W2-4: item CARD → --state-card-pressed-scale 0.99 (tokens.css:248);
    // the price metric rides tabular lining numerals ('tnum'/'lnum').
    <PressableScale
      scaleTo={0.99}
      onPress={() => onPress(item)}
      disabled={!item.isAvailable}
      accessibilityLabel={`تفاصيل ${item.nameAr || item.name}`}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface,
        borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline,
        opacity: item.isAvailable ? 1 : 0.5,
      }}>
      {item.image ? (
        <View style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2 }}>
          <OptimizedImage uri={item.image} style={{ width: "100%", height: "100%" }} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{item.nameAr || item.name}</Text>
        {item.description ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }} numberOfLines={2}>{item.description}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(price)}</Text>
          {/* Phase 6 (P6-2-c): قائد النقاط — the printed-menu dotted leader ties
              the price row together (the web MenuItemCard .menu-leader-rule twin,
              rendered whenever the row carries a badge or runs short). */}
          <DotLeaderRule />
          {/* r119-B2-M (S12 QW5): sold-out text badge — a dimmed card alone left
              diners wondering WHY an item was untappable; the API payload already
              carries isAvailable (same field the dimming uses). */}
          {!item.isAvailable ? (
            <View style={{ backgroundColor: colors.roseSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: colors.rose }}>نفدت الكمية</Text>
            </View>
          ) : groups.length > 0 ? (
            <View style={{ backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: colors.muted }}>خيارات</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" }}>
        <Plus size={18} color={colors.onAccent} />
      </View>
    </PressableScale>
  );
});

/**
 * r102-M4: item detail + modifier configuration — the missing half of customer
 * parity. Web opens OrderDialog (modifier groups, quantity, notes); mobile
 * previously added the raw item on tap with NO way to pick options. This sheet
 * reuses the exact same pure engine the web dialog uses (menu-types.ts) and
 * feeds the cart store's modifier-aware line shape.
 */
function ItemDetailSheet({ item, restaurant, onClose }: { item: MenuItem; restaurant: RestaurantInfo; onClose: () => void }) {
  const groups = visibleModifierGroups(item.modifierGroups);
  const [selection, setSelection] = useState<ModifierSelection>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [modError, setModError] = useState<{ groupId: number | null; message: string } | null>(null);
  // r131-F10 (fix 7): per-item notes focus state — the field halo grammar.
  const [notesFocused, setNotesFocused] = useState(false);
  // r126-M8: imperative handle for the programmatic dismiss (add-to-cart).
  const sheetRef = useRef<AppBottomSheetHandle>(null);

  const delta = modifierDelta(groups, selection);
  const unit = unitPriceWithModifiers(item.price, item.discountedPrice, delta);

  const onAdd = () => {
    const validation = validateModifierGroups(groups, selection);
    if (!validation.ok) {
      setModError({ groupId: validation.groupId, message: validation.message });
      return;
    }
    setModError(null);
    const { modifierOptionIds, modifiersSummary } = buildModifierPayload(groups, selection);
    const displayName = item.nameAr || item.name;
    /* r110-F11 (توازي الويب): إفراغ سلة مطعم آخر فعل إتلافي — كان يتم بصمت
       مع إشعار معلومات واحد بعد الفعل. نفس إصلاح الويب: تأكيد صريح قبل
       الإفراغ يُسمّي المطعمين وعدد الأصناف المفقودة؛ «إلغاء» لا يلمس السلة.
       المتجر يبقى المُنفّذ (نفس شرط الاستبدال) — هذا موافقة مسبقة فقط. */
    const preAdd = useCart.getState();
    if (preAdd.items.length > 0 && preAdd.restaurantId && preAdd.restaurantId !== restaurant.id) {
      const itemCount = preAdd.items.reduce((a, i) => a + i.quantity, 0);
      Alert.alert(
        "تغيير المطعم؟",
        `سلتك الحالية تحتوي ${itemCount === 1 ? "صنفًا واحدًا" : `${itemCount} أصناف`} من «${preAdd.restaurantName || "مطعم آخر"}». إضافة صنف من «${restaurant.name}» ستفرغ السلة الحالية وتبدأ سلة جديدة.`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "متابعة وبدء سلة جديدة", style: "default", onPress: () => performAdd(modifierOptionIds, modifiersSummary, displayName) },
        ],
        { cancelable: true },
      );
      return;
    }
    performAdd(modifierOptionIds, modifiersSummary, displayName);
  };

  /* تنفيذ الإضافة الفعلي (بعد المرور بالحارس أو بموافقة صريحة عليه) —
     نفس نمط الويب: addItem لكل وحدة، والدمج يتم في المتجر بالتوقيع. */
  const performAdd = (modifierOptionIds: number[], modifiersSummary: string | undefined, displayName: string) => {
    for (let i = 0; i < quantity; i++) {
      useCart.getState().addItem({
        itemId: item.id, name: displayName, price: unit,
        image: item.image || undefined, restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantWhatsapp: restaurant.whatsapp || restaurant.phone,
        ...(modifierOptionIds.length > 0 ? { modifierOptionIds, modifiersSummary } : {}),
      });
    }
    const line = useCart.getState().items.find(
      (li) => li.itemId === item.id && (li.modifierOptionIds ?? []).join(",") === modifierOptionIds.join(","),
    );
    if (line && notes.trim()) useCart.getState().updateNotes(line.id, notes.trim());
    toast.success(`أُضيف ${displayName} إلى السلة`);
    // r126-M8: dismiss through the sheet (exit animation) — onClose fires
    // from onDismiss and unmounts this sheet.
    sheetRef.current?.dismiss();
  };

  // r120 (U6-#2): زر الرجوع كان يطفئ شاشة المنيو تحت الورقة — الآن يغلق الورقة أولًا.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { sheetRef.current?.dismiss(); return true; });
    return () => sub.remove();
  }, []);

  return (
    <AppBottomSheet
      ref={sheetRef}
      snapPoints={["72%", "94%"]}
      onClose={onClose}
      header={
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={1}>{item.nameAr || item.name}</Text>
          {/* r131-F10 (A2 P1-4): PressableScale — the overlay close was a
              silent tap (role defaults to "button" from the wrapper). */}
          <PressableScale onPress={() => sheetRef.current?.dismiss()} hitSlop={12} accessibilityLabel="إغلاق تفاصيل الصنف"><X size={20} color={colors.muted} /></PressableScale>
        </View>
      }
      footer={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* r131-F10 (A2 P1-4 + fix 5): PressableScale + hitSlop 4 — the
                36px visual stepper clears the 44px floor (36+8), matching the
                cart-sheet steppers' documented 36+8 recipe below. */}
            <PressableScale onPress={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} hitSlop={4} accessibilityLabel="إنقاص الكمية" style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", opacity: quantity <= 1 ? 0.4 : 1 }}>
              <Minus size={16} color={colors.ink} />
            </PressableScale>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.ink, minWidth: 28, textAlign: "center", fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(quantity)}</Text>
            <PressableScale onPress={() => setQuantity((q) => Math.min(MAX_ITEM_QUANTITY, q + 1))} disabled={quantity >= MAX_ITEM_QUANTITY} hitSlop={4} accessibilityLabel="زيادة الكمية" style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", opacity: quantity >= MAX_ITEM_QUANTITY ? 0.4 : 1 }}>
              <Plus size={16} color={colors.onAccent} />
            </PressableScale>
          </View>
          <View style={{ flex: 1 }}>
            <Button title={`أضف إلى السلة · ${formatPrice(unit * quantity)}`} onPress={onAdd} size="lg" className="w-full" />
          </View>
        </View>
      }
    >
      {/* Phase 6 (P6-2-c): the scrimmed dish hero — the web OrderDialog header
          twin (full-width photo · warm-scrim-STRONG espresso veil · the price
          printed on the veil, cream tnum). Absent images render nothing (the
          header title carries the name; a placeholder photo would be noise). */}
      {item.image ? (
        <View style={{ height: 170, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <OptimizedImage uri={item.image} scrim="strong" style={{ width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", bottom: 12, start: 12, end: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <DotLeader
              style={{ flex: 1, minWidth: 0 }}
              ruleStyle={{ flex: 1, minWidth: 8 }}
              trailing={
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, fontWeight: "700", color: "#F7EFE2", fontVariant: METRIC_FONT_VARIANT }}>
                  {formatPrice(unit)}
                </Text>
              }
            />
          </View>
        </View>
      ) : null}
      {item.description ? (
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 12 }}>{item.description}</Text>
      ) : null}
      {modError ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.roseSoft, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.roseBorder }}>
          <AlertCircle size={16} color={colors.rose} />
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.rose, flex: 1 }}>{modError.message}</Text>
        </View>
      ) : null}
      {groups.map((g) => {
        const groupName = g.nameAr || g.name;
        return (
          <View key={g.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.ink }}>{groupName}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }}>
                {modifierGroupHint(g)}{g.maxSelect > 1 ? ` · المحدد ${toArabicNumber(selectedCount(selection, g.id))}/${toArabicNumber(g.maxSelect)}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {g.options.map((o) => {
                const selected = (selection[g.id] ?? []).includes(o.id);
                const disabled = isOptionDisabled(g, selection, o.id);
                // r131-F10 (A2 P1-4): modifier chips ride PressableScale —
                // ingredient selection was the app's highest-tap silent
                // surface. Role defaults to "button" from the wrapper.
                return (
                  <PressableScale
                    key={o.id}
                    onPress={() => setSelection((prev) => toggleModifierOption(groups, prev, g.id, o.id))}
                    disabled={disabled}
                    accessibilityLabel={`${o.nameAr || o.name}${o.priceDelta > 0 ? ` بإضافة ${formatPrice(o.priceDelta)}` : ""}`}
                    accessibilityState={{ selected, disabled }}
                    hitSlop={6}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: selected ? colors.terracotta : colors.surface2,
                      borderWidth: 1, borderColor: selected ? colors.terracotta : disabled ? colors.hairline : colors.hairline,
                      opacity: disabled ? 0.4 : 1,
                    }}>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: selected ? colors.onAccent : colors.ink, fontVariant: METRIC_FONT_VARIANT }} maxFontSizeMultiplier={1.4}>
                      {/* r133-F3 (A4 N3): the chip's price suffix joins every other
                          price surface on tabular lining numerals (tnum/lnum) — the
                          one money string that still rode proportional digits. */}
                      {o.nameAr || o.name}{o.priceDelta > 0 ? ` (+${formatPrice(o.priceDelta)})` : o.priceDelta < 0 ? ` (${formatPrice(o.priceDelta)})` : ""}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        );
      })}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>ملاحظات على الصنف (اختياري)</Text>
      <TextInput
        placeholder="مثال: بدون بصل…"
        placeholderTextColor={colors.muted}
        value={notes}
        onChangeText={setNotes}
        multiline
        onFocus={() => setNotesFocused(true)}
        onBlur={() => setNotesFocused(false)}
        style={{ minHeight: 72, borderRadius: 8, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 8, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 13, textAlignVertical: "top", ...fieldFocusBorderStyle(notesFocused) }}
      />
    </AppBottomSheet>
  );
}

/** r119-B2-M (S2-P1-1 mobile leg, mirrors web cart/page.tsx r119-S2-P1): the
 * POST /api/orders echo. A fresh 201 returns the re-priced created order —
 * items with the r118-A7-P3 modifier snapshot (modifiersJson) and per-line
 * server prices; the idempotent replay returns only { orderNo, already: true }
 * (no itemization). Prisma Decimal fields serialize as JSON strings — coerce
 * with Number(). */
interface OrderEchoItem {
  quantity: number;
  price: number | string;
  notes?: string | null;
  modifiersJson?: string | null;
  item?: { id: number; name: string; nameAr: string | null } | null;
}

interface OrderEcho {
  id?: number;
  orderNo: string;
  total?: number | string;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  pickupType?: string;
  items?: OrderEchoItem[];
  already?: boolean;
}

function CartSheet({ restaurant, onDone, onClose }: { restaurant: RestaurantInfo; onDone: (orderNo: string, waUrl?: string) => void; onClose: () => void }) {
  const cart = useCart();
  const items = useCart((s) => s.items);
  const customerName = useCart((s) => s.customerName);
  const customerPhone = useCart((s) => s.customerPhone);
  const notes = useCart((s) => s.notes);
  const pickupType = useCart((s) => s.pickupType);
  const [submitting, setSubmitting] = useState(false);
  const lastRemoved = useCart((s) => s.lastRemoved);
  /* r120 (U6-#1 — P1): طلبات التوصيل كانت تُرسل بلا عنوان إطلاقًا (الشيت لا يملك
   * الحقل) فتصل المطعم فاتورة توصيل مستحيلة التنفيذ. mirror الويب: عنوان إلزامي
   * لتوصيل + ملاحظات عامة (setOrderNotes كانت بلا مستدعٍ واحد). */
  const [deliveryAddress, setDeliveryAddress] = useState("");
  // r131-F10 (fix 7): which cart-sheet field holds focus — drives the shared
  // fieldFocusBorderStyle halo on the name/phone/address/notes inputs.
  const [focusedField, setFocusedField] = useState<"name" | "phone" | "address" | "notes" | null>(null);
  const fieldFocus = (f: "name" | "phone" | "address" | "notes") => ({
    onFocus: () => setFocusedField(f),
    onBlur: () => setFocusedField(null),
  });
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  // r126-M8: imperative dismiss + the post-checkout handoff. The sheet
  // animates out FIRST (onDone runs from onDismiss) so the exit motion is
  // visible instead of the sheet vanishing mid-navigation.
  const sheetRef = useRef<AppBottomSheetHandle>(null);
  const pendingDone = useRef<{ orderNo: string; waUrl?: string } | null>(null);

  const onCheckout = async () => {
    if (items.length === 0) return;
    /* r120 (U6-#1): نفس بوابة الويب — توصيل بلا عنوان مرفوض قبل أي طلب شبكة. */
    if (pickupType === "delivery" && !deliveryAddress.trim()) {
      toast.error("يُرجى إدخال عنوان التوصيل قبل إتمام الطلب");
      return;
    }
    setSubmitting(true);
    try {
      const refCode = (await AsyncStorage.getItem("smartmenu_referral")) || undefined;
      // r119-B2-M (S6 P2-2, mirrors the web checkoutKeyRef — r106-N1): ONE
      // idempotency key per cart-submission session, minted lazily and REUSED
      // on every retry. A 15s-timeout POST that actually landed must replay
      // into the server's orderNo dedupe ({already:true}) — NOT mint a new
      // key and create a duplicate order. Retired only on confirmed success
      // (see retireCheckoutIdempotencyKey below); every failure keeps it.
      const idempotencyKey = getOrCreateCheckoutIdempotencyKey();
      /* r120 (U6-#1): العنوان يُركّب في الملاحظات — نفس عقد الويب
       * («العنوان: …») الذي يفهمه أصحاب المطاعم في فاتورة واتساب. */
      const composedNotes = [
        pickupType === "delivery" ? `العنوان: ${deliveryAddress.trim()}` : null,
        notes.trim() || null,
      ].filter(Boolean).join("\n");
      const res = await api.post<OrderEcho>("/api/orders", {
        items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity, notes: i.notes, modifierOptionIds: i.modifierOptionIds })),
        restaurantId: restaurant.id, customerName, customerPhone, notes: composedNotes, pickupType, referralCode: refCode, idempotencyKey,
      }, { mobileClient: true });
      // Confirmed success (fresh 201 OR the inert already:true replay) — retire
      // the key so the NEXT order in this app session mints a fresh one.
      retireCheckoutIdempotencyKey();
      // r119-B2-M (S2-P1-1 mobile leg, mirroring the web r119-B1 fix): the
      // server's re-priced echo is the money truth — the local cart can hold
      // stale prices (owner raised a price between add-to-cart and checkout).
      // Build the WhatsApp receipt from the echo (names, per-line prices incl.
      // discountedPrice + modifier snapshot deltas, stored notes); fall back to
      // the cart ONLY for the inert idempotent replay, whose echo carries no
      // itemization.
      const serverItems = res.items ?? [];
      const receipt = serverItems.length > 0
        ? buildReceiptMessage({
            restaurantName: restaurant.name,
            orderNo: res.orderNo,
            items: serverItems.map((i) => {
              let modifierNames: string[] = [];
              try {
                const mods: unknown = JSON.parse(i.modifiersJson || "[]");
                if (Array.isArray(mods)) {
                  modifierNames = mods
                    .map((m) => (typeof m === "object" && m !== null ? ((m as { nameAr?: string; name?: string }).nameAr || (m as { name?: string }).name || "") : ""))
                    .filter(Boolean);
                }
              } catch {
                /* corrupt snapshot — the receipt keeps the bare item line */
              }
              return {
                name: i.item?.nameAr || i.item?.name || "",
                qty: i.quantity,
                price: Number(i.price),
                // modifier choices ride the notes line (w3-f1 pattern, same as web)
                notes: [...modifierNames, i.notes || undefined].filter(Boolean).join("\n") || undefined,
              };
            }),
            totalPrice: Number(res.total ?? 0),
            notes: res.notes || undefined,
            customerName: res.customerName?.trim() || undefined,
            customerPhone: res.customerPhone?.trim() || undefined,
            pickupType: res.pickupType || pickupType,
          })
        : buildReceiptMessage({
            restaurantName: restaurant.name, orderNo: res.orderNo,
            items: items.map((i) => ({ name: i.modifiersSummary ? `${i.name} (${i.modifiersSummary})` : i.name, qty: i.quantity, price: i.price, notes: i.notes })),
            totalPrice: subtotal, customerName, customerPhone, notes: composedNotes, pickupType,
          });
      const waUrl = buildWhatsAppShareUrl(receipt, normalizeWaNumber(restaurant.whatsapp || restaurant.phone));
      // r103-N4: the order IS placed at this point — a WhatsApp-open failure
      // (no app installed / OS blocked the jump) is NOT an order failure. The
      // old catch showed «فشل إرسال الطلب» (the order succeeded!), kept the
      // cart, and a retry created a DUPLICATE order. Now: clear + confirm + a
      // WhatsApp retry button on the confirmation screen.
      let waOpenFailed = false;
      try { await Linking.openURL(waUrl); } catch { waOpenFailed = true; }
      cart.clearCart();
      // r102-M5: land on the confirmation screen — it existed but was only
      // reachable via deep link; the in-app flow dead-ended after checkout.
      // r126-M8: dismiss (exit animation) — onDone fires from onDismiss.
      pendingDone.current = { orderNo: res.orderNo, waUrl: waOpenFailed ? waUrl : undefined };
      sheetRef.current?.dismiss();
      if (waOpenFailed) {
        toast.error("تم تسجيل طلبك — تعذّر فتح واتساب تلقائيًا، جرّب زر الإرسال في شاشة التأكيد");
      }
    } catch (e: unknown) {
      // r131-F10 (fix 8): fleet error verb — تعذّر (was فشل; the r131 family
      // ruling retires the فشل/تعذر split fleet-wide).
      toast.error(getErrorMessage(e, "تعذّر إرسال الطلب"));
    } finally {
      setSubmitting(false);
    }
  };

  const pickupLabels: Record<typeof pickupType, string> = { inside: "داخل المطعم", takeaway: "سفري", delivery: "توصيل" };

  // r120 (U6-#2): زر الرجوع يغلق السلة بدل إطفاء شاشة المنيو تحتها.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { sheetRef.current?.dismiss(); return true; });
    return () => sub.remove();
  }, []);

  return (
    <AppBottomSheet
      ref={sheetRef}
      snapPoints={["70%", "92%"]}
      onClose={() => {
        // r126-M8: a programmatic dismiss after a successful checkout carries
        // the result; a user dismiss (swipe/backdrop/back/X) is a plain close.
        const pending = pendingDone.current;
        pendingDone.current = null;
        if (pending) onDone(pending.orderNo, pending.waUrl);
        else onClose();
      }}
      header={
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink }}>السلة</Text>
          {/* r131-F10 (A2 P1-4): PressableScale — the cart-sheet close was a
              silent tap. */}
          <PressableScale onPress={() => sheetRef.current?.dismiss()} hitSlop={12} accessibilityLabel="إغلاق السلة"><X size={20} color={colors.muted} /></PressableScale>
        </View>
      }
      footer={
        items.length > 0 ? (
          <View style={{ gap: 8 }}>
            {/* Phase 6: قائد النقاط on the totals row — the printed-menu
                leader ties «المجموع» to its value (the web slide-over total
                .ldr twin). */}
            <DotLeader
              leading={<Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted }}>المجموع</Text>}
              trailing={<Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.ink, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(subtotal)}</Text>}
            />
            <Button title={submitting ? "جارٍ الإرسال…" : "إرسال الطلب عبر واتساب"} variant="whatsapp" onPress={onCheckout} loading={submitting} size="lg" className="w-full" />
          </View>
        ) : null
      }
    >
      {/* r120 (U6-#3): راية التراجع — المخزن كان يملك removeItem/undoRemove
          بلا أي واجهة؛ الحذف كان بالإنقاص حتى الصفر بصمت وبلا استرجاع. */}
      {lastRemoved ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, flex: 1 }} numberOfLines={1}>تم حذف «{lastRemoved.name}»</Text>
          {/* r131-F10 (A2 P1-4 + fix 5): PressableScale + hitSlop 14 — the
              ~17px text link clears the 44px floor. */}
          <PressableScale onPress={cart.undoRemove} hitSlop={14} accessibilityLabel="تراجع عن الحذف">
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "700", color: colors.terracotta }}>تراجع</Text>
          </PressableScale>
        </View>
      ) : null}
      {items.length === 0 ? (
        /* r132-F2b (A4 S8): the in-sheet empty rides the canonical EmptyState
           well (56px grey tile + 18/600) — was 13px muted raw text, the exact
           grammar the fleet ruling "empty = 56 grey / 18/600" retired. */
        <EmptyState
          title="السلة فارغة"
          description="أضف أصنافًا من المنيو لتبدأ الطلب"
          icon={<ShoppingCart size={24} color={pastelFamilies.grey.deep} />}
        />
      ) : (
        items.map((i) => (
          <View key={i.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{i.name}</Text>
                {i.modifiersSummary ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }} numberOfLines={2}>{i.modifiersSummary}</Text> : null}
                {/* Phase 6: قائد النقاط on the cart line — the printed-menu
                    dotted rule ends the line at its price (web cart line twin). */}
                <DotLeader
                  style={{ marginTop: 4 }}
                  ruleStyle={{ flex: 1 }}
                  trailing={<Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(i.price)}</Text>}
                />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {/* r120 (U6-#4): 24×24 تحت حد اللمس — 36 مرئي + hitSlop 8 = ≥44 فعليًا.
                    r131-F10 (A2 P1-4): PressableScale — the money-path steppers
                    were the app's most-tapped silent controls. */}
                <PressableScale onPress={() => cart.updateQuantity(i.id, i.quantity - 1)} hitSlop={8} accessibilityLabel={`إنقاص كمية ${i.name}`} style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}><Minus size={16} color={colors.ink} /></PressableScale>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: colors.ink, minWidth: 20, textAlign: "center", fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(i.quantity)}</Text>
                <PressableScale onPress={() => cart.updateQuantity(i.id, i.quantity + 1)} disabled={i.quantity >= MAX_ITEM_QUANTITY} hitSlop={8} accessibilityLabel={`زيادة كمية ${i.name}`} style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", opacity: i.quantity >= MAX_ITEM_QUANTITY ? 0.4 : 1 }}><Plus size={16} color={colors.onAccent} /></PressableScale>
                {/* r120 (U6-#3): حذف مباشر + تراجع (كان الإنقاص حتى الصفر الطريق الوحيد). */}
                <PressableScale onPress={() => cart.removeItem(i.id)} hitSlop={10} accessibilityLabel={`حذف ${i.name} من السلة`} style={{ padding: 6 }}>
                  <Trash2 size={16} color={colors.muted} />
                </PressableScale>
              </View>
            </View>
          </View>
        ))
      )}
      {items.length > 0 ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <TextInput placeholder="الاسم" placeholderTextColor={colors.muted} value={customerName} onChangeText={cart.setCustomerName} {...fieldFocus("name")} style={{ minHeight: 44, borderRadius: 8, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 13, ...fieldFocusBorderStyle(focusedField === "name") }} />
          <TextInput placeholder="رقم الهاتف" placeholderTextColor={colors.muted} value={customerPhone} onChangeText={cart.setCustomerPhone} keyboardType="phone-pad" {...fieldFocus("phone")} style={{ minHeight: 44, borderRadius: 8, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 13, ...fieldFocusBorderStyle(focusedField === "phone") }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["inside", "takeaway", "delivery"] as const).map((t) => (
              // r131-F10 (A2 P1-4): pickup selectors ride PressableScale (the
              // order-type choice on the money path was a silent tap).
              <PressableScale key={t} onPress={() => cart.setPickupType(t)} hitSlop={4} accessibilityLabel={pickupLabels[t]} accessibilityState={{ selected: pickupType === t }} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: pickupType === t ? colors.terracotta : colors.surface2, alignItems: "center" }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: pickupType === t ? colors.onAccent : colors.muted }} maxFontSizeMultiplier={1.4}>{pickupLabels[t]}</Text>
              </PressableScale>
            ))}
          </View>
          {/* r120 (U6-#1): عنوان إلزامي لتوصيل (بوابة الإرسال أعلاه ترفض الفراغ)
              + ملاحظات عامة على الطلب — تكافئ صفحة السلة في الويب. */}
          {pickupType === "delivery" ? (
            <TextInput
              placeholder="عنوان التوصيل (إلزامي)"
              placeholderTextColor={colors.terracotta}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              {...fieldFocus("address")}
              /* r131-F10 (fix 7): the required-address emphasis keeps its
                 permanent gold border; focus thickens it to the 2px halo. */
              style={{ minHeight: 44, borderRadius: 8, borderWidth: focusedField === "address" ? 2 : 1, borderColor: colors.terracotta, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 13 }}
            />
          ) : null}
          <TextInput
            placeholder="ملاحظات على الطلب (اختياري)"
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={cart.setOrderNotes}
            multiline
            {...fieldFocus("notes")}
            style={{ minHeight: 44, borderRadius: 8, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 13, ...fieldFocusBorderStyle(focusedField === "notes") }}
          />
        </View>
      ) : null}
    </AppBottomSheet>
  );
}
