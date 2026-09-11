import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
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
    text: "#ebe7e2", border: "#1f1813", notification: "#c0392b",
  },
};

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

  return <NavigationContainer theme={NAV_THEME} linking={linking}>{Inner}</NavigationContainer>;
}
