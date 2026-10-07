import { useCSSVariable } from "uniwind";

/**
 * Color values are defined once, in src/global.css. This module exposes them
 * to code that cannot use a className (icons, navigation options, Reanimated).
 *
 * In components, prefer Tailwind classes backed by the theme:
 *   bg-background · bg-surface · bg-surface-secondary · text-foreground
 *   text-muted · bg-accent · text-accent-foreground · bg-brand-subtle
 *   text-brand-text
 *
 * For HeroUI's semantic colors in JS, use `useThemeColor("accent")` from
 * heroui-native (re-exported here). For AfyaQueue brand extensions, use
 * `useBrandColor`.
 *
 * Usage rules:
 * - White (background/surface) is the dominant surface.
 * - accent (Afya orange, AA with white) fills the primary CTA and marks
 *   focus/active navigation. brand-vivid (brighter) colors icons and the
 *   wordmark only. brand-text is for small orange text: eyebrows, links,
 *   pill labels.
 * - surface-secondary (cream) / brand-subtle (peach) support secondary areas.
 * - success is for positive outcomes only; danger is for destructive/error only.
 * - Never communicate status by color alone: pair it with a label or icon.
 */
export { useThemeColor } from "heroui-native";
export type { ThemeColor } from "heroui-native";

export const BRAND_COLORS = [
  "brand-vivid",
  "brand-text",
  "brand-subtle",
  "brand-subtle-foreground",
  "brand-blob",
  "tint-pink-foreground",
] as const;

export type BrandColor = (typeof BRAND_COLORS)[number];

export function useBrandColor(color: BrandColor): string {
  const value = useCSSVariable(`--color-${color}`);
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  // Mirrors heroui-native's useThemeColor so a missing variable fails visibly.
  return "invalid";
}
