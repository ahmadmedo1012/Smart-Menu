import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Users, Store, CreditCard, Settings, Bell, FileText, Send, ExternalLink } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useAuth } from "@/store/auth";
import { toast } from "@/app/providers";
import { colors } from "@/theme/colors";
import type { RootNavigation } from "@/navigation/types";

/**
 * r126-M10 (A6 P1-3): the admin management screens are honest states —
 * they previously rendered EmptyStates titled like real data surfaces.
 *
 * Phase 6 (P6-2-cR): the bare ComingSoon placeholders become an
 * INTENTIONAL identity state — the warm plate icon well (56px r-16
 * terracotta tile), the honest line «هذه الشاشة متاحة حالياً على نسخة
 * الويب», and a link-out affordance that opens the matching web console
 * route. No fake controls ship here: the admin tooling itself stays a
 * documented follow-up (web parity work).
 */

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly";

function openWebConsole(path: string) {
  Linking.openURL(`${DOMAIN}${path}`).catch(() => {
    // No browser / no handler — the failure is told, never swallowed.
    toast.error("تعذّر فتح لوحة الويب");
  });
}

/** The web-only identity state — plate well + honest copy + link-out. */
function AdminWebOnly({ title, icon, webPath, webLabel }: { title: string; icon: React.ReactNode; webPath: string; webLabel: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Plate icon well — the Phase-6 warm state tile (56px r-16). */}
        <View style={{
          width: 56, height: 56, borderRadius: 16, backgroundColor: colors.terracottaSoft,
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          {icon}
        </View>
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" }}>{title}</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
          هذه الشاشة متاحة حالياً على نسخة الويب
        </Text>
        <PressableScale
          onPress={() => openWebConsole(webPath)}
          accessibilityLabel={webLabel}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.terracotta }}
        >
          <ExternalLink size={16} color={colors.onAccent} />
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.onAccent }} maxFontSizeMultiplier={1.4}>{webLabel}</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

export function AdminDashboardScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigation = useNavigation<RootNavigation>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>لوحة المدير</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, marginBottom: 24 }}>أهلًا {user?.name || user?.username}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color={colors.ink} />} label="المستخدمون" onPress={() => navigation.navigate("AdminUsers")} /> : null}
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color={colors.ink} />} label="المدراء" onPress={() => navigation.navigate("AdminAdmins")} /> : null}
          <AdminAction icon={<Bell size={20} color={colors.ink} />} label="أحداث النظام" onPress={() => navigation.navigate("AdminSystemEvents")} />
          {user?.role === "super_admin" ? <AdminAction icon={<FileText size={20} color={colors.ink} />} label="سجل التدقيق" onPress={() => navigation.navigate("AdminAuditLogs")} /> : null}
          <AdminAction icon={<Send size={20} color={colors.ink} />} label="تليجرام" onPress={() => navigation.navigate("AdminTelegram")} />
          <AdminAction icon={<Settings size={20} color={colors.ink} />} label="الإعدادات" onPress={() => navigation.navigate("AdminSettings")} />
        </View>
        {/* r131-F10 (fix 1 completion): PressableScale — was a silent raw Pressable. */}
        <PressableScale onPress={logout} accessibilityLabel="تسجيل الخروج" style={{ marginTop: 32, padding: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    // r130 W2-4: card press register — --state-card-pressed-scale 0.99
    // (tokens.css:248); control surfaces keep the 0.97 --press-scale default.
    <PressableScale scaleTo={0.99} onPress={onPress} style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.hairline }}>
      {icon}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, textAlign: "center" }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </PressableScale>
  );
}

export function AdminRestaurantsScreen() {
  return <AdminWebOnly title="إدارة المطاعم" icon={<Store size={24} color={colors.terracotta} />} webPath="/admin/restaurants" webLabel="فتح لوحة الويب" />;
}

export function AdminUsersScreen() {
  return <AdminWebOnly title="إدارة المستخدمين" icon={<Users size={24} color={colors.terracotta} />} webPath="/admin/users" webLabel="فتح لوحة الويب" />;
}

export function AdminAdminsScreen() {
  return <AdminWebOnly title="إدارة المدراء الفرعيين" icon={<Users size={24} color={colors.terracotta} />} webPath="/admin/admins" webLabel="فتح لوحة الويب" />;
}

export function AdminOrdersScreen() {
  return <AdminWebOnly title="جميع الطلبات" icon={<CreditCard size={24} color={colors.terracotta} />} webPath="/admin/orders" webLabel="فتح لوحة الويب" />;
}

export function AdminOrderDetailScreen() {
  // A detail deep-link carries the orderId — the web twin has /admin/orders/[id].
  const route = useRoute();
  const rawOrderId = Number((route.params as { orderId?: number } | undefined)?.orderId);
  const orderId = Number.isInteger(rawOrderId) && rawOrderId > 0 ? rawOrderId : null;
  return (
    <AdminWebOnly
      title="تفاصيل الطلب"
      icon={<CreditCard size={24} color={colors.terracotta} />}
      webPath={orderId ? `/admin/orders/${orderId}` : "/admin/orders"}
      webLabel="فتح لوحة الويب"
    />
  );
}

export function AdminSubscriptionsScreen() {
  return <AdminWebOnly title="موافقات الاشتراكات" icon={<CreditCard size={24} color={colors.terracotta} />} webPath="/admin/subscriptions" webLabel="فتح لوحة الويب" />;
}

export function AdminSystemEventsScreen() {
  return <AdminWebOnly title="أحدث أحداث النظام" icon={<Bell size={24} color={colors.terracotta} />} webPath="/admin/system-events" webLabel="فتح لوحة الويب" />;
}

export function AdminAuditLogsScreen() {
  return <AdminWebOnly title="سجل التدقيق" icon={<FileText size={24} color={colors.terracotta} />} webPath="/admin/audit-logs" webLabel="فتح لوحة الويب" />;
}

export function AdminTelegramScreen() {
  return <AdminWebOnly title="تكامل تليجرام" icon={<Send size={24} color={colors.terracotta} />} webPath="/admin/telegram" webLabel="فتح لوحة الويب" />;
}

export function AdminSettingsScreen() {
  const logout = useAuth((s) => s.logout);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>الإعدادات</Text>
        {/* r131-F10 (fix 1 completion): PressableScale — was a silent raw Pressable. */}
        <PressableScale onPress={logout} accessibilityLabel="تسجيل الخروج" style={{ paddingVertical: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}
