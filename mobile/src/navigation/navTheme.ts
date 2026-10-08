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
import { DarkTheme, type Theme } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import { PLEX_SEMIBOLD } from "@/theme/typography";

/** Madarek night palette for the NavigationContainer (matches the app). */
export const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#E9B44C",   // gold accent
    background: "#070B16", // night page ground
    card: "#0D1428",       // surface-1
    text: "#F2EFE6",       // warm sand ink
    border: "#1B2444",     // hairline
    notification: "#F0938F", // rose ink
  },
};

/** Native-stack chrome — header on night, sand ink, SemiBold Plex titles. */
export const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: "#070B16" },
  headerTintColor: "#F2EFE6",
  // r126-M1: the native header does not go through the <Text> resolver —
  // point straight at the 600 family instead of fontWeight on the 400 file.
  headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#070B16" },
};

/** Bottom-tab chrome — surface-1 bar, gold active tint, SemiBold labels. */
export const TAB_SCREEN_OPTIONS: BottomTabNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: "#070B16" },
  headerTintColor: "#F2EFE6",
  headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
  headerShadowVisible: false,
  tabBarStyle: {
    backgroundColor: "#0D1428",
    borderTopColor: "#1B2444",
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarActiveTintColor: "#E9B44C",
  tabBarInactiveTintColor: "#8E97B8",
  // r126-M1: same fix as headers — tab labels are native chrome.
  tabBarLabelStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 11 },
};
