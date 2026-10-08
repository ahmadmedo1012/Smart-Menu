import { View, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CheckCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { toast } from "@/app/providers";
import { toArabicNumber } from "@/lib/format";
import type { RootNavigation } from "@/navigation/types";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Madarek dark status pair: success soft bg #0F241C + success ink #7FD39A */}
        <View style={{ width: 80, height: 80, borderRadius: 9999, backgroundColor: colors.mintBg, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <CheckCircle size={48} color={colors.mint} />
        </View>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: colors.sand, marginBottom: 8, textAlign: "center" }}>تم إرسال طلبك بنجاح</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20, marginBottom: 4 }}>
          {waUrl ? "سُجّل طلبك — أرسله للمطعم عبر واتساب من الزر أدناه" : "تم إرسال طلبك عبر واتساب إلى المطعم"}
        </Text>
        {displayId ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.gold, fontWeight: "600", marginBottom: 32 }}>رقم الطلب: {toArabicNumber(displayId)}</Text> : null}
        <View style={{ gap: 12, width: "100%" }}>
          {waUrl ? (
            <Button title="إرسال الطلب عبر واتساب" onPress={onSendWhatsApp} size="lg" className="w-full" />
          ) : null}
          {/* r126 (A6 P3-5): "العودة للمنيو" navigated to LANDING, not the menu
              the customer ordered from. From the checkout flow (Menu →
              OrderConfirmed) goBack returns to that menu; a cold deep-link
              entry has no stack below — fall back to Landing. */}
          <Button title="العودة للمنيو" onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate("Landing"); }} size="lg" variant={waUrl ? "outline" : "primary"} className="w-full" />
          <Button title="مشاركة Smart Menu" variant="outline" onPress={onShare} size="lg" className="w-full" />
        </View>
      </View>
    </SafeAreaView>
  );
}
