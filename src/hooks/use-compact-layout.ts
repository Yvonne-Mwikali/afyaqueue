import { useWindowDimensions } from "react-native";

/**
 * True when the layout has less than ~400dp of text-adjusted width: narrow
 * phones, or larger system text on normal phones. Reference layouts designed
 * at ~390dp then make small concessions (scrolling rows, shorter labels,
 * smaller thumbnails) instead of breaking words.
 */
export function useCompactLayout(): boolean {
  const { width, fontScale } = useWindowDimensions();
  return width / fontScale < 400;
}
