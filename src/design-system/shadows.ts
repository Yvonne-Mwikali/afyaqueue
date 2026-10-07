/**
 * Elevation is intentionally restrained: AfyaQueue separates content with
 * white space, cream surfaces and hairline separators before reaching for
 * shadows. Shadow values are theme-dependent (none in dark mode) and live in
 * src/global.css as HeroUI variables.
 *
 * Use the class for the elevation level you need:
 */
export const elevation = {
  /** Default. Most content sits flat on white. */
  flat: "shadow-none",
  /** Cards and surfaces that must lift off a white background. */
  surface: "shadow-surface",
  /** Floating UI: sheets, popovers, menus. HeroUI applies this itself. */
  overlay: "shadow-overlay",
  /** Orange glow under the primary CTA only. */
  cta: "shadow-cta",
} as const;

export type Elevation = keyof typeof elevation;
