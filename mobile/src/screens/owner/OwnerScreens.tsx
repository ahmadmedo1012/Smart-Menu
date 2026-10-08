import { useEffect, useState, useCallback, useRef } from "react";
import { View, ScrollView, RefreshControl, Pressable, Share, FlatList, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { Package, TrendingUp, Settings, Award, ClipboardList, QrCode, Star, Share2 } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Spinner, EmptyState, ErrorState } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import Animated from "react-native-reanimated";
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible";
import { formatPrice, toArabicNumber } from "@/lib/format";
import { formatRelativeTimeAr, getOrderStatusMeta, getPickupTypeMeta } from "@/lib/order-status";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "@/app/providers";
import { ORDERS_POLL_INTERVAL_MS } from "@/constants";
import type { RootNavigation } from "@/navigation/types";

import { Text } from "@/components/ui/Text";

interface OwnerStats {
  totalOrders: number; todayOrders: number; todayRevenue: number; totalItems: number;
  popularItems: { itemId: number; name: string; totalSold: number }[];
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[];
  statusBreakdown: Record<string, number>;
}

export function OwnerDashboardScreen() {
  const navigation = useNavigation<RootNavigation>();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await api.get<OwnerStats>("/api/stats");
      setStats(s);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل الإحصائيات"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#E9B44C" />}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: "#F2EFE6", marginBottom: 16 }}>
          أهلًا، {user?.name || user?.username || "صاحب المطعم"}
        </Text>
        {error ? <ErrorState message={error} onRetry={load} /> : stats ? (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <Kpi label="إجمالي الطلبات" value={toArabicNumber(stats.totalOrders)} icon={<ClipboardList size={18} color="#E9B44C" />} />
              <Kpi label="طلبات اليوم" value={toArabicNumber(stats.todayOrders)} icon={<TrendingUp size={18} color="#E9B44C" />} />
            </View>
            <Kpi label="إيرادات اليوم" value={formatPrice(stats.todayRevenue)} icon={<Package size={18} color="#E9B44C" />} full />
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: "#F2EFE6", marginVertical: 16 }}>إجراءات سريعة</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <QuickAction icon={<ClipboardList size={20} color="#F2EFE6" />} label="الطلبات" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerOrders")} />
              <QuickAction icon={<Package size={20} color="#F2EFE6" />} label="المنيو" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerMenu")} />
              <QuickAction icon={<QrCode size={20} color="#F2EFE6" />} label="رمز QR" onPress={() => navigation.navigate("OwnerQr")} />
              <QuickAction icon={<Star size={20} color="#F2EFE6" />} label="التقييمات" onPress={() => navigation.navigate("OwnerReviews")} />
              <QuickAction icon={<Award size={20} color="#F2EFE6" />} label="الولاء" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerLoyalty")} />
              <QuickAction icon={<Settings size={20} color="#F2EFE6" />} label="الإعدادات" onPress={() => navigation.navigate("OwnerSettings")} />
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: "#F2EFE6", marginTop: 16, marginBottom: 8 }}>أحدث الطلبات</Text>
            {stats.recentOrders.length === 0 ? (
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", textAlign: "center", paddingVertical: 16 }}>لا توجد طلبات بعد</Text>
            ) : (
              stats.recentOrders.slice(0, 5).map((o) => (
                <PressableScale key={o.id} onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} accessibilityLabel={`الطلب ${o.orderNo} — ${getOrderStatusMeta(o.status).label} — ${formatPrice(o.total)}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0D1428", borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1B2444" }}>
                  <View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: "#F2EFE6" }}>{o.orderNo}</Text>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", marginTop: 2 }}>{formatRelativeTimeAr(o.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: "#E9B44C" }}>{formatPrice(o.total)}</Text>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: "#8E97B8", marginTop: 2 }}>{getOrderStatusMeta(o.status).label}</Text>
                  </View>
                </PressableScale>
              ))
            )}
            <Pressable onPress={logout} style={{ marginTop: 24, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#F0938F", fontWeight: "600" }}>تسجيل الخروج</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Kpi({ label, value, icon, full }: { label: string; value: string; icon: React.ReactNode; full?: boolean }) {
  return (
    <View style={{ flex: full ? 1 : 0.5, backgroundColor: "#0D1428", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#1B2444", marginBottom: 8 }}>
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ width: "31%", aspectRatio: 1, backgroundColor: "#0D1428", borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#1B2444" }}>
      {icon}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", textAlign: "center" }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </PressableScale>
  );
}

interface Order {
  id: number; orderNo: string; customerName: string; customerPhone: string;
  status: string; total: number; notes: string; pickupType: string;
  createdAt: string; items: { id: number; name: string; quantity: number; price: number }[];
}

/** r118-B3 (A6 P3-1): /api/orders page size — matches the server default
 * (api-helpers.ts parsePagination) the list was silently fetching as its one
 * and only page before pagination existed. */
const ORDERS_PAGE_SIZE = 50;

export function OwnerOrdersScreen() {
  const navigation = useNavigation<RootNavigation>();
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // r118-B3 (A6 P3-1): pagination — the list previously fetched page 1 only
  // (API pageSize=50) and silently dropped the rest of the history.
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // Refs mirror the page/hasMore state for synchronous guards — state lags a
  // frame, so two rapid onEndReached calls could otherwise double-fetch.
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  // r119-B2-M (S12 QW2): id bookkeeping for the new-order haptic. The poll
  // merge knows which ids are fresh; this ref tells us which the user has
  // ALREADY seen, so only POLL-discovered orders vibrate. Pull-to-refresh and
  // load-more update the same ref silently (user-initiated loads are not
  // news). Null until the first list lands — the first poll after an empty/
  // failed load records ids without vibrating.
  const knownOrderIdsRef = useRef<Set<number> | null>(null);

  const setPagination = useCallback((page: number, more: boolean) => {
    pageRef.current = page;
    hasMoreRef.current = more;
    setHasMore(more);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getPaginated<Order>(`/api/orders?page=1&pageSize=${ORDERS_PAGE_SIZE}`);
      setOrders(res.data ?? []);
      knownOrderIdsRef.current = new Set((res.data ?? []).map((o) => o.id));
      setPagination(1, res.meta ? res.meta.page < res.meta.totalPages : (res.data ?? []).length >= ORDERS_PAGE_SIZE);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل الطلبات"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setPagination]);

  useEffect(() => { void load(); }, [load]);

  // r118-B3: the 15s poll refreshes page 1 only and MERGES it into the loaded
  // history (prepend new orders, refresh the page-1 subset in place). The
  // pre-pagination poll replaced the list wholesale — fine while there was a
  // single page, but with several loaded pages it would yank the owner back
  // to the newest 50 rows every 15 seconds while they are scrolled into
  // older history.
  const poll = useCallback(async () => {
    try {
      const res = await api.getPaginated<Order>(`/api/orders?page=1&pageSize=${ORDERS_PAGE_SIZE}`);
      const rows = res.data ?? [];
      setOrders((prev) => {
        if (prev.length === 0) return rows;
        const byId = new Map(rows.map((o) => [o.id, o] as const));
        const existingIds = new Set(prev.map((o) => o.id));
        return [...rows.filter((o) => !existingIds.has(o.id)), ...prev.map((o) => byId.get(o.id) ?? o)];
      });
      // r119-B2-M (S12 QW2): haptic new-order alert — the owner is often away
      // from the screen; a short double-pulse (Android pattern; iOS vibrates
      // once, pattern is Android-only) says "new order" without sound or a
      // notification permission. Only POLL-discovered ids trigger it.
      const known = knownOrderIdsRef.current;
      if (known && rows.some((o) => !known.has(o.id))) {
        Vibration.vibrate([0, 200, 100, 200]);
      }
      const nextKnown = known ?? new Set<number>();
      for (const o of rows) nextKnown.add(o.id);
      knownOrderIdsRef.current = nextKnown;
      if (res.meta) setPagination(pageRef.current, res.meta.totalPages > pageRef.current);
    } catch {
      // Silent by design: a transient poll failure keeps the loaded history
      // visible; pull-to-refresh and load-more still surface their errors.
    }
  }, [setPagination]);

  usePollWhenVisible(poll, ORDERS_POLL_INTERVAL_MS, [], { inFlightGuard: true });

  const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || error || !hasMoreRef.current) return;
    const next = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const res = await api.getPaginated<Order>(`/api/orders?page=${next}&pageSize=${ORDERS_PAGE_SIZE}`);
      const rows = res.data ?? [];
      setOrders((prev) => {
        // Dedupe by id — the 15s poll prepends new orders, shifting page
        // boundaries between loads (the classic offset-pagination skew).
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...rows.filter((o) => !seen.has(o.id))];
      });
      // Older pages are user-initiated history, not news — record ids silently
      // so the poll's haptic never fires for them (S12 QW2).
      const known = knownOrderIdsRef.current ?? new Set<number>();
      for (const o of rows) known.add(o.id);
      knownOrderIdsRef.current = known;
      setPagination(next, res.meta ? res.meta.page < res.meta.totalPages : rows.length >= ORDERS_PAGE_SIZE);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر تحميل المزيد من الطلبات"));
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, error, setPagination]);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <Spinner size="small" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <Pressable
          onPress={() => { void loadMore(); }}
          accessibilityLabel="تحميل المزيد من الطلبات"
          accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 8, paddingVertical: 12, alignItems: "center", borderRadius: 8, backgroundColor: "#0D1428", borderWidth: 1, borderColor: "#1B2444", opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: "#E9B44C" }} maxFontSizeMultiplier={1.4}>تحميل المزيد</Text>
        </Pressable>
      );
    }
    // End state — only when pagination actually happened (more than one page
    // was ever loadable); a short single-page list needs no "no more" noise.
    if (orders.length > ORDERS_PAGE_SIZE) {
      return (
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8", textAlign: "center", paddingVertical: 16 }}>لا مزيد من الطلبات</Text>
      );
    }
    return null;
  }, [loadingMore, hasMore, orders.length, loadMore]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item: o }) => (
          <PressableScale onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} accessibilityLabel={`الطلب ${o.orderNo} — ${o.customerName || "زبون"} — ${getOrderStatusMeta(o.status).label} — ${formatPrice(o.total)}`} style={{ backgroundColor: "#0D1428", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1B2444" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: "#F2EFE6" }}>{o.orderNo}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#E9B44C", fontWeight: "600" }}>{getOrderStatusMeta(o.status).label}</Text>
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8" }}>{o.customerName || "زبون"} • {o.customerPhone || "—"}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8" }}>{formatRelativeTimeAr(o.createdAt)}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: "#E9B44C" }}>{formatPrice(o.total)}</Text>
            </View>
          </PressableScale>
        )}
        onEndReached={() => { void loadMore(); }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E9B44C" />}
        ListEmptyComponent={<EmptyState title="لا توجد طلبات" description="ستظهر الطلبات الجديدة هنا فور استلامها" icon={<ClipboardList size={32} color="#8E97B8" />} />}
        ListFooterComponent={renderFooter}
      />
      </Animated.View>
    </SafeAreaView>
  );
}

export function OwnerOrderDetailScreen() {
  const route = useRoute();
  const { orderId } = (route.params || {}) as { orderId: number };
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const o = await api.get<Order>(`/api/orders/${orderId}`);
      setOrder(o);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل الطلب"));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (error && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const updateStatus = async (status: string) => {
    // r102-M9: الفشل كان يُبتلع بصمت (catch {}) — المالك يضغط زر الحالة ولا يرى
    // شيئًا إذا رفض الخادم التغيير. الوميض بالخطأ + إعادة التحميل عند النجاح فقط.
    try {
      await api.put(`/api/orders/${orderId}`, { status });
      toast.success(`تم تحديث الحالة إلى ${getOrderStatusMeta(status).label}`);
      void load();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "فشل تحديث الحالة"));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: "#F2EFE6", marginBottom: 4 }}>{order.orderNo}</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", marginBottom: 16 }}>{formatRelativeTimeAr(order.createdAt)}</Text>
        <View style={{ backgroundColor: "#0D1428", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#1B2444" }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: "#F2EFE6", marginBottom: 4 }}>بيانات الزبون</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8" }}>الاسم: {order.customerName || "—"}</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8" }}>الهاتف: {order.customerPhone || "—"}</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8" }}>النوع: {getPickupTypeMeta(order.pickupType).label}</Text>
          {order.notes ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8" }}>ملاحظات: {order.notes}</Text> : null}
        </View>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: "#F2EFE6", marginBottom: 8 }}>الأصناف</Text>
        {order.items.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1B2444" }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#F2EFE6" }}>{i.quantity}× {i.name}</Text>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#E9B44C" }}>{formatPrice(i.price * i.quantity)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: "#F2EFE6" }}>المجموع</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: "#E9B44C" }}>{formatPrice(order.total)}</Text>
        </View>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: "#F2EFE6", marginTop: 24, marginBottom: 8 }}>تحديث الحالة</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["new", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <Pressable key={s} onPress={() => updateStatus(s)} accessibilityRole="button" accessibilityLabel={`تحديث الحالة إلى ${getOrderStatusMeta(s).label}`} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: order.status === s ? "#E9B44C" : "#121A36" }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: order.status === s ? "#05070F" : "#8E97B8" }} maxFontSizeMultiplier={1.4}>{getOrderStatusMeta(s).label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerMenuScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>إدارة المنيو</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", marginTop: 8, lineHeight: 20 }}>
          يمكن إدارة الأصناف والفئات عبر تطبيق الويب حاليًا. سيتم إضافة المحرر الكامل للهاتف في التحديث القادم.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export function OwnerRestaurantsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>فروعي</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", marginTop: 8, lineHeight: 20 }}>إدارة فروع متعددة قريبًا</Text>
      </View>
    </SafeAreaView>
  );
}

interface OwnerRestaurantLite {
  id: number;
  name: string;
  slug: string;
}

/**
 * r102-M2: was a static placeholder (hardcoded `your-slug`, text instead of a
 * QR). Now loads the owner's REAL restaurants and renders each one's QR —
 * offline via react-native-qrcode-svg (pure JS on react-native-svg; no third-
 * party qrserver call, no menu URL leaving the device) — with native share.
 */
export function OwnerQrScreen() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly";
  const [restaurants, setRestaurants] = useState<OwnerRestaurantLite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // r103-N2: the fetch lived in a `deps: []` effect — the ErrorState's onRetry
  // only flipped state (loading=true), the effect never re-ran, and the screen
  // dead-ended into an eternal spinner. Hoisted into a callback (the MenuScreen
  // `load` pattern) so retry actually refetches.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<OwnerRestaurantLite[]>("/api/owner/restaurants");
      setRestaurants(list ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل مطاعمك"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6", marginBottom: 16 }}>رمز QR لمنيوك</Text>
        {error ? (
          <ErrorState message={error} onRetry={() => { void load(); }} />
        ) : restaurants && restaurants.length > 0 ? (
          restaurants.map((r) => {
            const url = `${domain}/menu/${r.slug}`;
            return (
              <View key={r.id} style={{ backgroundColor: "#0D1428", borderRadius: 12, borderWidth: 1, borderColor: "#1B2444", padding: 16, marginBottom: 16, alignItems: "center", width: "100%" }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, fontWeight: "700", color: "#F2EFE6", marginBottom: 12 }}>{r.name}</Text>
                <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12 }}>
                  <QRCode value={url} size={200} backgroundColor="#ffffff" color="#070B16" />
                </View>
                <PressableScale
                  onPress={() => { void Share.share({ message: url }).catch(() => {}); }}
                  accessibilityLabel={`مشاركة رابط منيو ${r.name}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#E9B44C" }}>
                  <Share2 size={16} color="#05070F" />
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: "#05070F" }} maxFontSizeMultiplier={1.4}>مشاركة الرابط</Text>
                </PressableScale>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", marginTop: 8, textAlign: "center" }} selectable>{url}</Text>
              </View>
            );
          })
        ) : (
          <EmptyState title="لا توجد مطاعم" description="أضف مطعمك أولًا من تطبيق الويب" icon={<QrCode size={32} color="#8E97B8" />} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerReviewsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>تقييمات العملاء</Text>
        <EmptyState title="لا توجد تقييمات بعد" icon={<Star size={32} color="#8E97B8" />} />
      </View>
    </SafeAreaView>
  );
}

export function OwnerLoyaltyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>برنامج الولاء</Text>
        <EmptyState title="لا توجد بيانات ولاء بعد" icon={<Award size={32} color="#8E97B8" />} />
      </View>
    </SafeAreaView>
  );
}

export function OwnerSettingsScreen() {
  const logout = useAuth((s) => s.logout);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6", marginBottom: 16 }}>الإعدادات</Text>
        <Pressable onPress={logout} style={{ paddingVertical: 12, alignItems: "center", backgroundColor: "#121A36", borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: "#F0938F", fontWeight: "700" }}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
