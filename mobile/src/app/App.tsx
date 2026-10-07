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
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { I18nManager, LogBox } from "react-native";

// Madarek design system: IBM Plex Sans Arabic 400/500/600/700 (no 800) — the
// same brand face the web app self-hosts. Replaces the retired Cairo +
// Readex Pro pair; weights register under the "IBM Plex Sans Arabic*"
// families that every screen references.

import { AppProviders } from "@/app/providers";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
        "IBM Plex Sans Arabic": IBMPlexSansArabic_400Regular,
        "IBM Plex Sans Arabic-Medium": IBMPlexSansArabic_500Medium,
        "IBM Plex Sans Arabic-SemiBold": IBMPlexSansArabic_600SemiBold,
        "IBM Plex Sans Arabic-Bold": IBMPlexSansArabic_700Bold,
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
          {/* r118-B3 (A6 P1-1): crash containment — one malformed API payload used
              to kill the whole process. Providers stay ABOVE the boundary so the
              toast/query layers survive a caught render error. */}
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
