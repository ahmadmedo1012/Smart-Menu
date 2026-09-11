import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
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

const renderToast = (props: { type: "success" | "error" | "info"; text1: string; text2?: string }) => {
  const accentColor = props.type === "success" ? "#5b8c5a" : props.type === "error" ? "#c0392b" : "#3a8eb5";
  return (
    <View style={{
      backgroundColor: "#070503", borderLeftWidth: 4, borderLeftColor: accentColor,
      borderRadius: 12, padding: 12, marginHorizontal: 16, marginVertical: 8,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
      width: "92%", maxWidth: 460, alignSelf: "center",
    }}>
      <Text style={{ color: "#ebe7e2", fontFamily: "Cairo", fontSize: 14, fontWeight: "600" }}>{props.text1}</Text>
      {props.text2 ? (
        <Text style={{ color: "#9c948a", fontFamily: "Cairo", fontSize: 12, marginTop: 2 }}>{props.text2}</Text>
      ) : null}
    </View>
  );
};

const customToastConfig = {
  success: (props: any) => renderToast({ ...props, type: "success" }),
  error: (props: any) => renderToast({ ...props, type: "error" }),
  info: (props: any) => renderToast({ ...props, type: "info" }),
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </GestureHandlerRootView>
      <Toast config={customToastConfig as any} />
    </QueryClientProvider>
  );
}

export const toast = {
  success: (text1: string, text2?: string) => Toast.show({ type: "success", text1, text2 }),
  error: (text1: string, text2?: string) => Toast.show({ type: "error", text1, text2 }),
  info: (text1: string, text2?: string) => Toast.show({ type: "info", text1, text2 }),
};
