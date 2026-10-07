import { Uniwind, useUniwind } from "uniwind";

import { readPreference, writePreference } from "@/lib/storage";

/** Appearance chosen in Profile → Preferences. "system" follows the device. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_OPTIONS: { id: ThemePreference; label: string; description: string }[] = [
  { id: "system", label: "System", description: "Match your phone's setting" },
  { id: "light", label: "Light", description: "Warm white background" },
  { id: "dark", label: "Dark", description: "Easier on the eyes at night" },
];

const STORAGE_KEY = "theme-preference";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Applies the saved preference. Call once at startup, before the splash
 * screen hides, so the first frame already uses the right theme.
 */
export async function restoreThemePreference(): Promise<void> {
  const saved = await readPreference(STORAGE_KEY);
  if (isThemePreference(saved)) Uniwind.setTheme(saved);
}

/**
 * The current preference and a setter that applies it immediately and
 * saves it. Uniwind holds the active theme; this only adds persistence.
 */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const current: ThemePreference = hasAdaptiveThemes
    ? "system"
    : theme === "dark"
      ? "dark"
      : "light";

  return [
    current,
    (preference) => {
      Uniwind.setTheme(preference);
      void writePreference(STORAGE_KEY, preference);
    },
  ];
}
