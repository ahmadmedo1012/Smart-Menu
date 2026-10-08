import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Users, Store, CreditCard, Settings, Bell, FileText, Send } from "lucide-react-native";
import { EmptyState, ComingSoon } from "@/components/ui";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useAuth } from "@/store/auth";
import { colors } from "@/theme/colors";
import type { RootNavigation } from "@/navigation/types";

/**
 * r126-M10 (A6 P1-3): the 10 admin management screens are honest coming-soon
 * states now (ComingSoon) — they previously rendered EmptyStates titled like
 * real data surfaces («إدارة المستخدمين»), which reads as fetched-but-empty.
 * The dashboard nav hub + settings/logout are real and stay as they were.
 * Full admin tooling remains a documented follow-up (web parity work).
 */

export function AdminDashboardScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigation = useNavigation<RootNavigation>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: colors.sand, marginBottom: 4 }}>لوحة المدير</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, marginBottom: 24 }}>أهلًا {user?.name || user?.username}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color={colors.sand} />} label="المستخدمون" onPress={() => navigation.navigate("AdminUsers")} /> : null}
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color={colors.sand} />} label="المدراء" onPress={() => navigation.navigate("AdminAdmins")} /> : null}
          <AdminAction icon={<Bell size={20} color={colors.sand} />} label="أحداث النظام" onPress={() => navigation.navigate("AdminSystemEvents")} />
          {user?.role === "super_admin" ? <AdminAction icon={<FileText size={20} color={colors.sand} />} label="سجل التدقيق" onPress={() => navigation.navigate("AdminAuditLogs")} /> : null}
          <AdminAction icon={<Send size={20} color={colors.sand} />} label="تيليجرام" onPress={() => navigation.navigate("AdminTelegram")} />
          <AdminAction icon={<Settings size={20} color={colors.sand} />} label="الإعدادات" onPress={() => navigation.navigate("AdminSettings")} />
        </View>
        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="تسجيل الخروج" style={{ marginTop: 32, padding: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.hairline }}>
      {icon}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, textAlign: "center" }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </PressableScale>
  );
}

export function AdminRestaurantsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="إدارة المطاعم" icon={<Store size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminUsersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="إدارة المستخدمين" icon={<Users size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminAdminsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="إدارة المدراء الفرعيين" icon={<Users size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminOrdersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="جميع الطلبات" icon={<CreditCard size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminOrderDetailScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="تفاصيل الطلب" icon={<CreditCard size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminSubscriptionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="موافقات الاشتراكات" icon={<CreditCard size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminSystemEventsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="أحدث أحداث النظام" icon={<Bell size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminAuditLogsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="سجل التدقيق" icon={<FileText size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminTelegramScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ComingSoon title="تكامل تيليجرام" icon={<Send size={30} color={colors.gold} />} />
    </SafeAreaView>
  );
}

export function AdminSettingsScreen() {
  const logout = useAuth((s) => s.logout);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>الإعدادات</Text>
        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="تسجيل الخروج" style={{ paddingVertical: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
