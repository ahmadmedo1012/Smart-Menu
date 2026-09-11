import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRoute } from "@react-navigation/native";
import { Search, ShoppingCart, Plus, Minus, X, ShoppingBag } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { toast } from "@/app/providers";
import { useCart } from "@/store/cart";
import { buildWhatsAppShareUrl, normalizeWaNumber } from "@/lib/whatsapp";
import { buildReceiptMessage } from "@/lib/receipt";
import { formatPrice, toArabicNumber } from "@/lib/format";

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
}

export function MenuScreen() {
  const route = useRoute();
  const { slug } = (route.params || {}) as { slug?: string };

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart();
  const cartItems = useCart((s) => s.items);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      // Primary: the public menu endpoint (unauthenticated-friendly, one
      // round-trip — restaurant + categories + items). Fallback: the legacy
      // per-resource calls (work when the caller happens to be authenticated).
      let r: RestaurantInfo | null = null;
      let cats: MenuCategory[] = [];
      let its: MenuItem[] = [];
      try {
        const pub = await api.get<{ restaurant: RestaurantInfo; categories: MenuCategory[]; items: MenuItem[] }>(
          `/api/public/menu/${slug}`,
        );
        r = pub.restaurant;
        cats = pub.categories;
        its = pub.items;
      } catch {
        try {
          r = await api.get<RestaurantInfo>(`/api/restaurants/slug/${slug}`);
        } catch {
          const list = await api.get<RestaurantInfo[]>("/api/restaurants").catch(() => []);
          r = list.find((x) => x.slug === slug) ?? null;
        }
        if (r) {
          [cats, its] = await Promise.all([
            api.get<MenuCategory[]>(`/api/categories?restaurantId=${r.id}`).catch(() => []),
            api.get<MenuItem[]>(`/api/items?restaurantId=${r.id}`).catch(() => []),
          ]);
        }
      }
      if (!r) throw new Error("المطعم غير موجود");
      setRestaurant(r);
      const activeCats = cats.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(activeCats);
      setItems(its);
      if (activeCats.length > 0) setActiveCategory(activeCats[0].id);
      cart.setRestaurantDetails(r.id, r.whatsapp || r.phone, r.name);
    } catch (e: any) {
      setError(e?.message || "تعذّر تحميل المنيو");
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
      const q = search.trim().toLowerCase();
      return it.name.toLowerCase().includes(q) || (it.nameAr ?? "").toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
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
            onPress={() => cart.addItem({ itemId: item.id, name: item.nameAr || item.name, price: item.discountedPrice ?? item.price, image: item.image, restaurantId: restaurant.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bc4700" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState title="لا توجد أصناف" description="جرّب فئة أخرى أو ابحث بكلمة مختلفة" icon={<ShoppingBag size={32} color="#9c948a" />} />}
      />

      {cartCount > 0 && !cartOpen ? (
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

      {cartOpen ? <CartSheet restaurant={restaurant} onClose={() => setCartOpen(false)} /> : null}

      <FloatingWhatsApp number={restaurant.whatsapp || restaurant.phone} />
    </SafeAreaView>
  );
}

const MenuItemCard = ({ item, onPress }: { item: MenuItem; onPress: () => void }) => {
  const price = item.discountedPrice ?? item.price;
  return (
    <Pressable
      onPress={onPress}
      disabled={!item.isAvailable}
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
        <Text style={{ fontFamily: "ReadexPro", fontSize: 14, fontWeight: "700", color: "#bc4700", marginTop: 4 }}>{formatPrice(price)}</Text>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center" }}>
        <Plus size={18} color="#fff" />
      </View>
    </Pressable>
  );
};

function CartSheet({ restaurant, onClose }: { restaurant: RestaurantInfo; onClose: () => void }) {
  const cart = useCart();
  const items = useCart((s) => s.items);
  const customerName = useCart((s) => s.customerName);
  const customerPhone = useCart((s) => s.customerPhone);
  const notes = useCart((s) => s.notes);
  const pickupType = useCart((s) => s.pickupType);
  const [submitting, setSubmitting] = useState(false);
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  const onCheckout = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const refCode = (await AsyncStorage.getItem("smartmenu_referral")) || undefined;
      const res = await api.post<{ id: number; orderNo: string }>("/api/orders", {
        items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity, notes: i.notes, price: i.price, modifierOptionIds: i.modifierOptionIds })),
        restaurantId: restaurant.id, customerName, customerPhone, notes, pickupType, referralCode: refCode,
        // The API schema requires positive subtotal/total (the server recalculates
        // both from DB prices anyway — these are advisory client-side values).
        subtotal, total: subtotal,
      }, { mobileClient: true });
      const receipt = buildReceiptMessage({
        restaurantName: restaurant.name, orderNo: res.orderNo,
        items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price, notes: i.notes })),
        totalPrice: subtotal, customerName, customerPhone, notes, pickupType,
      });
      const waUrl = buildWhatsAppShareUrl(receipt, normalizeWaNumber(restaurant.whatsapp || restaurant.phone));
      await Linking.openURL(waUrl);
      cart.clearCart(); onClose();
    } catch (e: any) {
      toast.error(e?.message || "فشل إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const pickupLabels: Record<typeof pickupType, string> = { inside: "داخل المطعم", takeaway: "سفري", delivery: "توصيل" };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 100 }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#070503", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", padding: 16, borderWidth: 1, borderColor: "#1f1813" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>السلة</Text>
          <Pressable onPress={onClose} hitSlop={8}><X size={20} color="#9c948a" /></Pressable>
        </View>
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", paddingVertical: 24 }}>السلة فارغة</Text>
          ) : (
            items.map((i) => (
              <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f1813" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: "#ebe7e2" }} numberOfLines={1}>{i.name}</Text>
                  <Text style={{ fontFamily: "ReadexPro", fontSize: 12, color: "#bc4700", marginTop: 4 }}>{formatPrice(i.price)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => cart.updateQuantity(i.id, i.quantity - 1)} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#1f1813", alignItems: "center", justifyContent: "center" }}><Minus size={12} color="#ebe7e2" /></Pressable>
                  <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "700", color: "#ebe7e2", minWidth: 20, textAlign: "center" }}>{toArabicNumber(i.quantity)}</Text>
                  <Pressable onPress={() => cart.updateQuantity(i.id, i.quantity + 1)} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center" }}><Plus size={12} color="#fff" /></Pressable>
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
                <Pressable key={t} onPress={() => cart.setPickupType(t)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: pickupType === t ? "#bc4700" : "#1f1813", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "600", color: pickupType === t ? "#fff" : "#9c948a" }}>{pickupLabels[t]}</Text>
                </Pressable>
              ))}
            </View>
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
