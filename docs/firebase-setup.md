# Firebase setup

AfyaQueue uses the **Firebase JavaScript SDK** (works in Expo Go; no native modules). Until the steps below are done, the app runs on in-memory mocks (`src/lib/backend.ts`).

## 1. Create the project

1. [Firebase Console](https://console.firebase.google.com) → **Add project** → name it (e.g. `afyaqueue`). Google Analytics is optional (not used).

## 2. Register a Web app

1. Project overview → **Add app** → **Web** (`</>`). Nickname `AfyaQueue mobile`. Don't enable Hosting.
2. Copy the `firebaseConfig` values shown.

> Use the **Web** app even for iOS/Android: the JS SDK is a web SDK.

## 3. Enable Email/Password sign-in

**Build → Authentication → Get started → Sign-in method → Email/Password → Enable** (leave "Email link" off) → Save.

## 4. Create Firestore

**Build → Firestore Database → Create database** → choose a location close to users (e.g. `europe-west` or `africa-south1` if offered) → **Start in production mode**.

## 5. Add the environment values

```bash
cp .env.example .env
```

Fill `.env` from step 2 (`apiKey` → `EXPO_PUBLIC_FIREBASE_API_KEY`, and so on). Then restart Expo so the values are inlined:

```bash
npx expo start --clear
```

`.env` is git-ignored. The app switches to Firebase automatically when all six values are set.

## 6. Deploy security rules and indexes

Either paste [`firestore.rules`](../firestore.rules) into **Firestore → Rules → Publish**, and create the indexes from [`firestore.indexes.json`](../firestore.indexes.json) under **Firestore → Indexes**, or use the CLI:

```bash
npx firebase-tools login
npx firebase-tools use --add          # pick the project
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

The `services (active, sortOrder)` index is required for the catalog; it takes a minute or two to build. Test rules in **Firestore → Rules → Rules Playground** (e.g. an unauthenticated `get` on `/services/dental` must be denied).

## 7. Create an admin and seed services

1. Save a service-account key as `firebase/service-account.json` (see [Admin scripts](#admin-scripts-local-only)).
2. Seed the catalog from [`firebase/seed/services.json`](../firebase/seed/services.json):

```bash
node scripts/seed-services.mjs
```

It writes the six services under fixed IDs, so running it again leaves exactly six documents. It lists any extra documents but never deletes them.

Seed doctors and their service links the same way:

```bash
node scripts/seed-doctors.mjs
```

It writes 13 doctors and 14 doctor–service links under fixed IDs (keeping `createdAt` from the first run) and checks every link points to a seeded doctor and service.

If bookings were made before slot locks existed, add their locks once (safe to re-run):

```bash
node scripts/backfill-slot-locks.mjs
```

And copy patient display names onto older appointments and queue entries (used by staff screens):

```bash
node scripts/backfill-patient-names.mjs
```

3. Register an account in the app, then make it admin:

```bash
node scripts/promote-user.mjs you@example.com
```

4. Reopen **Services** in the app: the list now comes from Firestore.

## Hospitals and memberships

All data belongs to a hospital (`firebase/seed/hospitals.json`; the default is `afyacare-hospital`). To move older single-hospital data in (safe to re-run):

```bash
node scripts/backfill-hospitals.mjs
```

**In the app (normal way):** staff Settings → Hospital Admin → Team → _Invite member_ (staff/admin), or Doctors → a doctor → _Invite account_. The person registers or signs in with that email, verifies it via Firebase's link, and accepts. Their workspace opens automatically.

**Developer / recovery tooling only** (for example, the very first admin of a new hospital, or fixing access when no admin can sign in):

```bash
node scripts/set-membership.mjs nurse@example.com afyacare-hospital staff
node scripts/set-membership.mjs dr@example.com afyacare-hospital doctor samuel-okoye
node scripts/set-membership.mjs boss@example.com afyacare-hospital admin
node scripts/set-membership.mjs someone@example.com afyacare-hospital none   # deactivate
```

The doctor role links the account to that doctor record. After that, a hospital admin can manage most things in the app (staff Settings → Hospital admin): roles, deactivation, doctor logins, doctors, services, weekly hours, time off, hospital details and the audit log. The script is still needed to **add** a person to a hospital. At sign-in, members go to their workspace (staff/admin → staff app, doctor → doctor app); everyone else uses the patient app at their chosen hospital.

## Admin scripts (local only)

`scripts/seed-services.mjs` and `scripts/promote-user.mjs` use the Firebase Admin SDK, which bypasses security rules. They run only on your machine; the app never uses `firebase-admin`. Both read the key the same way (`scripts/lib/admin.mjs`) and refuse keys for any project other than `afyaqueue-6c149`.

1. **Firebase Console → Project settings → Service accounts → Generate new private key → Generate key.**
2. Save the downloaded file as `firebase/service-account.json` (git-ignored). Treat it like a password: it grants full access to the project. Don't share, paste or commit it.
3. Optional: point elsewhere with `FIREBASE_ADMIN_SERVICE_ACCOUNT=./path/to/key.json` in `.env`.
4. Promote a user (they must already exist; register in the app first):

```bash
node scripts/promote-user.mjs you@example.com            # admin
node scripts/promote-user.mjs nurse@example.com staff     # staff app
node scripts/promote-user.mjs someone@example.com patient # back to patient
```

It prints the uid, email and old → new role. The role decides the app area at sign-in: `patient` → patient app, `staff`/`admin` → staff app; any other value shows a safe "no access" screen. Existing profile fields are kept; a missing profile is created. It refuses keys for any project other than `afyaqueue-6c149`.

Create a ready-to-use account (sign-in plus profile) without the app, or reset a forgotten password without a reset email:

```bash
node scripts/create-user.mjs you@example.com --name "Full Name" [--phone 0712345678] [--admin]
node scripts/set-password.mjs you@example.com
```

Both prompt for the password without showing it, so it never lands in your shell history.

## Check it works

- Register → you land on Home; a `users/{uid}` document exists with `role: "patient"`.
- Close and reopen Expo Go → you stay signed in (session restored).
- Profile → Log out → Welcome. Sign in again with the same email/password.
- Services shows the six seeded services; edit a `name` in the console and reload the app to see it change.
