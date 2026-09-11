import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Store, Package, TrendingUp, Settings, Award, ClipboardList, QrCode, Star } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Spinner, EmptyState, ErrorState } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible";
import { formatPrice, toArabicNumber, formatDate } from "@/lib/format";

interface OwnerStats {
  totalOrders: number; todayOrders: number; todayRevenue: number; totalItems: number;
  popularItems: { itemId: number; name: string; totalSold: number }[];
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[];
  statusBreakdown: Record<string, number>;
}

export function OwnerDashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await api.get<OwnerStats>("/api/stats");
      setStats(s);
    } catch (e: any) {
      setError(e?.message || "تعذّر تحميل الإحصائيات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#bc4700" />}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>
          أهلًا، {user?.name || user?.username || "صاحب المطعم"}
        </Text>
        {error ? <ErrorState message={error} onRetry={load} /> : stats ? (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <Kpi label="إجمالي الطلبات" value={toArabicNumber(stats.totalOrders)} icon={<ClipboardList size={18} color="#bc4700" />} />
              <Kpi label="طلبات اليوم" value={toArabicNumber(stats.todayOrders)} icon={<TrendingUp size={18} color="#bc4700" />} />
            </View>
            <Kpi label="إيرادات اليوم" value={formatPrice(stats.todayRevenue)} icon={<Package size={18} color="#bc4700" />} full />
            <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#ebe7e2", marginVertical: 16 }}>إجراءات سريعة</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <QuickAction icon={<ClipboardList size={20} color="#ebe7e2" />} label="الطلبات" onPress={() => (navigation as any).getParent()?.navigate("OwnerOrders")} />
              <QuickAction icon={<Package size={20} color="#ebe7e2" />} label="المنيو" onPress={() => (navigation as any).getParent()?.navigate("OwnerMenu")} />
              <QuickAction icon={<QrCode size={20} color="#ebe7e2" />} label="رمز QR" onPress={() => navigation.navigate("OwnerQr")} />
              <QuickAction icon={<Star size={20} color="#ebe7e2" />} label="التقييمات" onPress={() => navigation.navigate("OwnerReviews")} />
              <QuickAction icon={<Award size={20} color="#ebe7e2" />} label="الولاء" onPress={() => (navigation as any).getParent()?.navigate("OwnerLoyalty")} />
              <QuickAction icon={<Settings size={20} color="#ebe7e2" />} label="الإعدادات" onPress={() => navigation.navigate("OwnerSettings")} />
            </View>
            <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#ebe7e2", marginTop: 16, marginBottom: 8 }}>أحدث الطلبات</Text>
            {stats.recentOrders.length === 0 ? (
              <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", paddingVertical: 16 }}>لا توجد طلبات بعد</Text>
            ) : (
              stats.recentOrders.slice(0, 5).map((o) => (
                <Pressable key={o.id} onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} style={({ pressed }) => ({ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#070503", borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1f1813", opacity: pressed ? 0.8 : 1 })}>
                  <View>
                    <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: "#ebe7e2" }}>{o.orderNo}</Text>
                    <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", marginTop: 2 }}>{formatDate(new Date(o.createdAt))}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: "ReadexPro", fontSize: 13, fontWeight: "700", color: "#bc4700" }}>{formatPrice(o.total)}</Text>
                    <Text style={{ fontFamily: "Cairo", fontSize: 10, color: "#9c948a", marginTop: 2 }}>{o.status}</Text>
                  </View>
                </Pressable>
              ))
            )}
            <Pressable onPress={logout} style={{ marginTop: 24, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#c0392b", fontWeight: "600" }}>تسجيل الخروج</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, icon, full }: { label: string; value: string; icon: React.ReactNode; full?: boolean }) {
  return (
    <View style={{ flex: full ? 1 : 0.5, backgroundColor: "#070503", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#1f1813", marginBottom: 8 }}>
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>{value}</Text>
      <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: "31%", aspectRatio: 1, backgroundColor: "#070503", borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#1f1813", opacity: pressed ? 0.8 : 1 })}>
      {icon}
      <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

interface Order {
  id: number; orderNo: string; customerName: string; customerPhone: string;
  status: string; total: number; notes: string; pickupType: string;
  createdAt: string; items: { id: number; name: string; quantity: number; price: number }[];
}

export function OwnerOrdersScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Order[]>("/api/orders");
      setOrders(list ?? []);
    } catch (e: any) {
      setError(e?.message || "تعذّر تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  usePollWhenVisible(load, 15_000, [], { inFlightGuard: true });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor="#bc4700" />}>
        {orders.length === 0 ? (
          <EmptyState title="لا توجد طلبات" description="ستظهر الطلبات الجديدة هنا فور استلامها" icon={<ClipboardList size={32} color="#9c948a" />} />
        ) : (
          orders.map((o) => (
            <Pressable key={o.id} onPress={() => navigation.navigate("OwnerOrderDetail", { orderId: o.id })} style={({ pressed }) => ({ backgroundColor: "#070503", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1f1813", opacity: pressed ? 0.8 : 1 })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "700", color: "#ebe7e2" }}>{o.orderNo}</Text>
                <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#bc4700", fontWeight: "600" }}>{o.status}</Text>
              </View>
              <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a" }}>{o.customerName || "زبون"} • {o.customerPhone || "—"}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a" }}>{formatDate(new Date(o.createdAt))}</Text>
                <Text style={{ fontFamily: "ReadexPro", fontSize: 14, fontWeight: "700", color: "#bc4700" }}>{formatPrice(o.total)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerOrderDetailScreen() {
  const navigation = useNavigation<any>();
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
    } catch (e: any) {
      setError(e?.message || "تعذّر تحميل الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  if (loading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  const updateStatus = async (status: string) => {
    try { await api.put(`/api/orders/${orderId}`, { status }); void load(); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#ebe7e2", marginBottom: 4 }}>{order.orderNo}</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", marginBottom: 16 }}>{formatDate(new Date(order.createdAt))}</Text>
        <View style={{ backgroundColor: "#070503", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#1f1813" }}>
          <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: "#ebe7e2", marginBottom: 4 }}>بيانات الزبون</Text>
          <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a" }}>الاسم: {order.customerName || "—"}</Text>
          <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a" }}>الهاتف: {order.customerPhone || "—"}</Text>
          <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a" }}>النوع: {order.pickupType}</Text>
          {order.notes ? <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a" }}>ملاحظات: {order.notes}</Text> : null}
        </View>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, fontWeight: "700", color: "#ebe7e2", marginBottom: 8 }}>الأصناف</Text>
        {order.items.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f1813" }}>
            <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#ebe7e2" }}>{i.quantity}× {i.name}</Text>
            <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#bc4700" }}>{formatPrice(i.price * i.quantity)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#ebe7e2" }}>المجموع</Text>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#bc4700" }}>{formatPrice(order.total)}</Text>
        </View>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, fontWeight: "700", color: "#ebe7e2", marginTop: 24, marginBottom: 8 }}>تحديث الحالة</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["new", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <Pressable key={s} onPress={() => updateStatus(s)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: order.status === s ? "#bc4700" : "#1f1813" }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "600", color: order.status === s ? "#fff" : "#9c948a" }}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerMenuScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>إدارة المنيو</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", marginTop: 8, lineHeight: 20 }}>
          يمكن إدارة الأصناف والفئات عبر تطبيق الويب حاليًا. سيتم إضافة المحرر الكامل للهاتف في التحديث القادم.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export function OwnerRestaurantsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>فروعي</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", marginTop: 8, lineHeight: 20 }}>إدارة فروع متعددة قريبًا</Text>
      </View>
    </SafeAreaView>
  );
}

export function OwnerQrScreen() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly";
  const url = `${domain}/menu/your-slug`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>رمز QR لمنيوك</Text>
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12 }}>
          <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#000" }}>{url}</Text>
        </View>
        <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a", marginTop: 16, textAlign: "center" }}>شارك هذا الرابط أو اطبع رمز QR لعملائك</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerReviewsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>تقييمات العملاء</Text>
        <EmptyState title="لا توجد تقييمات بعد" icon={<Star size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function OwnerLoyaltyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>برنامج الولاء</Text>
        <EmptyState title="لا توجد بيانات ولاء بعد" icon={<Award size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function OwnerSettingsScreen() {
  const logout = useAuth((s) => s.logout);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>الإعدادات</Text>
        <Pressable onPress={logout} style={{ paddingVertical: 12, alignItems: "center", backgroundColor: "#1f1813", borderRadius: 8 }}>
          <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#c0392b", fontWeight: "700" }}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
