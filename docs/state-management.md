# State management

**Decision status:** no state library is installed. Backend: Firebase ([ADR 0003](./adr/0003-firebase-js-sdk-backend.md)). This document classifies AfyaQueue's state and records the recommended direction, to be confirmed when the backend and auth provider are chosen.

## Classification

| Kind                               | Examples in AfyaQueue                                                        | Lifetime                             | Source of truth                   |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ | --------------------------------- |
| **Local UI state**                 | Form inputs, selected date in a picker, sheet open/closed, segmented control | A component's lifetime               | The component                     |
| **Persisted client state**         | Onboarding completed, last-selected role, theme preference                   | Survives restarts                    | The device                        |
| **Authentication / session state** | Signed-in identity, role (Patient or Staff), access/refresh tokens           | Survives restarts; tokens are secret | Auth provider, mirrored on device |
| **Server state**                   | Services, Doctors, DoctorServices, Appointments, Visits, patient profile     | Cached copy of remote data           | Backend                           |
| **Real-time queue state**          | A Patient's QueueEntry position and state, the Staff view of a Queue         | Live; changes without user action    | Backend, pushed to the client     |

## Recommendations

**Local UI state:** `useState` / `useReducer`. Lift to the nearest shared parent; use React context only for genuinely subtree-wide UI state. No library.

**Persisted client state:** `src/lib/storage.ts`, a small wrapper over AsyncStorage (already required by Firebase Auth). First use: the theme preference.

**Authentication / session state:** `SessionProvider` (`src/features/auth/session.tsx`) exposes `{ status, user }` from an `AuthService`. Firebase Auth persists its session with `getReactNativePersistence(AsyncStorage)` (app-private storage; the JS SDK can't use `expo-secure-store` for this). Route protection uses `Stack.Protected` in `src/app/_layout.tsx`; staff role guards come with the staff UI.

**Server state:** a server-cache library is the expected fit (caching, deduplication, retries, background refetch, offline-tolerant UI). TanStack Query is the leading candidate. **Do not add it until the first real server read exists**, and re-evaluate if the chosen backend ships its own client cache. Screens never call the network directly; they call feature hooks, which call repository interfaces (see [architecture.md](./architecture.md)).

**Real-time queue state:** treat it as server state with a live transport. A queue subscription (WebSocket, SSE, or the backend's realtime channel) writes updates into the same server cache, so screens read one source. The transport depends on the backend choice. Push notifications for "you are next" or "you have been called" are a separate concern and need a development build.

## What not to do

- No global client store (Redux, Zustand, MobX) for data the server owns. Server data lives in the server cache.
- No duplicating queue state into component state "for convenience".
- No speculative library: each one above is added only when its first real use case arrives, and called out in the change that adds it.
