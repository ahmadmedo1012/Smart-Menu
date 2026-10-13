import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ClipboardList, UtensilsCrossed, Award, Settings } from "lucide-react-native";

import { OwnerDashboardScreen, OwnerOrdersScreen, OwnerOrderDetailScreen,
  OwnerQrScreen, OwnerSettingsScreen } from "@/screens/owner/OwnerScreens";
// Phase 6 (P6-2-cR): the four real screens live in their own files now.
import { OwnerMenuScreen } from "@/screens/owner/OwnerMenuScreen";
import { OwnerRestaurantsScreen } from "@/screens/owner/OwnerRestaurantsScreen";
import { OwnerReviewsScreen } from "@/screens/owner/OwnerReviewsScreen";
import { OwnerLoyaltyScreen } from "@/screens/owner/OwnerLoyaltyScreen";
import { STACK_SCREEN_OPTIONS, useTabScreenOptions } from "./navTheme";

export type OwnerStackParamList = {
  OwnerTabs: undefined;
  OwnerOrderDetail: { orderId: number };
  OwnerRestaurants: undefined;
  OwnerQr: undefined;
  OwnerReviews: undefined;
  OwnerSettings: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<OwnerStackParamList>();

function OwnerTabs() {
  // r133-F3 (A4 S2): insets-aware tab chrome (labels must clear the home
  // indicator on notched devices) — shared factory with the admin tab bar.
  const tabOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: "الرئيسية", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tab.Screen name="OwnerOrders" component={OwnerOrdersScreen} options={{ title: "الطلبات", tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Tab.Screen name="OwnerMenu" component={OwnerMenuScreen} options={{ title: "المنيو", tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size} /> }} />
      <Tab.Screen name="OwnerLoyalty" component={OwnerLoyaltyScreen} options={{ title: "الولاء", tabBarIcon: ({ color, size }) => <Award color={color} size={size} /> }} />
      <Tab.Screen name="OwnerSettingsTab" component={OwnerSettingsScreen} options={{ title: "الإعدادات", tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="OwnerOrderDetail" component={OwnerOrderDetailScreen} options={{ title: "تفاصيل الطلب" }} />
      <Stack.Screen name="OwnerRestaurants" component={OwnerRestaurantsScreen} options={{ title: "فروعي" }} />
      <Stack.Screen name="OwnerQr" component={OwnerQrScreen} options={{ title: "رمز QR" }} />
      <Stack.Screen name="OwnerReviews" component={OwnerReviewsScreen} options={{ title: "التقييمات" }} />
      <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} options={{ title: "إعدادات المطعم" }} />
    </Stack.Navigator>
  );
}
