import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { type JSX, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AccountGate } from "@/components/shared/account-gate";
import { InviteGate } from "@/components/shared/invite-gate";
import { HospitalPickerGate, WorkspacePicker } from "@/components/shared/context-pickers";
import { fontAssets, useNavigationTheme } from "@/design-system";
import { SessionProvider, useSession } from "@/features/auth/session";
import { HospitalProvider, useHospitalContext } from "@/features/hospitals/hospital-context";
import { destinationFor } from "@/features/hospitals/routing";
import { restoreThemePreference } from "@/features/preferences/theme-preference";
import { useUserProfile } from "@/features/users/use-user-profile";
import { authService } from "@/lib/backend";

import "../global.css";

void SplashScreen.preventAutoHideAsync();

// Apply the saved appearance before the first screen renders.
const themeRestored = restoreThemePreference();

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    void themeRestored.finally(() => setThemeReady(true));
  }, []);

  // The splash stays up until fonts, theme and the signed-in user are restored.
  if (!(fontsLoaded || fontError !== null) || !themeReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <SessionProvider service={authService}>
          <HospitalProvider>
            <NavigationRoot />
          </HospitalProvider>
        </SessionProvider>
        <StatusBar style="auto" />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

function NavigationRoot(): JSX.Element | null {
  const navigationTheme = useNavigationTheme();
  const { status, signOut } = useSession();
  const profile = useUserProfile();
  const hospitals = useHospitalContext();
  const restored = status !== "restoring";
  const signedIn = status === "signed-in";
  // Memberships and the profile decide where a user goes; never the client.
  const destination = signedIn
    ? destinationFor({
        profileStatus: profile.status,
        hospitalStatus: hospitals.status,
        mode: hospitals.mode,
        workspace: hospitals.workspace,
        hospitalCount: hospitals.hospitals.length,
        hasPatientHospital: hospitals.patientHospital !== null,
        pendingInvites: hospitals.invites.length,
      })
    : null;
  const area = destination?.kind === "area" ? destination.area : null;
  const logOut = (): void => void signOut().catch(() => undefined);

  useEffect(() => {
    if (restored) {
      void SplashScreen.hideAsync();
    }
  }, [restored]);

  if (!restored) {
    return null;
  }

  // Signed in but not yet placed: no routes at all, never a guess.
  if (destination?.kind === "gate") {
    return (
      <ThemeProvider value={navigationTheme}>
        <AccountGate
          state={destination.state}
          {...(destination.message ? { message: destination.message } : {})}
          onRetry={() => {
            profile.retry();
            hospitals.retry();
          }}
          onSignOut={logOut}
        />
      </ThemeProvider>
    );
  }

  if (destination?.kind === "invite") {
    return (
      <ThemeProvider value={navigationTheme}>
        <InviteGate />
      </ThemeProvider>
    );
  }

  if (destination?.kind === "choose-workspace") {
    return (
      <ThemeProvider value={navigationTheme}>
        <WorkspacePicker />
      </ThemeProvider>
    );
  }

  if (destination?.kind === "choose-hospital") {
    return (
      <ThemeProvider value={navigationTheme}>
        <HospitalPickerGate />
      </ThemeProvider>
    );
  }

  // Signed out, only the auth screens exist, so the app opens on Welcome.
  // Signed in, exactly one area exists: patients can't reach staff routes
  // and staff can't reach patient routes.
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={area === "patient"}>
          <Stack.Screen name="(patient)" />
          <Stack.Screen name="services/[serviceId]" />
          <Stack.Screen name="book" />
          <Stack.Screen name="booking-confirmed" />
          <Stack.Screen name="appointments/[appointmentId]" />
          <Stack.Screen name="check-in/[appointmentId]" />
          <Stack.Screen name="account/[item]" />
          <Stack.Screen name="hospitals" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={area === "staff"}>
          <Stack.Screen name="staff" />
        </Stack.Protected>
        <Stack.Protected guard={area === "doctor"}>
          <Stack.Screen name="doctor" />
        </Stack.Protected>
        {/* Hospital admins only (their workspace's admin membership). */}
        <Stack.Protected guard={area === "staff" && hospitals.workspace?.role === "admin"}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
