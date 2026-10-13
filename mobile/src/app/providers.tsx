import type { PropsWithChildren } from "react";
import { AccessibilityInfo, AppState, Easing, type AppStateStatus } from "react-native";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { View } from "react-native";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors, pastelFamilies } from "@/theme/colors";
import { elevation } from "@/theme/elevation";
import { radius } from "@/theme/radius";
import { motion } from "@/theme/motion";
import { bezierPoints, easings } from "@/theme/easings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // r118-B3 (A6 P3-6): retry as a predicate — up to 2 retries (3 attempts
      // total) with the default exponential backoff. Was a flat `retry: 1`;
      // the predicate form also lets future callers opt out per-query.
      retry: (failureCount: number) => failureCount < 2,
      staleTime: 30_000, gcTime: 5 * 60_000,
      refetchOnWindowFocus: true, refetchOnReconnect: true, networkMode: "online",
    },
    mutations: { retry: 0, networkMode: "online" },
  },
});

// r126-M5 (A6 P1-6): React Query is the app's data layer now — wire its
// focus manager to AppState so refetchOnWindowFocus + refetchInterval (the
// 15s orders poll) behave like the old usePollWhenVisible: no timers fire
// while the app is backgrounded, everything refetches on foreground return.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
    setFocused(state === "active");
  });
  return () => sub.remove();
});

/**
 * r132-F2b (A4 S3, porting the web r131-F4 fleet toast canon): the toast
 * surface is the premiumToast twin —
 *   · bottom-END placement (web: sonner bottom-left under dir=rtl; here the
 *     card rides alignSelf flex-end, which is the inline-end/physical-left
 *     edge in this forced-RTL app). Was top-positioned (the react-native-
 *     toast-message default) — the web ruling is bottom-end fleet-wide.
 *   · 28px icon well (r-md) on the PASTEL solid family ground with the -ink
 *     glyph (mint success / rose error / yellow info) — was a 4px accent
 *     stripe with no icon.
 *   · status coding = the 1px inline-START hairline (the card border stays
 *     1px; only borderStartColor flips per kind) — was a 4px accent slab.
 *   · ERROR toasts are MANUAL-DISMISS ONLY (autoHide: false — tap the card,
 *     the close button, or swipe). Was 4s auto-hide: "تعذّر إرسال الطلب"
 *     vanished before it could be read, and "تم تسجيل طلبك — تعذّر فتح
 *     واتساب" (an instruction the user must act on) disappeared with it.
 *   · SR announcements: every toast fires AccessibilityInfo
 *     .announceForAccessibility (TalkBack/VoiceOver were silent before) and
 *     the card carries accessibilityLiveRegion polite + role alert for the
 *     error family (the web role=alert/status tiering).
 *   · entrance/exit ride the ladder: 380ms (--t-slow) linear slide on
 *     --ease-out, mirroring the web animate-slide-up recipe.
 */
type ToastKind = "success" | "error" | "info";

const TOAST_WELL: Record<ToastKind, { bg: string; ink: string; hairline: string; Glyph: typeof CheckCircle2 }> = {
  // The warm section families (colors.ts SSOT) — solid soft ground + ink glyph.
  success: { bg: pastelFamilies.mint.bg, ink: pastelFamilies.mint.ink, hairline: colors.mint, Glyph: CheckCircle2 },
  error: { bg: pastelFamilies.rose.bg, ink: pastelFamilies.rose.ink, hairline: colors.rose, Glyph: AlertCircle },
  info: { bg: pastelFamilies.yellow.bg, ink: pastelFamilies.yellow.ink, hairline: colors.yellow, Glyph: Info },
};

const renderToast = ({
  type, text1, text2, onHide,
}: { type: ToastKind; text1?: string; text2?: string; onHide: () => void }) => {
  const well = TOAST_WELL[type];
  const Glyph = well.Glyph;
  return (
    <PressableScale
      onPress={onHide}
      accessibilityRole={type === "error" ? "alert" : "text"}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row", alignItems: "flex-start", gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline,
        // RTL: the status hairline rides the START edge (logical spelling —
        // same right edge in forced-RTL, direction-correct if the app flips).
        borderStartWidth: 1, borderStartColor: well.hairline,
        borderRadius: radius.lg, padding: 12,
        marginHorizontal: 16, marginVertical: 8,
        width: "92%", maxWidth: 460,
        // bottom-END anchor: inline-end = physical left under RTL (the web
        // twin's sonner bottom-left + dir=rtl).
        alignSelf: "flex-end",
        // r132-F2b (A4 N1): the toast shadow consumes theme/elevation rung 3
        // (the web premiumToast rides --elev-3).
        ...elevation[3],
      }}
    >
      {/* 28px pastel well — the fleet toast icon grammar (was no icon). */}
      <View style={{ width: 28, height: 28, borderRadius: radius.md, backgroundColor: well.bg, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        <Glyph size={16} color={well.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <Text style={{ color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600" }}>{text1}</Text>
        {text2 ? (
          <Text style={{ color: colors.muted, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 2 }}>{text2}</Text>
        ) : null}
      </View>
      {/* Manual-dismiss affordance (the web close button twin) — the ONLY
          way out of an error toast besides swipe/tap-anywhere; 32px lane +
          hitSlop 4 clears the 44px floor. */}
      <PressableScale
        onPress={onHide}
        hitSlop={4}
        accessibilityLabel="إغلاق"
        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", marginTop: -4, marginEnd: -4 }}
      >
        <X size={16} color={colors.muted} />
      </PressableScale>
    </PressableScale>
  );
};

const customToastConfig: ToastConfig = {
  success: ({ text1, text2, hide }) => renderToast({ type: "success", text1, text2, onHide: () => hide() }),
  error: ({ text1, text2, hide }) => renderToast({ type: "error", text1, text2, onHide: () => hide() }),
  info: ({ text1, text2, hide }) => renderToast({ type: "info", text1, text2, onHide: () => hide() }),
};

export function AppProviders({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </GestureHandlerRootView>
      <Toast
        config={customToastConfig}
        position="bottom"
        bottomOffset={16 + insets.bottom}
        animationConfig={{ type: "timing", duration: motion.SLOW, easing: Easing.bezier(...bezierPoints(easings.out)) }}
      />
    </QueryClientProvider>
  );
}

function showToast(kind: ToastKind, text1: string, text2?: string) {
  Toast.show({
    type: kind, text1, text2,
    position: "bottom",
    // r132-F2b (r131 fleet doctrine "error toasts manual-dismiss"): the
    // failure reason never auto-vanishes — success/info keep the 4s default.
    autoHide: kind !== "error",
  });
  // Live-region announcement: the custom toast surface renders outside the
  // accessibility tree the screen reader listens to — announce it explicitly
  // (the web twin relies on role=alert/status implicit aria-live).
  AccessibilityInfo.announceForAccessibility(text2 ? `${text1}. ${text2}` : text1);
}

export const toast = {
  success: (text1: string, text2?: string) => showToast("success", text1, text2),
  error: (text1: string, text2?: string) => showToast("error", text1, text2),
  info: (text1: string, text2?: string) => showToast("info", text1, text2),
};
