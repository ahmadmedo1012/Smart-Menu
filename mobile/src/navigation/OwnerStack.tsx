import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ClipboardList, UtensilsCrossed, Award, Settings } from "lucide-react-native";

import { OwnerDashboardScreen, OwnerOrdersScreen, OwnerOrderDetailScreen,
  OwnerMenuScreen, OwnerLoyaltyScreen, OwnerRestaurantsScreen, OwnerQrScreen,
  OwnerReviewsScreen, OwnerSettingsScreen } from "@/screens/owner/OwnerScreens";

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
  return (
    <Tab.Navigator screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: "#010000" }, headerTintColor: "#ebe7e2",
      headerTitleStyle: { fontFamily: "Cairo", fontWeight: "600" }, headerShadowVisible: false,
      tabBarStyle: { backgroundColor: "#070503", borderTopColor: "#1f1813", height: 64, paddingBottom: 8, paddingTop: 4 },
      tabBarActiveTintColor: "#bc4700", tabBarInactiveTintColor: "#9c948a",
      tabBarLabelStyle: { fontFamily: "Cairo", fontSize: 11, fontWeight: "600" },
    }}>
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
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: "#010000" }, headerTintColor: "#ebe7e2",
      headerTitleStyle: { fontFamily: "Cairo", fontWeight: "600" },
      headerShadowVisible: false, contentStyle: { backgroundColor: "#010000" },
    }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="OwnerOrderDetail" component={OwnerOrderDetailScreen} options={{ title: "تفاصيل الطلب" }} />
      <Stack.Screen name="OwnerRestaurants" component={OwnerRestaurantsScreen} options={{ title: "فروعي" }} />
      <Stack.Screen name="OwnerQr" component={OwnerQrScreen} options={{ title: "رمز QR" }} />
      <Stack.Screen name="OwnerReviews" component={OwnerReviewsScreen} options={{ title: "التقييمات" }} />
      <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} options={{ title: "إعدادات المطعم" }} />
    </Stack.Navigator>
  );
}
