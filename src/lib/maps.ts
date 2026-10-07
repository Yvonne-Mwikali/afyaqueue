import { Linking, Platform } from "react-native";

/** Opens the platform maps app searching for a place. */
export function openDirections(query: string): void {
  const q = encodeURIComponent(query);
  const url = Platform.select({
    ios: `maps:0,0?q=${q}`,
    default: `geo:0,0?q=${q}`,
  });
  void Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`)
  );
}
