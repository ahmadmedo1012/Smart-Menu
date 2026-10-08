import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle } from "lucide-react-native";

import { Text } from "@/components/ui/Text";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * r118-B3 (A6 P1-1): the app previously had ZERO crash containment — one
 * malformed API payload (e.g. `stats.recentOrders.slice()` on undefined in
 * OwnerDashboardScreen) took the whole process down to the native
 * "app keeps stopping" dialog. This is a dependency-free class boundary
 * (function components cannot catch render errors) mounted once around the
 * root navigator in App.tsx.
 *
 * Brand styling follows the app-wide inline token set (bg #070B16, card
 * #0D1428, border #1B2444, accent #E9B44C, text #F2EFE6 / muted #8E97B8) —
 * there is no shared color-constants module; every screen inlines these.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // The app has no logger — console.error is React Native's crash channel
    // (Metro / LogBox / device logs). The codebase keeps console.* out of app
    // logic by convention; a caught crash trace is the one place it belongs.
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    // Recovery = remount: the children were unmounted while the fallback
    // showed, so flipping hasError back re-runs the navigation tree from its
    // initial route — the public menu/landing for signed-out users, the
    // dashboard for signed-in ones. There is no navigation ref in this app
    // (RootNavigator mounts two mutually-exclusive containers plus an overlay
    // container, so a single ref would be ambiguous), so «العودة للقائمة»
    // resets the boundary too — which lands the user on that same initial
    // screen. «إعادة المحاولة» is the same operation under its own label so
    // users can act on whichever promise they read first.
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              width: 72, height: 72, borderRadius: 9999, backgroundColor: "#0D1428",
              borderWidth: 1, borderColor: "#1B2444", alignItems: "center",
              justifyContent: "center", marginBottom: 24,
            }}>
            <AlertTriangle size={30} color="#E9B44C" />
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: "#F2EFE6", textAlign: "center" }}>
            حدث خطأ غير متوقع
          </Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            نعتذر عن ذلك، يمكنك إعادة المحاولة
          </Text>
          <Pressable
            onPress={this.reset}
            accessibilityLabel="إعادة المحاولة"
            style={({ pressed }) => ({
              marginTop: 28, backgroundColor: "#E9B44C", borderRadius: 10,
              paddingVertical: 12, paddingHorizontal: 32, opacity: pressed ? 0.9 : 1,
            })}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: "#05070F" }}>إعادة المحاولة</Text>
          </Pressable>
          <Pressable
            onPress={this.reset}
            accessibilityLabel="العودة للقائمة"
            hitSlop={8}
            style={({ pressed }) => ({ marginTop: 4, paddingVertical: 12, paddingHorizontal: 32, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: "#8E97B8" }}>العودة للقائمة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}
