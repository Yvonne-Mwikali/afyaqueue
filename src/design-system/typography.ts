import type { TypographyType, TypographyWeight } from "heroui-native";

/**
 * Text is rendered with HeroUI's `Typography` component. Its `type` prop
 * (h1–h6, body, body-sm, body-xs) sits on Tailwind's type scale; roles that
 * need sizes outside it add a `className` from the AfyaQueue sizes defined
 * in src/global.css (`text-wordmark`, `text-title`).
 *
 *   const role = textRole.cardTitle;
 *   <Typography.Heading type={role.type} weight={role.weight} className={role.className}>
 *
 * Font family: Nunito Sans (regular/medium/semibold/bold), see ./fonts.ts.
 */
export type TextRole = {
  type: TypographyType;
  weight?: TypographyWeight;
  className?: string;
};

export const textRole = {
  /** Rare: onboarding headlines. */
  display: { type: "h1", weight: "bold" },
  /** Top-of-screen title when not shown in the native header. */
  screenTitle: { type: "h2", weight: "bold" },
  /** Title of a patient tab screen under the brand row ("My Appointments", 24). */
  pageTitle: { type: "h3", weight: "bold" },
  /** The patient's own queue number on Live Queue (48). */
  queueNumber: { type: "h1", weight: "bold", className: "text-5xl tracking-tight" },
  /** Prominent numbers: queue numbers, counts. */
  metric: { type: "h2", weight: "bold" },
  /** The AfyaQueue wordmark (28). */
  wordmark: { type: "h3", weight: "bold", className: "text-wordmark tracking-tight" },
  /** Greetings and the title of a primary card (22). */
  cardTitle: { type: "h4", weight: "bold", className: "text-title" },
  /** Section headings (20). */
  sectionTitle: { type: "h4", weight: "bold" },
  /** Primary line inside secondary cards: "#14 in line", a hospital name (18). */
  cardPrimary: { type: "h5", weight: "semibold" },
  /** List-item or tile title (16). */
  itemTitle: { type: "h6", weight: "bold" },
  /** Default running text. */
  body: { type: "body" },
  /** Emphasised running text. */
  bodyStrong: { type: "body", weight: "semibold" },
  /** Compact single-line values in icon rows (16 on a 24 line). */
  detail: { type: "body", className: "leading-6" },
  /** Short orange label above a card title ("Next Appointment", 13). Use with text-brand-text. */
  eyebrow: { type: "body-sm", weight: "semibold", className: "text-label" },
  /** Labels under icon tiles (13). */
  tileLabel: { type: "body-sm", className: "text-label" },
  /** Supporting text: metadata, timestamps, helper text. */
  supporting: { type: "body-sm" },
  /** Captions and fine print. Use sparingly. */
  caption: { type: "body-xs" },
  /** Quiet context labels such as stepper steps (11). */
  micro: { type: "body-xs", className: "text-micro" },
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
  title: 22,
  micro: 11,
  label: 13,
  "2xl": 24,
  wordmark: 28,
  "3xl": 30,
  "4xl": 36,
} as const;
