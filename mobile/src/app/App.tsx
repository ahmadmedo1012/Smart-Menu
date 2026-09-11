import "react-native-get-random-values";
// r100c: global.css lives at the project root — this was "./global.css" which
// Metro could not resolve from src/app/ (only the tsc `noUncheckedSideEffectImports`-era
// check passed because the comment above silenced the unresolved-import lint).
import "../../global.css";

import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { I18nManager, LogBox } from "react-native";

import CairoRegular from "../../assets/fonts/Cairo-Regular.ttf";
import CairoBold from "../../assets/fonts/Cairo-Bold.ttf";
import CairoSemiBold from "../../assets/fonts/Cairo-SemiBold.ttf";
import ReadexProRegular from "../../assets/fonts/ReadexPro-Regular.ttf";
import ReadexProBold from "../../assets/fonts/ReadexPro-Bold.ttf";

import { AppProviders } from "@/app/providers";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useAuth } from "@/store/auth";

if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
}

void SplashScreen.preventAutoHideAsync().catch(() => {});

LogBox.ignoreLogs([
  "ViewPropTypes will be removed",
  "AsyncStorage has been extracted",
  "Reanimated 2 failed to create a worklet",
  "Sending `onAnimatedValueUpdate`",
]);

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const bootstrap = useAuth((s) => s.bootstrap);
  const authStatus = useAuth((s) => s.status);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Font.loadAsync({
        Cairo: CairoRegular, "Cairo-Bold": CairoBold, "Cairo-SemiBold": CairoSemiBold,
        ReadexPro: ReadexProRegular, "ReadexPro-Bold": ReadexProBold,
      });
      if (!cancelled) setFontsReady(true);
    })();
    void bootstrap();
    return () => { cancelled = true; };
  }, [bootstrap]);

  useEffect(() => {
    if (fontsReady && authStatus !== "idle" && authStatus !== "loading") {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, authStatus]);

  if (!fontsReady || authStatus === "idle" || authStatus === "loading") return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="light" />
          <RootNavigator />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
