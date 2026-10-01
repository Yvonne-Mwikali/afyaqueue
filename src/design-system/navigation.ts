import { DarkTheme, DefaultTheme, type Theme } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { useUniwind } from "uniwind";

/**
 * Builds the React Navigation theme from the AfyaQueue CSS theme so native
 * stack/tab backgrounds match HeroUI surfaces (no flash of mismatched color
 * during transitions).
 */
export function useNavigationTheme(): Theme {
  const { theme } = useUniwind();
  const [accent, background, surface, foreground, separator, danger] = useThemeColor([
    "accent",
    "background",
    "surface",
    "foreground",
    "separator",
    "danger",
  ]);
  const base = theme === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: accent,
      background,
      card: surface,
      text: foreground,
      border: separator,
      notification: danger,
    },
  };
}
