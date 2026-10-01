# Theme colors are defined only in `global.css`

HeroUI Native and Uniwind read colors from CSS variables, and the values differ between light and dark themes. Mirroring them in `src/design-system/colors.ts` would create two sources of truth that drift. So all color and shadow values live in `src/global.css`. The TypeScript design system exposes typed hooks (`useThemeColor`, `useBrandColor`) that read those variables at runtime, and ESLint rejects hex literals in `src/`.
