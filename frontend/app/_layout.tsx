import {
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/context/AuthContext";
import { CallProvider } from "@/src/context/CallContext";
import { ThemeProvider, useTheme } from "@/src/context/ThemeContext";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

SplashScreen.preventAutoHideAsync();

function ThemedApp() {
  const { mode } = useTheme();
  return (
    <AuthProvider>
      <CallProvider>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }} />
      </CallProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Figtree_600SemiBold,
    Figtree_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const ready = (iconsLoaded || !!iconsError) && (fontsLoaded || !!fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
