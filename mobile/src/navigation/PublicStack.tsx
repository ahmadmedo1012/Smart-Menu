import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { LandingScreen } from "@/screens/public/LandingScreen";
import { MenuScreen } from "@/screens/public/MenuScreen";
import { PricingScreen } from "@/screens/public/PricingScreen";
import { OrderConfirmedScreen } from "@/screens/public/OrderConfirmedScreen";
import { TermsScreen, PrivacyScreen } from "@/screens/public/StaticScreens";
import { STACK_SCREEN_OPTIONS } from "./navTheme";
// r133-F3 (A4 S4): the LOCAL PublicStackParamList is deleted — the canonical
// list in ./types (which feeds RootStackParamList + linking) is the single
// source. The stale local copy had already drifted (Login carried a redirect?
// param no screen ever read; OrderConfirmed required orderId while MenuScreen
// navigates with waUrl) — the "two SSOTs" trap. Runtime params are untyped
// pass-through, so nothing breaks; the navigator now type-checks against the
// same list the deep-link config uses.
import type { PublicStackParamList } from "./types";

const Stack = createNativeStackNavigator<PublicStackParamList>();

export function PublicStack() {
  return (
    // r126: shared chrome (navTheme.ts) — the duplicated header block rode the
    // 400-only Plex family + fontWeight 600, which never rendered semibold on
    // iOS native headers. The shared options point straight at the 600 family.
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Menu" component={MenuScreen} options={{ title: "المنيو" }} />
      <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: "الباقات" }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "تسجيل الدخول", headerShown: false }} />
      <Stack.Screen name="OrderConfirmed" component={OrderConfirmedScreen} options={{ title: "تم الطلب", headerBackVisible: false }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: "الشروط" }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "الخصوصية" }} />
    </Stack.Navigator>
  );
}
