import { View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import * as Linking from "expo-linking";
import Animated, { FadeIn } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors } from "@/theme/colors";
import { motion } from "@/theme/motion";

const DEFAULT_NUMBER = (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? "+218910089975";

export function FloatingWhatsApp({ number = DEFAULT_NUMBER }: { number?: string }) {
  // r126-M4 (A6 P3-10): was a 600ms delayed mount with NO fade — a timer that
  // produced nothing perceptible. Now the button is present immediately and
  // fades in on the Madarek base rung (240ms); reduced-motion shows it as-is.
  // r127-F8: duration rides theme/motion (was a raw 240 literal).
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
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(motion.BASE)}>
        {/* r131-F10 (A2 P1-4): the FAB rides PressableScale (0.97@80ms) —
            the app's most-visible floating control was a silent tap. The
            shadow stays the NEUTRAL elev color (colors.shadow near-void) —
            no brand-tinted glow (fix 7 verification: the mobile WhatsApp
            CTAs carry no colored shadow; the web OrderDialog twin's
            shadow-whatsapp/20 is a web-side fix). */}
        <PressableScale onPress={open} accessibilityLabel="تواصل مع الدعم عبر واتساب" style={{
          width: 56, height: 56, borderRadius: 9999, backgroundColor: colors.whatsapp,
          alignItems: "center", justifyContent: "center",
          shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
        }}>
          {/* r127-F8: on-accent ink law — the web twin paints this glyph with
              text-orange-foreground (#05070F void) on the green; the mobile
              FAB was the app's LAST hardcoded icon hex (white-on-green). */}
          <MessageCircle size={28} color={colors.void} />
        </PressableScale>
      </Animated.View>
    </View>
  );
}
