# AfyaQueue

Healthcare appointment and real-time queue app for iOS and Android. Expo SDK 57, Expo Router, TypeScript (strict), HeroUI Native, Uniwind.

Read first: `GLOSSARY.md` (domain language), `docs/business-rules.md`, `docs/architecture.md`, `docs/design-system.md`.

## Rules

- **Expo decisions:** use the installed Expo plugin skills (`expo-router`, `expo-native-ui`, `expo-design-system`, …). When unsure, check current official docs rather than memory.
- **UI:** use HeroUI Native components before building custom primitives. Fetch component docs via the `heroui-native` skill; never guess component names, props or variants.
- **Dependencies:** add Expo/native packages with `npx expo install <pkg>`. Never add a dependency silently: state what it is and why. Do not add state, backend or database libraries without agreement (see `docs/state-management.md`).
- **Routes are thin.** `src/app/` holds routes only. Business and domain logic lives in `src/features/<domain>/`.
- **Visual references:** the AfyaQueue references live in `assets/Design/`. Inspect them before implementing or significantly redesigning patient-facing UI (conclusions in `docs/design/reference-analysis.md`). Translate their visual language into components; never embed the screenshots themselves as UI.
- **Design tokens:** colors and shadows come from `src/global.css` (classes or `useThemeColor`/`useBrandColor`); spacing, radius, typography roles and motion come from `@/design-system`. No hex literals or ad-hoc spacing in screens.
- **TypeScript:** keep `strict` and the extra checks in `tsconfig.json`. No `any`, no `@ts-ignore`, no disabling lint rules to get green.
- **One screen at a time:** build and visually review one reference screen before propagating patterns to others.
- **Backend is Firebase (JS SDK, Expo Go compatible):** screens depend on feature interfaces/hooks, never on Firebase. See `docs/adr/0003-firebase-js-sdk-backend.md` and `docs/firebase-setup.md`.
- **Done means validated:** run `npm run check` (typecheck + lint + format) and, after dependency changes, `npm run doctor`.
- Do not commit unless asked.

## Agent skills

### Issue tracker

Issues and specs are local markdown files under `docs/work/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the root and ADRs in `docs/adr/`. See `docs/agents/domain.md`.
