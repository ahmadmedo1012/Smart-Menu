import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

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

const renderToast = ({ type, text1, text2 }: { type: "success" | "error" | "info"; text1?: string; text2?: string }) => {
  // Madarek dark status tokens (1:1 with web globals.css): success mint
  // #7FD39A, danger rose #F0938F, info sky #8FBBF2. Toast surface rides the
  // Madarek card #0D1428 with the accent on the RTL start edge.
  const accentColor = type === "success" ? "#7FD39A" : type === "error" ? "#F0938F" : "#8FBBF2";
  return (
    <View style={{
      // RTL: the accent rides the START edge — right side in this forced-RTL app
      backgroundColor: "#0D1428", borderRightWidth: 4, borderRightColor: accentColor,
      borderRadius: 12, padding: 12, marginHorizontal: 16, marginVertical: 8,
      shadowColor: "#02040C", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
      width: "92%", maxWidth: 460, alignSelf: "center",
    }}>
      <Text style={{ color: "#F2EFE6", fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600" }}>{text1}</Text>
      {text2 ? (
        <Text style={{ color: "#8E97B8", fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 2 }}>{text2}</Text>
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
