import { Stack } from "expo-router";
import type { JSX } from "react";

// Hospital admin configuration: pushed over the staff workspace from Settings.
export default function AdminLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
