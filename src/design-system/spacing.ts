/**
 * Spacing on a 4-point grid. Tailwind's spacing unit is also 4px, so each
 * step maps to a class: md (16) = p-4 / gap-4, xl (24) = p-6, and so on.
 *
 * Use these values for style props that cannot take a className
 * (contentContainerStyle, navigation options, Reanimated).
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

export type Spacing = keyof typeof spacing;

/**
 * Layout constants. AfyaQueue is deliberately spacious: wider screen gutters
 * and generous section rhythm.
 */
export const layout = {
  /** Horizontal padding for screen content (px-5). */
  screenGutter: 20,
  /** Vertical gap between major sections on a screen (gap-8). */
  sectionGap: 32,
  /** Gap between related items inside a section (gap-3). */
  itemGap: 12,
  /**
   * Minimum touch target. Material requires 48dp; Apple HIG 44pt. Use 48 on
   * both platforms for consistency. HeroUI Button size "md" is 48 tall.
   */
  minTouchTarget: 48,
} as const;
