import type { TypographyType, TypographyWeight } from "heroui-native";

/**
 * Text is rendered with HeroUI's `Typography` component, whose `type` prop
 * (h1–h6, body, body-sm, body-xs) sits on Tailwind's default type scale.
 * AfyaQueue does not define a parallel scale; it assigns product roles to
 * HeroUI types so screens stay consistent.
 *
 *   <Typography.Heading type={textRole.screenTitle.type}>…</Typography.Heading>
 *
 * Font family: the platform system font (SF Pro / Roboto) for now. A brand
 * typeface is a pending decision (see docs/design-system.md). If one is
 * added, set all four --font-* variables in global.css, as HeroUI requires.
 */
type TextRole = {
  type: TypographyType;
  weight?: TypographyWeight;
};

export const textRole = {
  /** Rare: hero numbers or onboarding headlines. */
  display: { type: "h1" },
  /** Top-of-screen title when not shown in the native header. */
  screenTitle: { type: "h2" },
  /** Section heading within a screen. */
  sectionTitle: { type: "h4" },
  /** Card or list-item title. */
  itemTitle: { type: "h6" },
  /** Default running text. */
  body: { type: "body" },
  /** Emphasised running text. */
  bodyStrong: { type: "body", weight: "semibold" },
  /** Supporting text: metadata, timestamps, helper text. */
  supporting: { type: "body-sm" },
  /** Captions and fine print. Use sparingly. */
  caption: { type: "body-xs" },
} as const satisfies Record<string, TextRole>;

export type TextRoleName = keyof typeof textRole;

/**
 * Numeric font sizes matching Tailwind's default scale, for contexts that
 * need a style object (e.g. native header titles). Prefer `textRole`.
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;
