import { Pressable, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";

const DEFAULT_NUMBER = (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? "+218910089975";

export function FloatingWhatsApp({ number = DEFAULT_NUMBER }: { number?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 600); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  const open = () => {
    // r103-F9: parity with the web normalizeWaNumber — strip a leading "00"
    // (international prefix) and validate 8–15 digits; an invalid stored
    // number must not open a dead wa.me/00… link.
    let digits = number.replace(/[^\d]/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length < 8 || digits.length > 15) return;
    void Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent("مرحبًا، أحتاج مساعدة بخصوص Smart Menu")}`);
  };
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", end: 16, bottom: 96, zIndex: 60 }}>
      <Pressable onPress={open} accessibilityLabel="تواصل مع الدعم عبر واتساب" style={({ pressed }) => ({
        width: 56, height: 56, borderRadius: 28, backgroundColor: "#25d366",
        alignItems: "center", justifyContent: "center", opacity: pressed ? 0.9 : 1,
        shadowColor: "#02040C", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
      })}>
        <MessageCircle size={28} color="#fff" />
      </Pressable>
    </View>
  );
}
