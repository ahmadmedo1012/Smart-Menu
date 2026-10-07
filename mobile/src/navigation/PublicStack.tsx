import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { LandingScreen } from "@/screens/public/LandingScreen";
import { MenuScreen } from "@/screens/public/MenuScreen";
import { PricingScreen } from "@/screens/public/PricingScreen";
import { OrderConfirmedScreen } from "@/screens/public/OrderConfirmedScreen";
import { TermsScreen, PrivacyScreen } from "@/screens/public/StaticScreens";

export type PublicStackParamList = {
  Landing: undefined;
  Menu: { slug: string; ref?: string };
  Pricing: undefined;
  Login: { redirect?: string };
  OrderConfirmed: { orderId: string };
  Terms: undefined;
  Privacy: undefined;
};

const Stack = createNativeStackNavigator<PublicStackParamList>();

export function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: "#070B16" }, headerTintColor: "#F2EFE6",
      headerTitleStyle: { fontFamily: "IBM Plex Sans Arabic", fontWeight: "600" },
      headerShadowVisible: false, contentStyle: { backgroundColor: "#070B16" },
    }}>
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
