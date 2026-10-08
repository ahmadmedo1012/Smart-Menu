import { Pressable, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import * as Linking from "expo-linking";
import Animated, { FadeIn } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

const DEFAULT_NUMBER = (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? "+218910089975";

export function FloatingWhatsApp({ number = DEFAULT_NUMBER }: { number?: string }) {
  // r126-M4 (A6 P3-10): was a 600ms delayed mount with NO fade — a timer that
  // produced nothing perceptible. Now the button is present immediately and
  // fades in on the Madarek base rung (240ms); reduced-motion shows it as-is.
  const reducedMotion = useReducedMotion();
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
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240)}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="تواصل مع الدعم عبر واتساب" style={{
          width: 56, height: 56, borderRadius: 9999, backgroundColor: "#25d366",
          alignItems: "center", justifyContent: "center",
          shadowColor: "#02040C", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
        }}>
          <MessageCircle size={28} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}
