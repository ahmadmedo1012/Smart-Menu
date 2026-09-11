import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { View, Text } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, staleTime: 30_000, gcTime: 5 * 60_000,
      refetchOnWindowFocus: true, refetchOnReconnect: true, networkMode: "online",
    },
    mutations: { retry: 0, networkMode: "online" },
  },
});

const renderToast = ({ type, text1, text2 }: { type: "success" | "error" | "info"; text1?: string; text2?: string }) => {
  // r103-N6: web palette tokens (globals.css) — success #23a136, destructive
  // #e62b34, info #348dcf (were #5b8c5a/#c0392b/#3a8eb5 — the drift the M8
  // alignment missed: the toasts M3/M9 added rendered in the OLD palette).
  const accentColor = type === "success" ? "#23a136" : type === "error" ? "#e62b34" : "#348dcf";
  return (
    <View style={{
      // RTL: the accent rides the START edge — right side in this forced-RTL app
      backgroundColor: "#070503", borderRightWidth: 4, borderRightColor: accentColor,
      borderRadius: 12, padding: 12, marginHorizontal: 16, marginVertical: 8,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
      width: "92%", maxWidth: 460, alignSelf: "center",
    }}>
      <Text style={{ color: "#ebe7e2", fontFamily: "Cairo", fontSize: 14, fontWeight: "600" }}>{text1}</Text>
      {text2 ? (
        <Text style={{ color: "#9c948a", fontFamily: "Cairo", fontSize: 12, marginTop: 2 }}>{text2}</Text>
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
