/**
 * Radius scale. HeroUI derives its whole scale from one CSS variable,
 * `--radius` in src/global.css; RADIUS_BASE must match it (0.375rem = 6px).
 *
 * In components, prefer classes: rounded-lg, rounded-2xl, rounded-full.
 * Use these numbers only for style props that cannot take a className.
 *
 * Conventions:
 * - Cards and grouped surfaces: 3xl (18).
 * - Icon tiles, thumbnails, nested tiles: 2xl (12).
 * - Primary CTA: 3xl rounded rectangle (not a pill). Inputs: field (12).
 * - Status pills, chips, avatars: full.
 * - On iOS, pair non-capsule radii with `borderCurve: "continuous"`.
 */
export const RADIUS_BASE = 6;

export const radius = {
  none: 0,
  xs: RADIUS_BASE * 0.25,
  sm: RADIUS_BASE * 0.5,
  md: RADIUS_BASE * 0.75,
  lg: RADIUS_BASE,
  xl: RADIUS_BASE * 1.5,
  "2xl": RADIUS_BASE * 2,
  "3xl": RADIUS_BASE * 3,
  "4xl": RADIUS_BASE * 4,
  /** Matches --field-radius in global.css. */
  field: RADIUS_BASE * 2,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;
