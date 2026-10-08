import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Users, Store, CreditCard, Settings, Bell, FileText, Send } from "lucide-react-native";
import { EmptyState } from "@/components/ui";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useAuth } from "@/store/auth";
import type { RootNavigation } from "@/navigation/types";
import { colors } from "@/theme/colors";

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
        <Pressable onPress={logout} style={{ marginTop: 32, padding: 12, alignItems: "center", backgroundColor: colors.surface2, borderRadius: 8 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.rose, fontWeight: "700" }}>تسجيل الخروج</Text>
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
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>المطاعم</Text>
        <EmptyState title="إدارة المطاعم" icon={<Store size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminUsersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>المستخدمون</Text>
        <EmptyState title="إدارة المستخدمين" icon={<Users size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminAdminsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>المدراء</Text>
        <EmptyState title="إدارة المدراء الفرعيين" icon={<Users size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminOrdersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>الطلبات</Text>
        <EmptyState title="جميع الطلبات" icon={<CreditCard size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminOrderDetailScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>تفاصيل الطلب</Text>
      </View>
    </SafeAreaView>
  );
}

export function AdminSubscriptionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>الاشتراكات</Text>
        <EmptyState title="موافقات الاشتراكات" icon={<CreditCard size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminSystemEventsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>أحداث النظام</Text>
        <EmptyState title="أحدث الأحداث" icon={<Bell size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminAuditLogsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>سجل التدقيق</Text>
        <EmptyState title="سجل التدقيق" icon={<FileText size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminTelegramScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>إعدادات تيليجرام</Text>
        <EmptyState title="تكامل تيليجرام" icon={<Send size={32} color={colors.muted} />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminSettingsScreen() {
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
