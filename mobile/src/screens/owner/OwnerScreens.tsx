import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, ScrollView, RefreshControl, Pressable, Share, FlatList, Vibration, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { Package, TrendingUp, Settings, Award, ClipboardList, QrCode, Star, Share2, UtensilsCrossed, Store } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Spinner, EmptyState, ErrorState, ComingSoon } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import Animated from "react-native-reanimated";
import { formatPrice, toArabicNumber } from "@/lib/format";
import { formatRelativeTimeAr, getOrderStatusMeta, getPickupTypeMeta } from "@/lib/order-status";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "@/app/providers";
import { ORDERS_POLL_INTERVAL_MS } from "@/constants";
import type { RootNavigation } from "@/navigation/types";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

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
  // r126-M5 (A6 P1-6): React Query owns the stats fetch — was hand-rolled
  // useState+useEffect; refetch-on-focus now comes from the provider wiring.
  const { data: stats, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["owner-stats"],
    queryFn: () => api.get<OwnerStats>("/api/stats"),
  });
  const loadError = error ? getErrorMessage(error, "تعذّر تحميل الإحصائيات") : null;

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.gold} />}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>
          أهلًا، {user?.name || user?.username || "صاحب المطعم"}
        </Text>
        {loadError ? <ErrorState message={loadError} onRetry={() => { void refetch(); }} /> : stats ? (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <Kpi label="إجمالي الطلبات" value={toArabicNumber(stats.totalOrders)} icon={<ClipboardList size={18} color={colors.gold} />} />
              <Kpi label="طلبات اليوم" value={toArabicNumber(stats.todayOrders)} icon={<TrendingUp size={18} color={colors.gold} />} />
            </View>
            <Kpi label="إيرادات اليوم" value={formatPrice(stats.todayRevenue)} icon={<Package size={18} color={colors.gold} />} full />
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.sand, marginVertical: 16 }}>إجراءات سريعة</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <QuickAction icon={<ClipboardList size={20} color={colors.sand} />} label="الطلبات" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerOrders")} />
              <QuickAction icon={<Package size={20} color={colors.sand} />} label="المنيو" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerMenu")} />
              <QuickAction icon={<QrCode size={20} color={colors.sand} />} label="رمز QR" onPress={() => navigation.navigate("OwnerQr")} />
              <QuickAction icon={<Star size={20} color={colors.sand} />} label="التقييمات" onPress={() => navigation.navigate("OwnerReviews")} />
              <QuickAction icon={<Award size={20} color={colors.sand} />} label="الولاء" onPress={() => navigation.getParent<RootNavigation>()?.navigate("OwnerLoyalty")} />
              <QuickAction icon={<Settings size={20} color={colors.sand} />} label="الإعدادات" onPress={() => navigation.navigate("OwnerSettings")} />
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.sand, marginTop: 16, marginBottom: 8 }}>أحدث الطلبات</Text>
            {stats.recentOrders.length === 0 ? (
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", paddingVertical: 16 }}>لا توجد طلبات بعد</Text>
            ) : (
              stats.recentOrders.slice(0, 5).map((o) => (
                <PressableScale key={o.id} onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} accessibilityLabel={`الطلب ${o.orderNo} — ${getOrderStatusMeta(o.status).label} — ${formatPrice(o.total)}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline }}>
                  <View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.sand }}>{o.orderNo}</Text>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }}>{formatRelativeTimeAr(o.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: colors.gold }}>{formatPrice(o.total)}</Text>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: colors.muted, marginTop: 2 }}>{getOrderStatusMeta(o.status).label}</Text>
                  </View>
                </PressableScale>
              ))
            )}
            <Pressable onPress={logout} style={{ marginTop: 24, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.rose, fontWeight: "600" }}>تسجيل الخروج</Text>
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
    <View style={{ flex: full ? 1 : 0.5, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.hairline, marginBottom: 8 }}>
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.hairline }}>
      {icon}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, textAlign: "center" }} maxFontSizeMultiplier={1.4}>{label}</Text>
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

  // r126-M5 (A6 P1-6): React Query owns page 1 + the 15s poll (was the
  // hand-rolled load/poll/usePollWhenVisible trio, ~100 lines). The
  // provider's focusManager wiring pauses the interval in background and
  // refetches on foreground — the exact usePollWhenVisible semantics.
  const {
    data: firstPage,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["owner-orders"],
    queryFn: () => api.getPaginated<Order>(`/api/orders?page=1&pageSize=${ORDERS_PAGE_SIZE}`),
    refetchInterval: ORDERS_POLL_INTERVAL_MS,
  });

  // r118-B3 (A6 P3-1): pagination — pages 2+ are user-initiated history and
  // stay in local state; the (fresh) query page-1 is merged on top so the
  // 15s poll never yanks the owner out of older history.
  const [olderPages, setOlderPages] = useState<Order[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // Refs mirror page/hasMore for synchronous guards — state lags a frame, so
  // two rapid onEndReached calls could otherwise double-fetch.
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  // r119-B2-M (S12 QW2): id bookkeeping for the new-order haptic — a short
  // double-pulse says "new order" without sound or a notification
  // permission. Null until the first list lands (initial loads are not
  // news); load-more records older ids silently.
  const knownOrderIdsRef = useRef<Set<number> | null>(null);

  const setPagination = useCallback((page: number, more: boolean) => {
    pageRef.current = page;
    hasMoreRef.current = more;
    setHasMore(more);
  }, []);

  // Merge query page 1 with loaded older pages (dedupe by id — the poll
  // prepends new orders, shifting page boundaries between loads: the classic
  // offset-pagination skew).
  const orders = useMemo(() => {
    const rows = firstPage?.data;
    if (!rows || rows.length === 0) return olderPages;
    const rowIds = new Set(rows.map((o) => o.id));
    return [...rows, ...olderPages.filter((o) => !rowIds.has(o.id))];
  }, [firstPage, olderPages]);

  // New-order haptic + hasMore bookkeeping ride ONE data effect.
  useEffect(() => {
    const rows = firstPage?.data;
    if (!rows) return;
    const known = knownOrderIdsRef.current;
    if (known && rows.some((o) => !known.has(o.id))) {
      Vibration.vibrate([0, 200, 100, 200]);
    }
    const nextKnown = known ?? new Set<number>();
    for (const o of rows) nextKnown.add(o.id);
    knownOrderIdsRef.current = nextKnown;
    if (firstPage?.meta) {
      hasMoreRef.current = firstPage.meta.totalPages > 1;
      setHasMore(hasMoreRef.current);
    }
  }, [firstPage]);

  const onRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const loadMore = useCallback(async () => {
    if (isPending || loadingMore || error || !hasMoreRef.current) return;
    const next = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const res = await api.getPaginated<Order>(`/api/orders?page=${next}&pageSize=${ORDERS_PAGE_SIZE}`);
      const rows = res.data ?? [];
      setOlderPages((prev) => {
        // Dedupe by id against everything already shown.
        const seen = new Set([...(firstPage?.data ?? []).map((o) => o.id), ...prev.map((o) => o.id)]);
        return [...prev, ...rows.filter((o) => !seen.has(o.id))];
      });
      // Older pages are user-initiated history, not news — record ids
      // silently so the poll's haptic never fires for them (S12 QW2).
      const known = knownOrderIdsRef.current ?? new Set<number>();
      for (const o of rows) known.add(o.id);
      knownOrderIdsRef.current = known;
      setPagination(next, res.meta ? res.meta.page < res.meta.totalPages : rows.length >= ORDERS_PAGE_SIZE);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر تحميل المزيد من الطلبات"));
    } finally {
      setLoadingMore(false);
    }
  }, [isPending, loadingMore, error, firstPage, setPagination]);

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
          style={({ pressed }) => ({ marginTop: 8, paddingVertical: 12, alignItems: "center", borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.gold }} maxFontSizeMultiplier={1.4}>تحميل المزيد</Text>
        </Pressable>
      );
    }
    // End state — only when pagination actually happened (more than one page
    // was ever loadable); a short single-page list needs no "no more" noise.
    if (orders.length > ORDERS_PAGE_SIZE) {
      return (
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, textAlign: "center", paddingVertical: 16 }}>لا مزيد من الطلبات</Text>
      );
    }
    return null;
  }, [loadingMore, hasMore, orders.length, loadMore]);

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <ErrorState message={getErrorMessage(error, "تعذّر تحميل الطلبات")} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item: o }) => (
          <PressableScale onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} accessibilityLabel={`الطلب ${o.orderNo} — ${o.customerName || "زبون"} — ${getOrderStatusMeta(o.status).label} — ${formatPrice(o.total)}`} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: colors.sand }}>{o.orderNo}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.gold, fontWeight: "600" }}>{getOrderStatusMeta(o.status).label}</Text>
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>{o.customerName || "زبون"} • {o.customerPhone || "—"}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }}>{formatRelativeTimeAr(o.createdAt)}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.gold }}>{formatPrice(o.total)}</Text>
            </View>
          </PressableScale>
        )}
        onEndReached={() => { void loadMore(); }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={<EmptyState title="لا توجد طلبات" description="ستظهر الطلبات الجديدة هنا فور استلامها" icon={<ClipboardList size={32} color={colors.muted} />} />}
        ListFooterComponent={renderFooter}
      />
      </Animated.View>
    </SafeAreaView>
  );
}

export function OwnerOrderDetailScreen() {
  const route = useRoute();
  // r126 (A6 P2-2): the param was an unsafe cast — undefined became
  // GET /api/orders/undefined. Validate before it reaches the API.
  const rawOrderId = Number((route.params as { orderId?: number } | undefined)?.orderId);
  const orderId = Number.isInteger(rawOrderId) && rawOrderId > 0 ? rawOrderId : null;

  // r126-M5: React Query owns fetch/loading/error + gives the detail screen
  // pull-to-refresh it never had (A6 P2-2).
  const { data: order, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["owner-order", orderId],
    enabled: orderId !== null,
    queryFn: () => api.get<Order>(`/api/orders/${orderId}`),
  });

  if (orderId === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <ErrorState message="طلب غير صالح" />
      </SafeAreaView>
    );
  }

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <ErrorState message={getErrorMessage(error, "تعذّر تحميل الطلب")} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const updateStatus = async (status: string) => {
    // r126 (A6 P2-2): cancelled is one-way (r121 product contract) and sat
    // next to 4 other one-tap states — an accidental tap cancelled an order
    // with no confirmation. Terminal transition now requires an explicit
    // confirm; the live statuses stay one-tap.
    if (status === "cancelled" && order.status !== "cancelled") {
      Alert.alert(
        "إلغاء الطلب؟",
        "لا يمكن التراجع عن الإلغاء بعد التنفيذ.",
        [
          { text: "رجوع", style: "cancel" },
          { text: "إلغاء الطلب", style: "destructive", onPress: () => { void performUpdate(status); } },
        ],
        { cancelable: true },
      );
      return;
    }
    void performUpdate(status);
  };

  const performUpdate = async (status: string) => {
    // r102-M9: الفشل كان يُبتلع بصمت (catch {}) — المالك يضغط زر الحالة ولا يرى
    // شيئًا إذا رفض الخادم التغيير. الوميض بالخطأ + إعادة التحميل عند النجاح فقط.
    try {
      await api.put(`/api/orders/${orderId}`, { status });
      toast.success(`تم تحديث الحالة إلى ${getOrderStatusMeta(status).label}`);
      void refetch();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "فشل تحديث الحالة"));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      {/* r126 (A6 P2-2): pull-to-refresh — the detail screen had none. */}
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.gold} />}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, marginBottom: 4 }}>{order.orderNo}</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, marginBottom: 16 }}>{formatRelativeTimeAr(order.createdAt)}</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.hairline }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.sand, marginBottom: 4 }}>بيانات الزبون</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>الاسم: {order.customerName || "—"}</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>الهاتف: {order.customerPhone || "—"}</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>النوع: {getPickupTypeMeta(order.pickupType).label}</Text>
          {order.notes ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>ملاحظات: {order.notes}</Text> : null}
        </View>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.sand, marginBottom: 8 }}>الأصناف</Text>
        {order.items.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.sand }}>{i.quantity}× {i.name}</Text>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.gold }}>{formatPrice(i.price * i.quantity)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.sand }}>المجموع</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.gold }}>{formatPrice(order.total)}</Text>
        </View>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.sand, marginTop: 24, marginBottom: 8 }}>تحديث الحالة</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["new", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <Pressable key={s} onPress={() => updateStatus(s)} accessibilityRole="button" accessibilityLabel={`تحديث الحالة إلى ${getOrderStatusMeta(s).label}`} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: order.status === s ? colors.gold : colors.surface2 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: order.status === s ? colors.void : colors.muted }} maxFontSizeMultiplier={1.4}>{getOrderStatusMeta(s).label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerMenuScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      {/* r126-M10: honest coming-soon state — the previous copy was honest
          but unpolished; unified with the shared ComingSoon surface. */}
      <ComingSoon title="إدارة المنيو" icon={<UtensilsCrossed size={32} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function OwnerRestaurantsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="إدارة الفروع" icon={<Store size={32} color={colors.gold} />} />
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>رمز QR لمنيوك</Text>
        {error ? (
          <ErrorState message={error} onRetry={() => { void load(); }} />
        ) : restaurants && restaurants.length > 0 ? (
          restaurants.map((r) => {
            const url = `${domain}/menu/${r.slug}`;
            return (
              <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, padding: 16, marginBottom: 16, alignItems: "center", width: "100%" }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, fontWeight: "700", color: colors.sand, marginBottom: 12 }}>{r.name}</Text>
                <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12 }}>
                  <QRCode value={url} size={200} backgroundColor="#ffffff" color={colors.night} />
                </View>
                <PressableScale
                  onPress={() => { void Share.share({ message: url }).catch(() => {}); }}
                  accessibilityLabel={`مشاركة رابط منيو ${r.name}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.gold }}>
                  <Share2 size={16} color={colors.void} />
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "700", color: colors.void }} maxFontSizeMultiplier={1.4}>مشاركة الرابط</Text>
                </PressableScale>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 8, textAlign: "center" }} selectable>{url}</Text>
              </View>
            );
          })
        ) : (
          <EmptyState title="لا توجد مطاعم" description="أضف مطعمك أولًا من تطبيق الويب" icon={<QrCode size={32} color={colors.muted} />} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerReviewsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      {/* r126-M10: was a static EmptyState «لا توجد تقييمات بعد» — reads as
          fetched-but-empty data; no fetch exists. Honest state instead. */}
      <ComingSoon title="تقييمات العملاء" icon={<Star size={32} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function OwnerLoyaltyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      {/* r126-M10: same honesty fix — «لا توجد بيانات ولاء بعد» implied a
          fetch that never happens. */}
      <ComingSoon title="برنامج الولاء" icon={<Award size={32} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function OwnerSettingsScreen() {
  const logout = useAuth((s) => s.logout);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>الإعدادات</Text>
        <Pressable onPress={logout} style={{ paddingVertical: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
