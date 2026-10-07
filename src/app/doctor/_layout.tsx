import { Tabs } from "expo-router/tabs";
import type { JSX } from "react";

import { CradleTabBar, type CradleTabItem } from "@/components/navigation/cradle-tab-bar";

// Order matters: the first half renders left of the raised My Queue circle.
const TAB_ITEMS: Record<string, CradleTabItem> = {
  index: { label: "Today", icon: "calendar-today-outline", activeIcon: "calendar-today" },
  schedule: { label: "Schedule", icon: "calendar-clock-outline", activeIcon: "calendar-clock" },
  profile: { label: "Profile", icon: "account-outline", activeIcon: "account" },
};

const CENTER = { routeName: "queue", label: "My Queue", icon: "format-list-numbered" } as const;

// Doctor workspace: only this doctor's appointments, queue and schedule.
// Same floating cradle bar as the patient and staff apps.
export default function DoctorLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CradleTabBar
          {...props}
          items={TAB_ITEMS}
          center={CENTER}
          indicator="edge"
          centerLabel
          centerRing="single"
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="queue" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
