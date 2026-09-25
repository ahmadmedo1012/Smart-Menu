import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, Alert, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Search, ShoppingCart, Plus, Minus, X, ShoppingBag, AlertCircle, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
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
import type { RootNavigation } from "@/navigation/types";

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
  const { slug, ref } = (route.params || {}) as { slug?: string; ref?: string };

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  const cartItems = useCart((s) => s.items);

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

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      // r119-B2-M (S8 P1-3): the legacy fallback chain is GONE. It called
      // /api/restaurants/slug/[slug] — a route that does not exist (the [id]
      // handler Number()s the slug into a NaN 400) — and then /api/restaurants
      // (staff-only: 401/403 for the anonymous QR diner, swallowed by
      // .catch(() => [])), degrading every public-menu failure (429 rate
      // limit, transient 5xx, offline) into the misleading «المطعم غير موجود»
      // error screen. The public menu endpoint is now the single source; its
      // real error message surfaces through the ErrorState + retry below
      // (the r103-N2 hoisted-load pattern).
      const pub = await api.get<{ restaurant: RestaurantInfo; categories: MenuCategory[]; items: MenuItem[] }>(
        `/api/public/menu/${slug}`,
      );
      const r = pub.restaurant;
      setRestaurant(r);
      const activeCats = pub.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(activeCats);
      setItems(pub.items);
      if (activeCats.length > 0) setActiveCategory(activeCats[0].id);
      // Static accessor: zustand actions are identity-stable, so this needs
      // no dependency-array entry and can never go stale.
      useCart.getState().setRestaurantDetails(r.id, r.whatsapp || r.phone, r.name);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل المنيو"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

  const filteredItems = items.filter((it) => {
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
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <ErrorState message={error ?? "تعذّر تحميل المنيو"} onRetry={load} />
      </SafeAreaView>
    );
  }

  const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0);
  const subtotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ConnectivityBanner />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1f1813" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", backgroundColor: "#1f1813" }}>
            {restaurant.logo ? <OptimizedImage uri={restaurant.logo} style={{ width: "100%", height: "100%" }} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>{restaurant.name}</Text>
            {restaurant.description ? <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a", marginTop: 2 }} numberOfLines={1}>{restaurant.description}</Text> : null}
          </View>
          <Pressable onPress={() => setCartOpen(true)} style={{ position: "relative", padding: 8 }} accessibilityLabel="عرض السلة">
            <ShoppingCart size={24} color="#ebe7e2" />
            {cartCount > 0 ? (
              <View style={{ position: "absolute", top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Cairo", fontWeight: "700" }}>{toArabicNumber(cartCount)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#070503", borderRadius: 8, paddingHorizontal: 12, height: 40 }}>
          <Search size={16} color="#9c948a" />
          <TextInput placeholder="ابحث عن صنف..." placeholderTextColor="#9c948a" value={search} onChangeText={setSearch} style={{ flex: 1, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 14 }} />
        </View>
      </View>

      {categories.length > 0 ? (
        <View style={{ paddingVertical: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {categories.map((c) => {
              const active = activeCategory === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCategory(active ? null : c.id)}
                  style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: active ? "#bc4700" : "#070503", borderWidth: 1, borderColor: active ? "#bc4700" : "#1f1813" }}>
                  <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#9c948a" }}>{c.nameAr || c.name || "فئة"}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <FlashList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={120}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            onPress={() => setDetailItem(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bc4700" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState title="لا توجد أصناف" description="جرّب فئة أخرى أو ابحث بكلمة مختلفة" icon={<ShoppingBag size={32} color="#9c948a" />} />}
      />

      {cartCount > 0 && !cartOpen && !detailItem ? (
        <View style={{ position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 50 }}>
          <Pressable
            onPress={() => setCartOpen(true)}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#bc4700", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
              opacity: pressed ? 0.9 : 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
            })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Cairo", fontSize: 14, fontWeight: "700" }}>{toArabicNumber(cartCount)} صنف</Text>
            </View>
            <Text style={{ color: "#fff", fontFamily: "Cairo", fontSize: 14, fontWeight: "700" }}>{formatPrice(subtotal)}</Text>
          </Pressable>
        </View>
      ) : null}

      {cartOpen ? <CartSheet restaurant={restaurant} onDone={(orderNo, waUrl) => { setCartOpen(false); navigation.navigate("OrderConfirmed", { orderId: orderNo, waUrl }); }} onClose={() => setCartOpen(false)} /> : null}

      {detailItem ? <ItemDetailSheet item={detailItem} restaurant={restaurant} onClose={() => setDetailItem(null)} /> : null}
    </SafeAreaView>
  );
}

const MenuItemCard = ({ item, onPress }: { item: MenuItem; onPress: () => void }) => {
  const price = item.discountedPrice ?? item.price;
  const groups = visibleModifierGroups(item.modifierGroups);
  return (
    <Pressable
      onPress={onPress}
      disabled={!item.isAvailable}
      accessibilityLabel={`تفاصيل ${item.nameAr || item.name}`}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#070503",
        borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1f1813",
        opacity: item.isAvailable ? (pressed ? 0.9 : 1) : 0.5,
      })}>
      {item.image ? (
        <View style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", backgroundColor: "#1f1813" }}>
          <OptimizedImage uri={item.image} style={{ width: "100%", height: "100%" }} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, fontWeight: "600", color: "#ebe7e2" }} numberOfLines={1}>{item.nameAr || item.name}</Text>
        {item.description ? <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", marginTop: 2 }} numberOfLines={2}>{item.description}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 14, fontWeight: "700", color: "#bc4700" }}>{formatPrice(price)}</Text>
          {/* r119-B2-M (S12 QW5): sold-out text badge — a dimmed card alone left
              diners wondering WHY an item was untappable; the API payload already
              carries isAvailable (same field the dimming uses). */}
          {!item.isAvailable ? (
            <View style={{ backgroundColor: "#e62b3424", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 10, color: "#e62b34" }}>نفدت الكمية</Text>
            </View>
          ) : groups.length > 0 ? (
            <View style={{ backgroundColor: "#1f1813", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 10, color: "#9c948a" }}>خيارات</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center" }}>
        <Plus size={18} color="#fff" />
      </View>
    </Pressable>
  );
};

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
    onClose();
  };

  // r120 (U6-#2): زر الرجوع كان يطفئ شاشة المنيو تحت الورقة — الآن يغلق الورقة أولًا.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 100 }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق تفاصيل الصنف" />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#070503", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%", padding: 16, borderWidth: 1, borderColor: "#1f1813" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2", flex: 1 }} numberOfLines={1}>{item.nameAr || item.name}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="إغلاق"><X size={20} color="#9c948a" /></Pressable>
        </View>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {item.description ? (
            <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", lineHeight: 20, marginBottom: 12 }}>{item.description}</Text>
          ) : null}
          {modError ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#e62b3424", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#e62b3455" }}>
              <AlertCircle size={16} color="#e62b34" />
              <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#e62b34", flex: 1 }}>{modError.message}</Text>
            </View>
          ) : null}
          {groups.map((g) => {
            const groupName = g.nameAr || g.name;
            return (
              <View key={g.id} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontFamily: "Cairo", fontSize: 14, fontWeight: "700", color: "#ebe7e2" }}>{groupName}</Text>
                  <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a" }}>
                    {modifierGroupHint(g)}{g.maxSelect > 1 ? ` · المحدد ${toArabicNumber(selectedCount(selection, g.id))}/${toArabicNumber(g.maxSelect)}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {g.options.map((o) => {
                    const selected = (selection[g.id] ?? []).includes(o.id);
                    const disabled = isOptionDisabled(g, selection, o.id);
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => setSelection((prev) => toggleModifierOption(groups, prev, g.id, o.id))}
                        disabled={disabled}
                        accessibilityLabel={`${o.nameAr || o.name}${o.priceDelta > 0 ? ` بإضافة ${formatPrice(o.priceDelta)}` : ""}`}
                        accessibilityState={{ selected, disabled }}
                        hitSlop={6}
                        style={{
                          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                          backgroundColor: selected ? "#bc4700" : "#010000",
                          borderWidth: 1, borderColor: selected ? "#bc4700" : disabled ? "#1f1813" : "#1f1813",
                          opacity: disabled ? 0.4 : 1,
                        }}>
                        <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "600", color: selected ? "#fff" : "#ebe7e2" }}>
                          {o.nameAr || o.name}{o.priceDelta > 0 ? ` (+${formatPrice(o.priceDelta)})` : o.priceDelta < 0 ? ` (${formatPrice(o.priceDelta)})` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
          <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "700", color: "#ebe7e2", marginBottom: 8 }}>ملاحظات على الصنف (اختياري)</Text>
          <TextInput
            placeholder="مثال: بدون بصل..."
            placeholderTextColor="#9c948a"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ minHeight: 72, borderRadius: 8, borderWidth: 1, borderColor: "#1f1813", backgroundColor: "#010000", paddingHorizontal: 12, paddingVertical: 8, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 13, textAlignVertical: "top", marginBottom: 8 }}
          />
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} accessibilityLabel="إنقاص الكمية" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1f1813", alignItems: "center", justifyContent: "center", opacity: quantity <= 1 ? 0.4 : 1 }}>
              <Minus size={16} color="#ebe7e2" />
            </Pressable>
            <Text style={{ fontFamily: "Cairo", fontSize: 16, fontWeight: "700", color: "#ebe7e2", minWidth: 28, textAlign: "center" }}>{toArabicNumber(quantity)}</Text>
            <Pressable onPress={() => setQuantity((q) => Math.min(MAX_ITEM_QUANTITY, q + 1))} disabled={quantity >= MAX_ITEM_QUANTITY} accessibilityLabel="زيادة الكمية" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center", opacity: quantity >= MAX_ITEM_QUANTITY ? 0.4 : 1 }}>
              <Plus size={16} color="#fff" />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Button title={`أضف إلى السلة · ${formatPrice(unit * quantity)}`} onPress={onAdd} size="lg" className="w-full" />
          </View>
        </View>
      </View>
    </View>
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
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

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
      onDone(res.orderNo, waOpenFailed ? waUrl : undefined);
      if (waOpenFailed) {
        toast.error("تم تسجيل طلبك — تعذّر فتح واتساب تلقائيًا، جرّب زر الإرسال في شاشة التأكيد");
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "فشل إرسال الطلب"));
    } finally {
      setSubmitting(false);
    }
  };

  const pickupLabels: Record<typeof pickupType, string> = { inside: "داخل المطعم", takeaway: "سفري", delivery: "توصيل" };

  // r120 (U6-#2): زر الرجوع يغلق السلة بدل إطفاء شاشة المنيو تحتها.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 100 }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#070503", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", padding: 16, borderWidth: 1, borderColor: "#1f1813" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>السلة</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="إغلاق السلة"><X size={20} color="#9c948a" /></Pressable>
        </View>
        {/* r120 (U6-#3): راية التراجع — المخزن كان يملك removeItem/undoRemove
            بلا أي واجهة؛ الحذف كان بالإنقاص حتى الصفر بصمت وبلا استرجاع. */}
        {lastRemoved ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1f1813", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
            <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a", flex: 1 }} numberOfLines={1}>تم حذف «{lastRemoved.name}»</Text>
            <Pressable onPress={cart.undoRemove} hitSlop={8} accessibilityLabel="تراجع عن الحذف">
              <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "700", color: "#df5a00" }}>تراجع</Text>
            </Pressable>
          </View>
        ) : null}
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", paddingVertical: 24 }}>السلة فارغة</Text>
          ) : (
            items.map((i) => (
              <View key={i.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f1813" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: "#ebe7e2" }} numberOfLines={1}>{i.name}</Text>
                    {i.modifiersSummary ? <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", marginTop: 2 }} numberOfLines={2}>{i.modifiersSummary}</Text> : null}
                    <Text style={{ fontFamily: "ReadexPro", fontSize: 12, color: "#bc4700", marginTop: 4 }}>{formatPrice(i.price)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {/* r120 (U6-#4): 24×24 تحت حد اللمس — 36 مرئي + hitSlop 8 = ≥44 فعليًا. */}
                    <Pressable onPress={() => cart.updateQuantity(i.id, i.quantity - 1)} hitSlop={8} accessibilityLabel={`إنقاص كمية ${i.name}`} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1f1813", alignItems: "center", justifyContent: "center" }}><Minus size={16} color="#ebe7e2" /></Pressable>
                    <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "700", color: "#ebe7e2", minWidth: 20, textAlign: "center" }}>{toArabicNumber(i.quantity)}</Text>
                    <Pressable onPress={() => cart.updateQuantity(i.id, i.quantity + 1)} disabled={i.quantity >= MAX_ITEM_QUANTITY} hitSlop={8} accessibilityLabel={`زيادة كمية ${i.name}`} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center", opacity: i.quantity >= MAX_ITEM_QUANTITY ? 0.4 : 1 }}><Plus size={16} color="#fff" /></Pressable>
                    {/* r120 (U6-#3): حذف مباشر + تراجع (كان الإنقاص حتى الصفر الطريق الوحيد). */}
                    <Pressable onPress={() => cart.removeItem(i.id)} hitSlop={10} accessibilityLabel={`حذف ${i.name} من السلة`} style={{ padding: 6 }}>
                      <Trash2 size={16} color="#9c948a" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        {items.length > 0 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <TextInput placeholder="الاسم" placeholderTextColor="#9c948a" value={customerName} onChangeText={cart.setCustomerName} style={{ height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#1f1813", backgroundColor: "#010000", paddingHorizontal: 12, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 13 }} />
            <TextInput placeholder="رقم الهاتف" placeholderTextColor="#9c948a" value={customerPhone} onChangeText={cart.setCustomerPhone} keyboardType="phone-pad" style={{ height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#1f1813", backgroundColor: "#010000", paddingHorizontal: 12, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 13 }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["inside", "takeaway", "delivery"] as const).map((t) => (
                <Pressable key={t} onPress={() => cart.setPickupType(t)} hitSlop={4} accessibilityLabel={pickupLabels[t]} accessibilityState={{ selected: pickupType === t }} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: pickupType === t ? "#bc4700" : "#1f1813", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "600", color: pickupType === t ? "#fff" : "#9c948a" }}>{pickupLabels[t]}</Text>
                </Pressable>
              ))}
            </View>
            {/* r120 (U6-#1): عنوان إلزامي لتوصيل (بوابة الإرسال أعلاه ترفض الفراغ)
                + ملاحظات عامة على الطلب — تكافئ صفحة السلة في الويب. */}
            {pickupType === "delivery" ? (
              <TextInput
                placeholder="عنوان التوصيل (إلزامي)"
                placeholderTextColor="#df5a00"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                style={{ height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#bc4700", backgroundColor: "#010000", paddingHorizontal: 12, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 13 }}
              />
            ) : null}
            <TextInput
              placeholder="ملاحظات على الطلب (اختياري)"
              placeholderTextColor="#9c948a"
              value={notes}
              onChangeText={cart.setOrderNotes}
              multiline
              style={{ minHeight: 40, borderRadius: 8, borderWidth: 1, borderColor: "#1f1813", backgroundColor: "#010000", paddingHorizontal: 12, paddingVertical: 10, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 13 }}
            />
          </View>
        ) : null}
        {items.length > 0 ? (
          <View style={{ marginTop: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a" }}>المجموع</Text>
              <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#ebe7e2" }}>{formatPrice(subtotal)}</Text>
            </View>
            <Button title={submitting ? "جارٍ الإرسال..." : "إرسال الطلب عبر واتساب"} onPress={onCheckout} loading={submitting} size="lg" className="w-full" />
          </View>
        ) : null}
      </View>
    </View>
  );
}
