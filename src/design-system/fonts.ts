import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from "@expo-google-fonts/nunito-sans";

/**
 * AfyaQueue typeface: Nunito Sans. The keys are the family names
 * registered with expo-font, and must match the --font-* variables in
 * src/global.css (CSS cannot import this file).
 */
export const fontAssets = {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} as const;

export const fontFamily = {
  normal: "NunitoSans_400Regular",
  medium: "NunitoSans_500Medium",
  semibold: "NunitoSans_600SemiBold",
  bold: "NunitoSans_700Bold",
} as const satisfies Record<string, keyof typeof fontAssets>;
