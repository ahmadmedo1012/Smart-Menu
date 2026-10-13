/**
 * Shared React Navigation chrome (r126, A6 P3-9 dedup + the M1 header fix).
 *
 * The same NAV_THEME + header/tab options block was duplicated across 5
 * stack files, and every copy rode the iOS bold bug: headerTitleStyle and
 * tabBarLabelStyle set `fontFamily: "IBM Plex Sans Arabic"` (the 400-only
 * family) + `fontWeight: "600"` — native-stack headers and tab labels do NOT
 * pass through the app <Text> wrapper, so on iOS they rendered Regular.
 * Native chrome must reference the per-weight family directly.
 */
import { DefaultTheme, type Theme } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { BottomTabNavigationOptions, BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/motion/PressableScale";
import { PLEX_SEMIBOLD } from "@/theme/typography";
import { colors } from "@/theme/colors";

/**
 * Phase 6 (P6-2-c): the LIGHT-first culinary NavigationContainer theme —
 * the warm twin of the web Phase-5 chrome (cream ground, espresso ink,
 * terracotta accent; DefaultTheme is the base — the warm night kitchen
 * stays the documented opt-in twin, adopted by the theme-toggle wave).
 */
export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.gold,   // terracotta accent
    background: colors.night, // cream page ground
    card: colors.surface,       // raised plate
    text: colors.sand,       // espresso ink
    border: colors.hairline,     // warm hairline
    notification: colors.rose, // deep rose ink
  },
};

/** Native-stack chrome — header on cream, espresso ink, SemiBold Plex titles. */
export const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.night },
  headerTintColor: colors.sand,
  // r126-M1: the native header does not go through the <Text> resolver —
  // point straight at the 600 family instead of fontWeight on the 400 file.
  headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.night },
};

/**
 * r132-F2b (A4 S9, r131 fleet ruling "press 0.97 controls / 0.93 nav"): the
 * bottom-nav thumb press rides the STRONGER 0.93@80ms register — the one
 * rung PressableScale's ladder reserves for bottom-nav thumbs. Both tab bars
 * (AdminStack + OwnerStack) ride react-navigation's native feedback with no
 * custom register before this; the shared tab chrome below (r133-F3: the
 * useTabScreenOptions factory) wires them both at once. Native props
 * (role=tab, selected state, label) pass straight through PressableScale.
 */
function TabBarButton(props: BottomTabBarButtonProps) {
  return <PressableScale scaleTo={0.93} {...props} />;
}

/**
 * Bottom-tab chrome — raised-plate bar, terracotta active tint, SemiBold
 * labels (Phase 6: warm light treatment).
 *
 * r133-F3 (A4 S2): an INSETS-AWARE factory, not a static object. The old
 * static `{ height: 64, paddingBottom: 8 }` sat LAST in react-navigation's
 * tabBarStyle array (BottomTabBar.js: `[...defaults, { height, paddingBottom:
 * insets.bottom }, tabBarStyle]` — later entries win), so our paddingBottom: 8
 * REPLACED the library's insets.bottom and the 11px labels rendered 8px from
 * the physical screen bottom — squarely inside the home-indicator/gesture
 * zone on every notched device. Now both keys carry the inset: the content
 * zone stays the shipped 52px (64 − 8 breathing − 4 top) on every device and
 * the inset lands BELOW it. Non-notched devices (insets.bottom = 0) render
 * byte-identical to the previous bar.
 */
export function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.night },
    headerTintColor: colors.sand,
    headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
    headerShadowVisible: false,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.hairline,
      height: 64 + insets.bottom,
      paddingBottom: 8 + insets.bottom,
      paddingTop: 4,
    },
    tabBarActiveTintColor: colors.gold,
    tabBarInactiveTintColor: colors.muted,
    // r126-M1: same fix as headers — tab labels are native chrome.
    tabBarLabelStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 11 },
    tabBarButton: TabBarButton,
  };
}
