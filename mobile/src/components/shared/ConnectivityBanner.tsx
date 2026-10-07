import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";

export function ConnectivityBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);
  if (online) return null;
  return (
    <View style={{ backgroundColor: "#F0938F", paddingVertical: 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 100 }}>
      <WifiOff size={16} color="#05070F" />
      <Text style={{ color: "#05070F", fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600" }}>
        لا يوجد اتصال بالإنترنت — تحقق من شبكتك
      </Text>
    </View>
  );
}
