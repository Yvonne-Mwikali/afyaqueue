import type { JSX } from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useNavigationTheme } from "@/design-system";

import "../global.css";

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <NavigationRoot />
        <StatusBar style="auto" />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

function NavigationRoot(): JSX.Element {
  const navigationTheme = useNavigationTheme();

  // Role/session guards (Stack.Protected) are added once the auth provider
  // is chosen. See docs/state-management.md.
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="staff" />
      </Stack>
    </ThemeProvider>
  );
}
