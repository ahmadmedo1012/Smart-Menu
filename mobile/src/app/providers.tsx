import type { PropsWithChildren } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

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

const renderToast = ({ type, text1, text2 }: { type: "success" | "error" | "info"; text1?: string; text2?: string }) => {
  // Madarek dark status tokens (1:1 with web globals.css): success mint
  // #7FD39A, danger rose #F0938F, info sky #8FBBF2. Toast surface rides the
  // Madarek card #0D1428 with the accent on the RTL start edge.
  const accentColor = type === "success" ? colors.mint : type === "error" ? colors.rose : colors.sky;
  return (
    <View style={{
      // RTL (r130 W2-4): the accent rides the START edge — logical spelling
      // (borderStart*) renders the same right edge in this forced-RTL app
      // while staying direction-correct if the app ever flips.
      backgroundColor: colors.surface, borderStartWidth: 4, borderStartColor: accentColor,
      borderRadius: 12, padding: 12, marginHorizontal: 16, marginVertical: 8,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
      width: "92%", maxWidth: 460, alignSelf: "center",
    }}>
      <Text style={{ color: colors.sand, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600" }}>{text1}</Text>
      {text2 ? (
        <Text style={{ color: colors.muted, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 2 }}>{text2}</Text>
      ) : null}
    </View>
  );
};

const customToastConfig: ToastConfig = {
  success: ({ text1, text2 }) => renderToast({ type: "success", text1, text2 }),
  error: ({ text1, text2 }) => renderToast({ type: "error", text1, text2 }),
  info: ({ text1, text2 }) => renderToast({ type: "info", text1, text2 }),
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </GestureHandlerRootView>
      <Toast config={customToastConfig} />
    </QueryClientProvider>
  );
}

export const toast = {
  success: (text1: string, text2?: string) => Toast.show({ type: "success", text1, text2 }),
  error: (text1: string, text2?: string) => Toast.show({ type: "error", text1, text2 }),
  info: (text1: string, text2?: string) => Toast.show({ type: "info", text1, text2 }),
};
