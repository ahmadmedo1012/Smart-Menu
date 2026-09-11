import { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, DarkTheme, type InitialState } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/core";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { X } from "lucide-react-native";

import { useAuth } from "@/store/auth";
import { PublicStack } from "./PublicStack";
import { AuthStack } from "./AuthStack";
import { OwnerStack } from "./OwnerStack";
import { AdminStack } from "./AdminStack";
import { linking } from "./linking";
import { ADMIN_ROLES } from "@/lib/auth-types";

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#bc4700", background: "#010000", card: "#070503",
    text: "#ebe7e2", border: "#1f1813", notification: "#e62b34",
  },
};

type PublicRoute =
  | { name: "Landing" }
  | { name: "Pricing" }
  | { name: "Terms" }
  | { name: "Privacy" }
  | { name: "OrderConfirmed"; params?: { orderId?: string } }
  | { name: "Menu"; params: { slug: string; ref?: string } };

/**
 * r103-N7: the PUBLIC (unauthenticated) NavigationContainer consumes the
 * launch URL via its own linking config — once that branch has rendered, a
 * later login (stack swap → AuthenticatedApp mount) must NOT replay the SAME
 * Linking.getInitialURL() result over the dashboard. Set during render of the
 * public branch; read by AuthenticatedApp's cold-start handler below.
 */
let publicStackRendered = false;

/**
 * r102-M6: map a public web URL to its PublicStack route.
 * Returns null for anything that is NOT a public path (owner/admin screens
 * keep their existing behavior — those links only make sense in the browser).
 */
function publicRouteForUrl(url: string): PublicRoute | null {
  let parsed: ReturnType<typeof Linking.parse>;
  try {
    parsed = Linking.parse(url);
  } catch {
    return null;
  }
  const path = (parsed.path ?? "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path) return { name: "Landing" };
  if (path === "pricing") return { name: "Pricing" };
  if (path === "terms") return { name: "Terms" };
  if (path === "privacy") return { name: "Privacy" };
  if (path.startsWith("order-confirmed")) {
    const q = parsed.queryParams ?? {};
    const orderId = Array.isArray(q.orderNo) ? q.orderNo[0] : (q.orderNo as string | undefined);
    return { name: "OrderConfirmed", params: orderId ? { orderId } : undefined };
  }
  const menu = path.match(/^menu\/([a-z0-9-]{1,100})$/);
  if (menu) {
    const q = parsed.queryParams ?? {};
    const rawRef = Array.isArray(q.ref) ? q.ref[0] : (q.ref as string | undefined);
    const ref = rawRef && /^[A-Za-z0-9-]{4,24}$/.test(rawRef) ? rawRef.toUpperCase() : undefined;
    return { name: "Menu", params: { slug: menu[1], ...(ref ? { ref } : {}) } };
  }
  return null;
}

/**
 * r102-M6: public browsing on top of an authenticated session. The root swaps
 * entire stacks by auth state, so a signed-in owner tapping their own QR
 * (https://menu.smart-link.ly/menu/x from WhatsApp) previously did NOTHING —
 * the link config only resolves inside PublicStack. Now such links open the
 * public stack as a dismissible overlay (independent NavigationContainer with
 * an explicit initial state — deterministic, no linking race), covering both
 * warm starts (url event) and cold starts (getInitialURL).
 */
function PublicLinkOverlay({ route, onClose }: { route: PublicRoute; onClose: () => void }) {
  const initialState: InitialState = {
    index: 0,
    routes: [
      {
        name: route.name,
        params: "params" in route ? (route.params as Record<string, unknown>) : undefined,
      },
    ],
  };
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 200 }]}>
      {/* r102-M6: v7 pattern for a second container — NavigationIndependentTree
          clears the parent's navigation/linking contexts so this public stack
          behaves standalone instead of tripping "multiple containers" guards. */}
      <NavigationIndependentTree>
        <NavigationContainer theme={NAV_THEME} initialState={initialState}>
          <PublicStack />
        </NavigationContainer>
      </NavigationIndependentTree>
      <Pressable
        onPress={onClose}
        accessibilityLabel="إغلاق والعودة إلى لوحة التحكم"
        hitSlop={8}
        style={{
          position: "absolute", top: 54, left: 16, width: 40, height: 40, borderRadius: 20,
          backgroundColor: "rgba(31,24,19,0.92)", alignItems: "center", justifyContent: "center",
          borderWidth: 1, borderColor: "#1f1813",
        }}>
        <X size={20} color="#ebe7e2" />
      </Pressable>
    </View>
  );
}

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const [publicRoute, setPublicRoute] = useState<PublicRoute | null>(null);
  const closeOverlay = useCallback(() => setPublicRoute(null), []);
  // r103-N7: consume the launch URL at most once per AuthenticatedApp lifetime —
  // Linking.getInitialURL() returns the same value for the whole JS run.
  const initialConsumed = useRef(false);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const route = publicRouteForUrl(url);
      if (route) setPublicRoute(route);
    };
    // Cold start with an authed session: NavigationContainer's own linking
    // cannot resolve a PUBLIC route inside an authed stack — do it manually.
    // But ONLY when the public container never consumed it already (N7) and
    // only on the first mount of this component.
    if (!publicStackRendered && !initialConsumed.current) {
      initialConsumed.current = true;
      void Linking.getInitialURL().then((u) => { if (u) handleUrl(u); });
    }
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {publicRoute ? <PublicLinkOverlay route={publicRoute} onClose={closeOverlay} /> : null}
    </View>
  );
}

export function RootNavigator() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  if (status === "loading" || status === "idle") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#010000" }}>
        <ActivityIndicator size="large" color="#bc4700" />
      </View>
    );
  }

  if (status === "unauthenticated" || !user) {
    // r103-N7: this branch's NavigationContainer consumes the launch URL via
    // its own linking — flag it so a later login swap never replays it.
    publicStackRendered = true;
    return (
      <NavigationContainer theme={NAV_THEME} linking={linking}>
        <PublicStack />
      </NavigationContainer>
    );
  }

  const Inner = ADMIN_ROLES.includes(user.role) ? (
    <AdminStack />
  ) : user.role === "owner" ? (
    <OwnerStack />
  ) : user.subscriptionStatus === "UNPAID" || user.subscriptionStatus === "EXPIRED" || user.subscriptionStatus === "REJECTED" ? (
    <AuthStack />
  ) : (
    <OwnerStack />
  );

  return (
    <NavigationContainer theme={NAV_THEME} linking={linking}>
      <AuthenticatedApp>
        {Inner}
      </AuthenticatedApp>
    </NavigationContainer>
  );
}
