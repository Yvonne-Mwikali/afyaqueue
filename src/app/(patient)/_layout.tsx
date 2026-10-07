import { Tabs } from "expo-router/tabs";
import type { JSX } from "react";

import { CradleTabBar, type CradleTabItem } from "@/components/navigation/cradle-tab-bar";

// Order matters: the first half renders left of the centre Contact circle.
const TAB_ITEMS: Record<string, CradleTabItem> = {
  index: { label: "Home", icon: "home-outline", activeIcon: "home" },
  appointments: {
    label: "Appointments",
    icon: "calendar-month-outline",
    activeIcon: "calendar-month",
  },
  queue: { label: "Queue", icon: "account-group-outline", activeIcon: "account-group" },
  profile: { label: "Profile", icon: "account-outline", activeIcon: "account" },
};

const CENTER = { routeName: "contact", label: "Contact", icon: "phone-in-talk" } as const;

// Custom JS tab bar (not NativeTabs): native tabs cannot draw the cradled
// centre circle. Navigation state still comes from Expo Router.
export default function PatientLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CradleTabBar {...props} items={TAB_ITEMS} center={CENTER} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="contact" />
      <Tabs.Screen name="queue" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="services" options={{ href: null }} />
    </Tabs>
  );
}
