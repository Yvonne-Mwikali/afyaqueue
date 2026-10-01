# Design system

AfyaQueue's identity: **premium African digital healthcare**. Warm, reassuring, modern, spacious. Orange and white. Not the generic blue hospital app.

## Where values live

| Concern               | Source of truth                                       | How to use it                                                                                   |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Colors (light + dark) | `src/global.css`                                      | Classes (`bg-accent`, `text-muted`, `bg-brand-subtle`); in JS `useThemeColor` / `useBrandColor` |
| Shadows               | `src/global.css`                                      | `elevation.*` classes from `@/design-system`                                                    |
| Radius                | `--radius` in `global.css`, mirrored by `RADIUS_BASE` | Classes (`rounded-3xl`); numbers from `radius`                                                  |
| Spacing               | Tailwind 4px grid                                     | Classes (`p-4`, `gap-3`); numbers from `spacing`, `layout`                                      |
| Typography            | HeroUI `Typography` on Tailwind's type scale          | `textRole.*` to choose the HeroUI `type`                                                        |
| Motion                | `src/design-system/motion.ts`                         | `duration`, `easing`, `spring`                                                                  |

Why colors are CSS-only: [ADR 0002](./adr/0002-css-is-the-color-source-of-truth.md).

## Color roles

| Role                           | Light                 | Use                                                     |
| ------------------------------ | --------------------- | ------------------------------------------------------- |
| `background` / `surface`       | white                 | Dominant surface                                        |
| `surface-secondary`            | warm cream            | Secondary areas, grouped sections                       |
| `surface-tertiary`             | soft peach            | Tertiary emphasis                                       |
| `foreground`                   | charcoal ink          | Primary text (16.6:1)                                   |
| `muted`                        | warm grey             | Supporting text (5.6:1)                                 |
| `accent`                       | Afya orange `#C94A0A` | The single primary action, focus, links, brand moments  |
| `brand-subtle` / `-foreground` | peach / deep orange   | Brand-emphasis tiles (e.g. a Queue Number)              |
| `brand-vivid`                  | bright orange         | Decorative only: illustrations, large icons. Never text |
| `success`                      | green                 | Positive outcomes only                                  |
| `warning`                      | amber                 | Caution; always with an icon or label                   |
| `danger`                       | red                   | Destructive actions and errors only                     |

All text pairings meet WCAG AA (4.5:1). Field borders meet 3:1. Dark-mode values are a first pass and have not been visually reviewed.

## Conventions

- **Orange is deliberate.** One primary (`accent`) action per screen. Do not tint every icon, header or card orange.
- **Space over boxes.** Group with white space, cream surfaces and hairline separators before adding cards or shadows. Avoid "everything's a card".
- **Flat by default.** `elevation.flat` for most content; `surface` only when something must lift off white.
- **No decorative gradients.**
- **Radius:** cards and surfaces `3xl` (24); buttons pill (HeroUI default); inputs `field` (16); chips and avatars `full`.
- **Rhythm:** screen gutter 20, section gap 32, item gap 12.
- **Hierarchy:** one `screenTitle` per screen (or the native header), `sectionTitle` for sections, `supporting` for metadata.
- **Motion:** calm and decelerating; no bounce on clinical information; respect reduce-motion.
- Use HeroUI semantic variants (`primary`, `secondary`, `tertiary`, `danger`) rather than restyling components.

## Pending

- **Brand typeface.** System fonts for now. A brand face would need `expo-font` assets and all four `--font-*` variables in `global.css`.
- **App icon and splash.** Still the template assets.
- **Dark mode review.** Values exist; they have not been checked on a device.
