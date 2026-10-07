# Design system

AfyaQueue's identity: **premium African digital healthcare**. Warm, reassuring, modern, spacious. Orange and white. Not the generic blue hospital app.

## Where values live

| Concern               | Source of truth                                       | How to use it                                                                                   |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Colors (light + dark) | `src/global.css`                                      | Classes (`bg-accent`, `text-muted`, `bg-brand-subtle`); in JS `useThemeColor` / `useBrandColor` |
| Shadows               | `src/global.css`                                      | `elevation.*` classes from `@/design-system`                                                    |
| Radius                | `--radius` in `global.css`, mirrored by `RADIUS_BASE` | Classes (`rounded-3xl`); numbers from `radius`                                                  |
| Spacing               | Tailwind 4px grid                                     | Classes (`p-4`, `gap-3`); numbers from `spacing`, `layout`                                      |
| Typography            | HeroUI `Typography` on Tailwind's type scale          | `textRole.*` for `type` and `weight`                                                            |
| Motion                | `src/design-system/motion.ts`                         | `duration`, `easing`, `spring`                                                                  |

Why colors are CSS-only: [ADR 0002](./adr/0002-css-is-the-color-source-of-truth.md).

## Color roles

| Role                                             | Light                   | Use                                                                               |
| ------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- |
| `background` / `surface`                         | white                   | Dominant surface                                                                  |
| `surface-secondary`                              | warm cream              | Hero cards, secondary areas                                                       |
| `surface-tertiary`                               | soft peach              | Tertiary emphasis                                                                 |
| `foreground`                                     | navy charcoal `#141B34` | Primary text (17:1)                                                               |
| `muted`                                          | slate grey              | Supporting text (6.0:1)                                                           |
| `accent`                                         | Afya orange `#C8460C`   | Primary CTA fill, focus, active navigation. White on it is 4.8:1 (AA at any size) |
| `brand-text`                                     | orange `#C2410C`        | Small orange text on white/cream: eyebrows, links (>= 4.85:1)                     |
| `brand-subtle-foreground`                        | deep orange `#B23F08`   | Orange text on peach: pills, tiles (>= 4.8:1)                                     |
| `cta-from` → `cta-to`                            | `#CC4A0B` → `#B23F08`   | Primary CTA gradient; white label 4.6–5.8:1                                       |
| `hero-from` → `hero-to`, `tile-from` → `tile-to` | cream → peach           | Hero card and service-tile gradients                                              |
| `tint-pink` / `-foreground`                      | pink                    | Oncology tile only                                                                |
| `brand-subtle`                                   | peach                   | Icon tiles, status pills, hero circles                                            |
| `brand-vivid`                                    | vivid orange `#EA580C`  | Icons, wordmark, decoration. 3.6:1 on white: never text below 24px                |
| `success`                                        | green                   | Positive outcomes only                                                            |
| `warning`                                        | amber                   | Caution; always with an icon or label                                             |
| `danger`                                         | red                     | Destructive actions and errors only                                               |

All text pairings, including the white CTA label, meet WCAG AA (4.5:1). Field borders meet 3:1. Dark-mode values are a first pass and have not been visually reviewed.

Visual reference conclusions: [design/reference-analysis.md](./design/reference-analysis.md).

## Conventions

- **Orange is deliberate.** One primary (`accent`) action per screen. Do not tint every icon, header or card orange.
- **Space over boxes.** Group with white space, cream surfaces and hairline separators before adding cards or shadows. Avoid "everything's a card".
- **Cards:** white cards get a warm hairline border plus the soft `shadow-surface`; the hero uses cream with peach circles.
- **No decorative gradients.**
- **Radius:** cards `3xl` (18); service tiles `3xl`; thumbnails `xl`; primary CTA `2xl` (12), 48dp tall; inputs `field` (12); pills, chips and avatars `full`.
- **Rhythm:** screen gutter 16, section gap 16, 10 between related cards, 12 from a section title to its content.
- **Type:** Nunito Sans (`src/design-system/fonts.ts`). Wordmark 28, greeting/hero title 22 bold, section titles 20 bold, detail rows 16 on 24, tile labels 13.
- **Patient navigation:** custom tab bar (`src/components/navigation/patient-tab-bar.tsx`): rounded floating bar, four tabs, raised 68dp orange Call action. Staff keeps native tabs.
- **Compact layouts:** `useCompactLayout()` (text-adjusted width < 400dp) switches to scrolling tile rows, shorter labels and smaller thumbnails instead of breaking words.
- **Hierarchy:** bold `cardTitle` for greetings and hero titles, bold `sectionTitle` for sections, `eyebrow` (in `brand-text`) above card titles, `supporting` for metadata.
- **Icons:** MaterialCommunityIcons outline, `brand-vivid`; sizes from `iconSize`; tiles via `IconTile`.
- **Motion:** calm and decelerating; no bounce on clinical information; respect reduce-motion.
- **Feedback states:** `src/components/feedback/`: `LoadingState` (queue dots or a pulsing icon badge), `SuccessState` (~750ms check mark), `CheckInState`, `QueueWaitingState` (breathing halo on the live number) and `ProgressState` (determinate only with real progress). Timings come from `duration`/`loop`/`spring` in `motion.ts`; every state always shows text.
- Use HeroUI semantic variants (`primary`, `secondary`, `tertiary`, `danger`) rather than restyling components.

## Pending

- **App icon and splash.** Still the template assets.
- **Dark mode review.** Values exist; they have not been checked on a device.
