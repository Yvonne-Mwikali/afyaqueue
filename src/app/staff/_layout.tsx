import { Tabs } from "expo-router/tabs";
import type { JSX } from "react";

import { CradleTabBar, type CradleTabItem } from "@/components/navigation/cradle-tab-bar";

// Order matters: the first half renders left of the raised Queue circle,
// so the bar reads Overview | Patients | Queue | Services | Settings.
const TAB_ITEMS: Record<string, CradleTabItem> = {
  index: { label: "Overview", icon: "view-dashboard-outline", activeIcon: "view-dashboard" },
  patients: {
    label: "Patients",
    icon: "account-multiple-outline",
    activeIcon: "account-multiple",
  },
  services: { label: "Services", icon: "medical-bag", activeIcon: "medical-bag" },
  settings: { label: "Settings", icon: "cog-outline", activeIcon: "cog" },
};

// Queue is the staff's primary operational area, so it takes the centre.
const CENTER = { routeName: "queue", label: "Queue", icon: "format-list-numbered" } as const;

// Staff labels are all about the same length, so each side splits evenly.
const EVEN_SIDES = [0.5, 0.5];

// A real URL segment (not a group) so staff routes never collide with
// patient routes: /staff, /staff/queue, ... Same floating cradle bar as the
// patient app (custom JS tab bar; native tabs can't draw the cradle).
export default function StaffLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CradleTabBar
          {...props}
          items={TAB_ITEMS}
          center={CENTER}
          sideWeights={EVEN_SIDES}
          // Staff variant: short top-edge indicators, a "Queue" label under
          // the circle and a single restrained halo.
          indicator="edge"
          centerLabel
          centerRing="single"
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="patients" />
      <Tabs.Screen name="queue" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
