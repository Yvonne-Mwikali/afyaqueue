import { Stack } from "expo-router";
import type { JSX } from "react";

// List → detail inside the tab, so Back returns to the list.
export default function StaffSectionLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
