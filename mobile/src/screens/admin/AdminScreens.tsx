import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Users, Store, CreditCard, Settings, Bell, FileText, Send } from "lucide-react-native";
import { EmptyState } from "@/components/ui";
import { useAuth } from "@/store/auth";
import type { RootNavigation } from "@/navigation/types";

export function AdminDashboardScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigation = useNavigation<RootNavigation>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 4 }}>لوحة المدير</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", marginBottom: 24 }}>أهلًا {user?.name || user?.username}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color="#ebe7e2" />} label="المستخدمون" onPress={() => navigation.navigate("AdminUsers")} /> : null}
          {user?.role === "super_admin" ? <AdminAction icon={<Users size={20} color="#ebe7e2" />} label="المدراء" onPress={() => navigation.navigate("AdminAdmins")} /> : null}
          <AdminAction icon={<Bell size={20} color="#ebe7e2" />} label="أحداث النظام" onPress={() => navigation.navigate("AdminSystemEvents")} />
          {user?.role === "super_admin" ? <AdminAction icon={<FileText size={20} color="#ebe7e2" />} label="سجل التدقيق" onPress={() => navigation.navigate("AdminAuditLogs")} /> : null}
          <AdminAction icon={<Send size={20} color="#ebe7e2" />} label="تيليجرام" onPress={() => navigation.navigate("AdminTelegram")} />
          <AdminAction icon={<Settings size={20} color="#ebe7e2" />} label="الإعدادات" onPress={() => navigation.navigate("AdminSettings")} />
        </View>
        <Pressable onPress={logout} style={{ marginTop: 32, padding: 12, alignItems: "center", backgroundColor: "#1f1813", borderRadius: 8 }}>
          <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#c0392b", fontWeight: "700" }}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: "31%", aspectRatio: 1, backgroundColor: "#070503", borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#1f1813", opacity: pressed ? 0.8 : 1 })}>
      {icon}
      <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

export function AdminRestaurantsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>المطاعم</Text>
        <EmptyState title="إدارة المطاعم" icon={<Store size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminUsersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>المستخدمون</Text>
        <EmptyState title="إدارة المستخدمين" icon={<Users size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminAdminsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>المدراء</Text>
        <EmptyState title="إدارة المدراء الفرعيين" icon={<Users size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminOrdersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>الطلبات</Text>
        <EmptyState title="جميع الطلبات" icon={<CreditCard size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminOrderDetailScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>تفاصيل الطلب</Text>
      </View>
    </SafeAreaView>
  );
}

export function AdminSubscriptionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>الاشتراكات</Text>
        <EmptyState title="موافقات الاشتراكات" icon={<CreditCard size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminSystemEventsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>أحداث النظام</Text>
        <EmptyState title="أحدث الأحداث" icon={<Bell size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminAuditLogsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>سجل التدقيق</Text>
        <EmptyState title="سجل التدقيق" icon={<FileText size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminTelegramScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 18, fontWeight: "700", color: "#ebe7e2" }}>إعدادات تيليجرام</Text>
        <EmptyState title="تكامل تيليجرام" icon={<Send size={32} color="#9c948a" />} />
      </View>
    </SafeAreaView>
  );
}

export function AdminSettingsScreen() {
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
