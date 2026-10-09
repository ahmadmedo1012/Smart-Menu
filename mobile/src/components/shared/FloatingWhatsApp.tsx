import { View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import * as Linking from "expo-linking";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { PressableScale } from "@/components/motion/PressableScale";
import { buildWhatsAppShareUrl, normalizeWaNumber } from "@/lib/whatsapp";
import { elevation } from "@/theme/elevation";
import { colors } from "@/theme/colors";
import { motion } from "@/theme/motion";

const DEFAULT_NUMBER = (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? "+218910089975";
const SUPPORT_TEXT = "مرحبًا، أحتاج مساعدة بخصوص Smart Menu";

export function FloatingWhatsApp({ number = DEFAULT_NUMBER }: { number?: string }) {
  // r126-M4 (A6 P3-10): was a 600ms delayed mount with NO fade — a timer that
  // produced nothing perceptible. Now the button is present immediately and
  // fades in on the Madarek base rung (240ms); reduced-motion shows it as-is.
  // r127-F8: duration rides theme/motion (was a raw 240 literal).
  const reducedMotion = useReducedMotion();
  // r132-F2b (A4 S4): the deferred safe-area fix — bottom was a hardcoded 96,
  // the app's ONLY floating element that ignored insets (every sibling rides
  // 16 + insets.bottom). 62 + insets keeps the shipped 96px placement on the
  // 34px-inset iPhone class while adapting to inset-less devices, landscape
  // and larger insets (the FAB lives on the landing route only — no sticky
  // CTA to clear, so the offset is purely the home-indicator/gesture lane).
  const insets = useSafeAreaInsets();
  const open = () => {
    // r132-F2b (A10 #3): the inline THIRD copy of the normalizer is gone —
    // the FAB rides the ONE lib implementation, which now carries the web
    // r109-F2 trunk-0 fix (09… → 218…). The r103-F9 inline copy predates it:
    // a local-format support number (09…) opened a dead wa.me/09… link.
    const digits = normalizeWaNumber(number);
    if (!digits) return;
    void Linking.openURL(buildWhatsAppShareUrl(SUPPORT_TEXT, digits));
  };
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", end: 16, bottom: 62 + insets.bottom, zIndex: 60 }}>
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(motion.BASE)}>
        {/* r131-F10 (A2 P1-4): the FAB rides PressableScale (0.97@80ms) —
            the app's most-visible floating control was a silent tap. The
            shadow stays the NEUTRAL elev color (colors.shadow near-void) —
            no brand-tinted glow (fix 7 verification: the mobile WhatsApp
            CTAs carry no colored shadow; the web OrderDialog twin's
            shadow-whatsapp/20 is a web-side fix).
            r132-F2b (A4 N1): the shadow no longer hand-rolls off-ladder —
            the FAB consumes theme/elevation rung 6 (the floating-CTA rung
            the money path has shipped since r131, byte-identical values). */}
        <PressableScale onPress={open} accessibilityLabel="تواصل مع الدعم عبر واتساب" style={{
          width: 56, height: 56, borderRadius: 9999, backgroundColor: colors.whatsapp,
          alignItems: "center", justifyContent: "center",
          ...elevation[6],
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
