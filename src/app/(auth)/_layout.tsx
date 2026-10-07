import { Stack } from "expo-router";
import type { JSX } from "react";

export const unstable_settings = {
  // Login and Register always have Welcome beneath them to go back to.
  initialRouteName: "welcome",
};

export default function AuthLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
