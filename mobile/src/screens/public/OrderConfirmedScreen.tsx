import { View, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CheckCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { toast } from "@/app/providers";
import { toArabicNumber } from "@/lib/format";
import type { RootNavigation } from "@/navigation/types";

export function OrderConfirmedScreen() {
  const route = useRoute();
  const navigation = useNavigation<RootNavigation>();
  // r103-N11: in-app flow passes orderId; web deep links (?orderNo=X) pass orderNo
  const { orderId, orderNo: orderNoParam, waUrl } = (route.params || {}) as { orderId?: string; orderNo?: string; waUrl?: string };
  const displayId = orderId ?? orderNoParam;

  const onShare = async () => {
    const url = `${process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly"}/menu`;
    await Clipboard.setStringAsync(`جرّب Smart Menu — ${url}`);
    toast.success("تم نسخ الرابط");
  };

  // r103-N4: when the automatic WhatsApp jump failed at checkout (app missing
  // / OS blocked it), the order is ALREADY placed — this button retries just
  // the handoff, never a second POST.
  const onSendWhatsApp = async () => {
    if (!waUrl) return;
    try {
      await Linking.openURL(waUrl);
    } catch {
      toast.error("تعذّر فتح واتساب — تأكد من تثبيت التطبيق");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* r103-N6: #23a136 — the web globals.css success token (was #5b8c5a) */}
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#23a136", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <CheckCircle size={48} color="#fff" />
        </View>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 8, textAlign: "center" }}>تم إرسال طلبك بنجاح</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", lineHeight: 20, marginBottom: 4 }}>
          {waUrl ? "سُجّل طلبك — أرسله للمطعم عبر واتساب من الزر أدناه" : "تم إرسال طلبك عبر واتساب إلى المطعم"}
        </Text>
        {displayId ? <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#bc4700", fontWeight: "600", marginBottom: 32 }}>رقم الطلب: {toArabicNumber(displayId)}</Text> : null}
        <View style={{ gap: 12, width: "100%" }}>
          {waUrl ? (
            <Button title="إرسال الطلب عبر واتساب" onPress={onSendWhatsApp} size="lg" className="w-full" />
          ) : null}
          <Button title="العودة للمنيو" onPress={() => navigation.navigate("Landing")} size="lg" variant={waUrl ? "outline" : "orange"} className="w-full" />
          <Button title="مشاركة Smart Menu" variant="outline" onPress={onShare} size="lg" className="w-full" />
        </View>
      </View>
    </SafeAreaView>
  );
}
