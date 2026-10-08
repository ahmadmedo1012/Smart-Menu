import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LayoutDashboard, Store, ClipboardList, CreditCard, Settings } from "lucide-react-native";

import { AdminDashboardScreen, AdminRestaurantsScreen, AdminUsersScreen, AdminAdminsScreen,
  AdminOrdersScreen, AdminOrderDetailScreen, AdminSubscriptionsScreen, AdminSystemEventsScreen,
  AdminAuditLogsScreen, AdminTelegramScreen, AdminSettingsScreen } from "@/screens/admin/AdminScreens";
import { STACK_SCREEN_OPTIONS, TAB_SCREEN_OPTIONS } from "./navTheme";

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminUsers: undefined;
  AdminAdmins: undefined;
  AdminOrderDetail: { orderId: number };
  AdminSystemEvents: undefined;
  AdminAuditLogs: undefined;
  AdminTelegram: undefined;
  AdminSettings: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "الرئيسية", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tab.Screen name="AdminRestaurants" component={AdminRestaurantsScreen} options={{ title: "المطاعم", tabBarIcon: ({ color, size }) => <Store color={color} size={size} /> }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: "الطلبات", tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Tab.Screen name="AdminSubscriptions" component={AdminSubscriptionsScreen} options={{ title: "الاشتراكات", tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} /> }} />
      <Tab.Screen name="AdminSettingsTab" component={AdminSettingsScreen} options={{ title: "الإعدادات", tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "المستخدمون" }} />
      <Stack.Screen name="AdminAdmins" component={AdminAdminsScreen} options={{ title: "المدراء" }} />
      <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} options={{ title: "تفاصيل الطلب" }} />
      <Stack.Screen name="AdminSystemEvents" component={AdminSystemEventsScreen} options={{ title: "أحداث النظام" }} />
      <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsScreen} options={{ title: "سجل التدقيق" }} />
      <Stack.Screen name="AdminTelegram" component={AdminTelegramScreen} options={{ title: "تيليجرام" }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "إعدادات النظام" }} />
    </Stack.Navigator>
  );
}
