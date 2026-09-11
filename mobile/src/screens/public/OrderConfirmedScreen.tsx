import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CheckCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { toast } from "@/app/providers";
import { toArabicNumber } from "@/lib/format";

export function OrderConfirmedScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { orderId } = (route.params || {}) as { orderId?: string };

  const onShare = async () => {
    const url = `${process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly"}/menu`;
    await Clipboard.setStringAsync(`جرّب Smart Menu — ${url}`);
    toast.success("تم نسخ الرابط");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#5b8c5a", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <CheckCircle size={48} color="#fff" />
        </View>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 8, textAlign: "center" }}>تم إرسال طلبك بنجاح</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", lineHeight: 20, marginBottom: 4 }}>تم إرسال طلبك عبر واتساب إلى المطعم</Text>
        {orderId ? <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#bc4700", fontWeight: "600", marginBottom: 32 }}>رقم الطلب: {toArabicNumber(orderId)}</Text> : null}
        <View style={{ gap: 12, width: "100%" }}>
          <Button title="العودة للمنيو" onPress={() => navigation.navigate("Landing")} size="lg" className="w-full" />
          <Button title="مشاركة Smart Menu" variant="outline" onPress={onShare} size="lg" className="w-full" />
        </View>
      </View>
    </SafeAreaView>
  );
}
