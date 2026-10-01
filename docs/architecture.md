# Architecture

AfyaQueue is an Expo (React Native) app for **iOS and Android**. Web is not a target (`platforms` in `app.json`).

## Layout

```
src/
  app/                  Expo Router routes ONLY (every file is a route)
    _layout.tsx         Providers + root Stack
    (auth)/             /login, /register        (Stack)
    (patient)/          /, /appointments, /queue, /profile   (NativeTabs)
    staff/              /staff, /staff/queue, /staff/patients,
                        /staff/services, /staff/settings      (NativeTabs)
  features/<domain>/    Domain + data logic per area (created on first use)
  components/
    ui/                 AfyaQueue primitives composed from HeroUI Native
    shared/             App-level composites used by several features
  design-system/        Tokens and theme hooks (see design-system.md)
  hooks/                Cross-feature hooks
  lib/                  Thin adapters for platform/third-party APIs
  types/                Ambient/global type declarations
  utils/                Pure helpers with colocated tests
  global.css            Theme values (colors, shadows, radius base)
assets/                 Images and fonts
docs/                   Engineering and product docs
GLOSSARY.md             Domain language
```

Folders are created when their first file arrives, not ahead of time.

## Rules

1. **Routes are thin.** A route file reads params, picks a screen body or feature component, and renders it. No business rules, data fetching or derived state in `src/app/`.
2. **Business logic lives in `src/features/<domain>/`.** Expected domains: `auth`, `users`, `doctors`, `services`, `visits`, `appointments`, `queues`, matching [GLOSSARY.md](../GLOSSARY.md).
3. **Features depend inward.** A feature may import from `design-system`, `components`, `lib`, `utils` and other features' public `index.ts`. Never from `src/app/`.
4. **Use HeroUI Native first.** `components/ui/` only wraps or composes HeroUI components when AfyaQueue needs a reusable variant. It does not re-implement primitives.
5. **No color literals outside `global.css`.** ESLint enforces this for `src/`.

## Why `staff/` is a URL segment

Route groups do not change the URL, so `(patient)/queue` and `(staff)/queue` would both resolve to `/queue`. Staff routes therefore live under a real `staff/` segment. See [ADR 0001](./adr/0001-staff-routes-under-url-segment.md).

## Server boundary (backend not chosen)

The backend, API style and auth provider are undecided. To stay decoupled:

- Each feature defines a **repository interface** in its own vocabulary, for example `AppointmentRepository` with `book`, `cancel`, `listForPatient`. Interfaces use domain types, never transport or ORM types.
- A concrete implementation (HTTP, a BaaS SDK, or an in-memory fake for development) is provided at the app root and injected via context. Screens and feature hooks depend only on the interface.
- Nothing in `src/` may import a backend SDK except its adapter in `src/lib/` or the repository implementation.

No interfaces or fakes exist yet. They are written alongside the first feature that needs data, so they are shaped by a real use case.

## Mobile conventions

- **Safe areas:** expo-router provides `SafeAreaProvider`. Screens use `contentInsetAdjustmentBehavior="automatic"` on scroll views, or `useSafeAreaInsets()` for custom chrome.
- **Keyboard:** forms use `KeyboardAvoidingView` (`behavior="padding"` on iOS) or scroll-to-input. Revisit `react-native-keyboard-controller` only if a form needs it (development build required).
- **Touch targets:** at least 48×48 (`layout.minTouchTarget`). HeroUI Button `md` meets it; `sm` needs `hitSlop`.
- **Accessibility:** every interactive element has a role and label. Status is never conveyed by color alone. Text scales with system font size; never disable font scaling.
- **Android back:** native stacks handle the hardware back and predictive-back gestures. Do not intercept back except to confirm discarding unsaved input. `predictiveBackGestureEnabled` is currently `false` (template default) and should be revisited.
- **Platform differences:** `Platform.select` for small differences; `.ios.tsx` / `.android.tsx` files for larger ones.
