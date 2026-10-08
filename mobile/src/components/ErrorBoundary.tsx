import { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TriangleAlert } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

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
 * r126-M7: brand styling now rides the shared Madarek palette
 * (src/theme/colors.ts) like every other surface — the old comment about
 * "no shared color-constants module" is obsolete.
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          {/* r131-F10 (fix 3): the crash well converges on the canonical
              56px r-xl state tile in the ROSE error family (SO states.tsx
              ErrorState twin) — was a 72px surface circle with a gold glyph,
              the pre-r131 off-family error grammar. */}
          <View
            style={{
              width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.roseBg,
              alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}>
            <TriangleAlert size={24} color={colors.rose} />
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, textAlign: "center" }}>
            حدث خطأ غير متوقع
          </Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            نعتذر عن ذلك، يمكنك إعادة المحاولة
          </Text>
          {/* r131-F10 (A2 P1-4 + fix 6): both recovery actions ride
              PressableScale — the hand-rolled 0.9/0.7 opacity registers
              join the 0.97@80ms ladder. */}
          <PressableScale
            onPress={this.reset}
            accessibilityLabel="إعادة المحاولة"
            style={{
              marginTop: 28, backgroundColor: colors.gold, borderRadius: radius.md,
              paddingVertical: 12, paddingHorizontal: 32,
            }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.void }}>إعادة المحاولة</Text>
          </PressableScale>
          <PressableScale
            onPress={this.reset}
            accessibilityLabel="العودة للقائمة"
            hitSlop={8}
            style={{ marginTop: 4, paddingVertical: 12, paddingHorizontal: 32 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.muted }}>العودة للقائمة</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }
}
