import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SubscribePlanScreen } from "@/screens/subscribe/SubscribePlanScreen";
import { SubscribeMenuScreen } from "@/screens/subscribe/SubscribeMenuScreen";
import { SubscribePaymentScreen } from "@/screens/subscribe/SubscribePaymentScreen";

export type AuthStackParamList = {
  SubscribePlan: undefined;
  SubscribeMenu: undefined;
  SubscribePayment: { planId: number };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: "#070B16" }, headerTintColor: "#F2EFE6",
      headerTitleStyle: { fontFamily: "IBM Plex Sans Arabic", fontWeight: "600" },
      headerShadowVisible: false, contentStyle: { backgroundColor: "#070B16" },
    }}>
      <Stack.Screen name="SubscribePlan" component={SubscribePlanScreen} options={{ title: "اختر الباقة" }} />
      <Stack.Screen name="SubscribeMenu" component={SubscribeMenuScreen} options={{ title: "بيانات المطعم" }} />
      <Stack.Screen name="SubscribePayment" component={SubscribePaymentScreen} options={{ title: "الدفع" }} />
    </Stack.Navigator>
  );
}
