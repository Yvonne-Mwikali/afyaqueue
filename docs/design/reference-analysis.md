# Visual reference analysis

The AfyaQueue visual references live in `assets/Design/` (10 generated mockups). They are **design input, not app assets**: never import them into the UI. This document records the reusable conclusions. Token values live in `src/global.css` and `src/design-system/`; see [design-system.md](../design-system.md).

| Ref   | Screen                                                          |
| ----- | --------------------------------------------------------------- |
| 1     | Onboarding / welcome                                            |
| 2     | Login / Register                                                |
| **3** | **Patient Home** (implemented in `src/app/(patient)/index.tsx`) |
| 4     | Services catalog                                                |
| 5     | Service detail / choose a doctor                                |
| 6     | Book appointment (doctor, date, time, summary)                  |
| 7     | My Appointments                                                 |
| 8     | Check In                                                        |
| 9     | Live Queue                                                      |
| 10    | Staff application overview                                      |

## Visual principles

- **Warm consumer health, not a dashboard.** Content flows as a story (who you are, what's next, where you are in line, what you can do), not as a grid of widgets.
- **White first.** The page is white; warmth comes from cream and peach surfaces and from orange marks, not from orange areas.
- **Orange marks, it doesn't fill.** Orange is for icons, eyebrow labels, links, status-pill text, the wordmark and exactly one filled CTA.
- **Few, generous blocks.** One hero card, one compact status card, one light row of shortcuts, one CTA, one secondary card.

## Palette usage

| Role                 | Token                                                    | Where                                              |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Page                 | `background` (white)                                     | Every screen                                       |
| Hero surface         | `surface-secondary` (cream) + `brand-subtle` circles     | The lead card (next appointment, check-in summary) |
| Cards                | `surface` (white) + `border` hairline + `shadow-surface` | Queue, visit, list rows                            |
| Icon tiles, pills    | `brand-subtle` (peach)                                   | Service tiles, card icons, "Today", "Directions"   |
| CTA fill, active tab | `accent` (AA orange, 4.8:1 with white)                   | One filled CTA per screen                          |
| Icons, wordmark      | `brand-vivid` (vivid orange)                             | Never small text                                   |
| Small orange text    | `brand-text`                                             | Eyebrows, "View all", pill labels                  |
| Ink                  | `foreground` (navy charcoal)                             | Titles and primary text                            |
| Secondary text       | `muted`                                                  | Roles, subtitles, metadata                         |
| Success              | `success`                                                | Only real positive states ("Checked In", "Active") |

## Typography hierarchy

Bold geometric sans; navy ink. Weights carry hierarchy more than size.

| Level                                               | Role                               | Size |
| --------------------------------------------------- | ---------------------------------- | ---- |
| Wordmark                                            | `headline` (bold)                  | 24   |
| Greeting, hero card title                           | `cardTitle` (bold)                 | 20   |
| Section title, card headline ("You're #14 in line") | `sectionTitle` (bold)              | 18   |
| Body and detail rows                                | `body` (medium for primary values) | 16   |
| Eyebrow                                             | `eyebrow` (semibold, `brand-text`) | 14   |
| Metadata, tile labels                               | `supporting`                       | 14   |

## Spacing rhythm

- Screen gutter 16.
- 16 between major sections; 10 between cards in a group; 12 from a section title to its content.
- Hero about 165–175dp tall; queue card about 84dp; CTA 48dp; visit row about 74dp.

## Radius

- Cards: 18 (`rounded-3xl`). Icon tiles and thumbnails: 12 (`rounded-2xl`).
- Primary CTA: 18 rounded rectangle, **not a pill**.
- Status pills, chips, avatars: full.

## Surfaces and cards

- White cards have a warm 1px hairline (`border-border`) **and** a soft diffuse shadow (`shadow-surface`). Neither is heavy.
- The hero uses a cream surface with large, soft peach circles behind the portrait instead of a gradient.
- No nested cards; information inside cards uses icon rows, not boxes.

## Buttons

- One filled orange CTA per screen: full width, about 60 tall, leading icon, centred bold label, trailing chevron (`PrimaryButton`).
- Secondary actions are text links in `brand-text` with a chevron, or outlined/peach pills.
- CTAs use a left-to-right orange gradient (`cta-from` → `cta-to`), darker than the mockup so the white label meets AA, with a soft orange glow.

## Icons

- Outline icons (MaterialCommunityIcons), orange, 20 in rows and 24–28 in tiles.
- Icon + text rows ("person icon / Dr. Njeri / Consultant Oncologist") replace labels and dividers.
- Service icons sit in 64px peach tiles; card icons in 48px tiles (`IconTile`).

## Imagery

- References use doctor, patient and hospital photos. We own none of these yet, so we use placeholders: initials avatars and icon tiles in the same positions and sizes, so real images can drop in later.
- Portraits sit bottom-right of the hero, overlapping soft circles; they are decorative, not content.

## Home hierarchy

1. Brand row (logo, bell, avatar) and greeting with a warm one-line subtitle.
2. **Next appointment hero:** the strongest element.
3. Live queue: a single compact row with a "people ahead" tile.
4. Book a Service: a light row of icon tiles, then the full-width orange CTA.
5. Today's Visit: a quiet white row with a Directions pill.
6. Native tab bar: Home, Appointments, Queue, Profile; orange active state.

## Avoid

- Dense grids of bordered tiles; analytics-style number boxes.
- Filling large areas with orange, or orange small text (use `brand-text`).
- Pill-shaped primary buttons, heavy shadows, gradients.
- More than one filled CTA per screen.
- Embedding the reference images, or remote image URLs.
- Per-service tints other than Oncology's pink.
