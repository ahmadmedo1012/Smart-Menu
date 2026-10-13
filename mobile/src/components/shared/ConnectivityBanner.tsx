import { useEffect, useState } from "react";
import { View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

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
    <View style={{ backgroundColor: colors.rose, paddingVertical: 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 100 }}>
      {/* Phase 6: espresso ink on the deep-rose fill (web --destructive-foreground
          light = #241811, 4.71:1 — white-on-rose fails AA at 3.1:1). */}
      <WifiOff size={16} color={colors.ink} />
      <Text style={{ color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600" }}>
        لا يوجد اتصال بالإنترنت — تحقق من شبكتك
      </Text>
    </View>
  );
}
