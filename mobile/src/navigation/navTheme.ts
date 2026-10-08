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
import { colors } from "@/theme/colors";

/** Madarek night palette for the NavigationContainer (matches the app). */
export const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,   // gold accent
    background: colors.night, // night page ground
    card: colors.surface,       // surface-1
    text: colors.sand,       // warm sand ink
    border: colors.hairline,     // hairline
    notification: colors.rose, // rose ink
  },
};

/** Native-stack chrome — header on night, sand ink, SemiBold Plex titles. */
export const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.night },
  headerTintColor: colors.sand,
  // r126-M1: the native header does not go through the <Text> resolver —
  // point straight at the 600 family instead of fontWeight on the 400 file.
  headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.night },
};

/** Bottom-tab chrome — surface-1 bar, gold active tint, SemiBold labels. */
export const TAB_SCREEN_OPTIONS: BottomTabNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.night },
  headerTintColor: colors.sand,
  headerTitleStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 17 },
  headerShadowVisible: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.hairline,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarActiveTintColor: colors.gold,
  tabBarInactiveTintColor: colors.muted,
  // r126-M1: same fix as headers — tab labels are native chrome.
  tabBarLabelStyle: { fontFamily: PLEX_SEMIBOLD, fontSize: 11 },
};
