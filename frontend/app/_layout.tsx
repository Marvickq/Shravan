import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useAuth } from "@/src/auth";
import { useTheme } from "@/src/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const { hydrate, hydrated } = useAuth();
  const { c } = useTheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if ((loaded || error) && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, hydrated]);

  if ((!loaded && !error) || !hydrated)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c("surface"),
        }}
      >
        <ActivityIndicator color={c("brand")} />
      </View>
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c("surface") },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
