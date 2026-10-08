# Firestore data model

Proposed schema for AfyaQueue on Cloud Firestore. Domain terms follow [GLOSSARY.md](../GLOSSARY.md); rule numbers refer to [business-rules.md](./business-rules.md). Rules: [`firestore.rules`](../firestore.rules). Indexes: [`firestore.indexes.json`](../firestore.indexes.json).

**Migrated so far:** `users` (profile shown on Home and Profile), `services`, `doctors` + `doctorServices` (doctor choice, booking validation) and `appointments` (booking, My Appointments, Home's next appointment, cancellation). Availability is computed on the device from the clinic template and doctor slot locks. Check-in creates real `queueEntries` and numbers from `queues` counters. Booking and check-in integrity is enforced by Firestore rules (no Cloud Functions; the project is on the Spark plan, see [ADR 0004](./adr/0004-rules-enforced-booking-on-spark.md)). The rest is documented here so later slices follow one plan.

## Multi-hospital model

Every operational record carries **`hospitalId`**: services, doctors, doctorServices, doctorSchedules, doctorAbsences, appointments, queues, queueEntries, doctorSlots and patientSlots. Document IDs stay globally unique (readable slugs or auto IDs). Every query filters on `hospitalId`, and the rules require it.

### hospitals/{hospitalId}

| Field                    | Type      | Notes                                  |
| ------------------------ | --------- | -------------------------------------- |
| `name`, `shortName`      | string    |                                        |
| `location`               | string?   | Free text                              |
| `timeZone`               | string    | e.g. `Africa/Nairobi` (schedule times) |
| `active`                 | bool      | Patients only see active hospitals     |
| `phone`                  | string?   | Main line; patient "Call hospital"     |
| `supportPhone`           | string?   |                                        |
| `emergencyPhone`         | string?   | Optional                               |
| `email`                  | string?   |                                        |
| `createdAt`, `updatedAt` | Timestamp |                                        |

Contact fields are edited by that hospital's admins (Admin → Hospital) and shown on the patient Contact tab, live. Empty means "not provided": the app hides it and never invents one; "Call hospital" is disabled without `phone`. Rules check the format (phone: `^[+0-9 ()-]{0,20}$`, email: simple `a@b.c`).

### hospitalMembers/{hospitalId}_{uid}

Staff, doctor and admin access, per hospital. Written only by `scripts/set-membership.mjs`; the user can read their own.

| Field                    | Type           | Notes                                                                                |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------ |
| `hospitalId`, `userId`   | string         |                                                                                      |
| `role`                   | string         | `staff` · `doctor` · `admin`                                                         |
| `doctorId`               | string \| null | Doctors: the doctor record this account works as                                     |
| `displayName`, `email`   | string         | Copied in by the script, shown on the admin Team screen (admins don't read profiles) |
| `active`                 | bool           | Deactivate instead of deleting                                                       |
| `createdAt`, `updatedAt` | Timestamp      |                                                                                      |

Memberships are created by **accepting an invitation** (below). Hospital admins can change another member's role (staff ↔ admin), (de)activate them, and unlink a doctor login, all from the app. They can't edit their own membership, so a hospital always keeps an admin. `scripts/set-membership.mjs` remains developer/recovery tooling only. A user may belong to several hospitals. At sign-in: one membership opens its workspace; several show a chooser (remembered on the device).

### hospitalInvites/{hospitalId}_{email}

How people join a hospital's workspace, without terminal tools. The email is trimmed and lower-cased, and the ID is unique per hospital and email.

| Field                                 | Type           | Notes                                                                               |
| ------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `hospitalId`, `email`                 | string         | Must match the ID                                                                   |
| `role`                                | string         | `staff` · `doctor` · `admin`                                                        |
| `doctorId`, `doctorName`              | string \| null | Doctor invites: an _unlinked_ doctor record of the same hospital (name for display) |
| `status`                              | string         | `pending` · `accepted` (terminal) · `revoked`                                       |
| `createdBy`, `createdAt`, `updatedAt` |                | Admin uid and times                                                                 |
| `acceptedAt`, `acceptedBy`            |                | Set when claimed                                                                    |

- **Admins** of that hospital create, revoke and re-issue invitations (role and doctor may change until accepted). Nobody deletes them.
- **Claiming:** the person signs in with that email, and it must be **verified**. Firebase Auth sends the verification link, so no Cloud Functions are needed. One batch then:
  1. marks the invite `accepted`,
  2. creates `hospitalMembers/{hospitalId}_{uid}` with exactly the invite's role and doctor,
  3. for doctors, sets `doctors/{id}.userId`.

  Rules check every part, so the claimer can't change the role, hospital or doctor. Another email, another hospital's user, or a patient without an invite can't create memberships. A doctor can't claim a different doctor's record.

- **Visibility:** recipients can see their pending invite before verifying, so the app can ask them to verify.
- **No email is sent for the invitation itself.** The admin tells the person, who then registers or signs in.

### Identity, workspaces and hospital context

- **Identity:** `users/{uid}` is the person. `users.role` is no longer used for access.
- **Workspaces:** every account has **Patient mode**, plus one professional workspace per active `hospitalMembers` doc (Staff, Doctor or Admin at a given hospital).
- **Saved workspace:** the app remembers the last one on the device as `patient` or `{role}:{hospitalId}`, and restores it only while it's still valid. A deactivated membership falls back to the picker. With several options and none saved, the user chooses.
- **Patient hospital:** Patient mode's hospital is a device preference (`patient-hospital:{uid}`, plus a short recent list), not a membership. It scopes services, doctors, booking, Home and the Live Queue. My Appointments shows every hospital, and each appointment uses its own `hospitalId` for its catalog, check-in and cancellation.
- **Switching** never writes roles or memberships. It only changes which valid context the app queries.
- **What rules evaluate:** the _account's_ memberships, not the app's current mode. So a doctor at A and B can read both hospitals' doctor data, and the app scopes each workspace to one hospital and doctor record. Patient-mode writes are ordinary patient writes. A membership never lets someone book or check in for another patient, and patients at a hospital get no staff, doctor or admin powers there.

### hospitalPatients/{hospitalId}_{uid}

An _interaction_ link ("this account has used this hospital as a patient"), created when they pick it in Patient mode. It isn't a permanent affiliation, and switching hospitals is never blocked. Rules use it so patients read a hospital's catalog, queue progress and schedules, and book there, only at hospitals they've chosen. Fields: `hospitalId`, `userId`, `createdAt`.

### doctorSchedules/{doctorId_dayOfWeek_start}

Recurring weekly windows, in the hospital's local time. There can be several per day, and no weekday is special.

| Field                    | Type   | Notes                     |
| ------------------------ | ------ | ------------------------- |
| `hospitalId`, `doctorId` | string |                           |
| `dayOfWeek`              | number | 0 = Sunday … 6 = Saturday |
| `startTime`, `endTime`   | string | `"08:00"`, `"12:00"`      |
| `active`                 | bool   |                           |

Seeded from `firebase/seed/doctor-schedules.json` by `scripts/seed-doctors.mjs`. Hospital admins write; members and the hospital's patients read.

### doctorAbsences/{auto-id}

| Field                    | Type      | Notes                                 |
| ------------------------ | --------- | ------------------------------------- |
| `hospitalId`, `doctorId` | string    |                                       |
| `startAt`, `endAt`       | Timestamp | Whole days in the app for now         |
| `kind`                   | string    | `leave` · `unavailable` · `temporary` |
| `createdBy`              | string    | uid                                   |
| `createdAt`              | Timestamp |                                       |

No free-text reason: the hospital's patients read absences, so booking can hide those days. Doctors add and remove their own _future_ absences; hospital admins can manage any. Index **(hospitalId, endAt)** and **(hospitalId, doctorId, endAt)**.

### Doctor accounts

`auth.uid` → `hospitalMembers/{hospitalId}_{uid}` (role `doctor`, `doctorId`) → `doctors/{doctorId}`. The doctor record also stores `userId` (or null when no login exists). Doctors read only appointments and queue entries whose `doctorId` is theirs. Queue entries carry `doctorId`, copied from the appointment at check-in. Index **(hospitalId, doctorId, checkedInAt)**.

### Booking availability

Booking offers times as follows:

- **A specific doctor:** inside their weekly windows, not during an absence, and not in a locked block.
- **Any Available Doctor:** times when at least one doctor linked to the service is scheduled and present. The appointment still has no doctor assigned.

Locks are enforced by rules. **Schedules and absences are not**: rules can't query them, so a client could still book outside a doctor's hours. Trusted code would need to check that.

Conventions:

- Top-level collections, documents referenced by ID string fields (`serviceId`, `patientId`); no nested subcollections, so staff can query across patients.
- `patientId` is always the Firebase Auth `uid`.
- Times are Firestore `Timestamp`s. `date` fields that represent a hospital day are `"YYYY-MM-DD"` strings in the hospital's time zone, so "today's queue" is an equality query.
- Every document has `createdAt` / `updatedAt` (server timestamps).

## users/{uid}

The account profile. Created by the app at registration.

| Field                  | Type    | Notes                                                   |
| ---------------------- | ------- | ------------------------------------------------------- |
| `fullName`             | string  |                                                         |
| `phone`                | string  | As entered                                              |
| `email`                | string  | Mirrors Firebase Auth                                   |
| `role`                 | string  | `patient` · `staff` · `admin`. Patients can't change it |
| `language`             | string? | Preference (later)                                      |
| `notificationsEnabled` | bool?   | Preference (later)                                      |
| `patientNumber`        | string? | Hospital-issued patient ID, set by staff (later)        |

Read by the user themselves and by admins only. **Staff don't read profiles**: the display name they need is copied onto appointments and queue entries as `patientName` (see below).

## services/{serviceId}

The bookable catalog. IDs are readable slugs (`general-care`, `oncology`), the same as the mock IDs.

| Field             | Type     | Notes                                  |
| ----------------- | -------- | -------------------------------------- |
| `name`            | string   |                                        |
| `shortName`       | string?  | Compact label (Home shortcuts)         |
| `description`     | string   |                                        |
| `category`        | string   | `primary` · `specialty` · `diagnostic` |
| `icon`            | string   | MaterialCommunityIcons name            |
| `tint`            | string?  | `pink` (Oncology only)                 |
| `providerTitle`   | string   | "Oncologist"                           |
| `durationMinutes` | number   | Default slot length                    |
| `modes`           | string[] | `in-clinic`, `online`                  |
| `active`          | bool     | Hidden from patients when false        |
| `sortOrder`       | number   | Display order                          |

Query: `where active == true, orderBy sortOrder` → composite index **(active, sortOrder)**.

## doctors/{doctorId} _(implemented)_

Seeded from [`firebase/seed/doctors.json`](../firebase/seed/doctors.json) by `node scripts/seed-doctors.mjs`. IDs are readable slugs (`samuel-okoye`).

| Field                    | Type      | Notes                                        |
| ------------------------ | --------- | -------------------------------------------- |
| `name`                   | string    | "Dr. Samuel Okoye"                           |
| `specialty`              | string    | Shown under the name ("Dental Surgeon")      |
| `hospital`               | string    | Facility shown on cards and Today's Visit    |
| `initials`               | string?   | Avatar fallback; derived from name if absent |
| `rating`, `reviewCount`  | number    | Display only                                 |
| `active`                 | bool      | Inactive doctors are hidden and not bookable |
| `sortOrder`              | number    | Display order                                |
| `createdAt`, `updatedAt` | Timestamp |                                              |

Service details are not copied into doctor documents.

## doctorServices/{doctorId_serviceId} _(implemented)_

Many-to-many link (rules 4–5), seeded from [`firebase/seed/doctor-services.json`](../firebase/seed/doctor-services.json). The ID `"{doctorId}_{serviceId}"` prevents duplicates and lets rules check a link directly.

| Field       | Type   |
| ----------- | ------ |
| `doctorId`  | string |
| `serviceId` | string |
| `active`    | bool   |

Queries (patients): `doctors where active == true` and `doctorServices where active == true` (single-field indexes; the app joins them). Rules only return active documents, so both queries must filter on `active`.

## visits/{visitId}

One patient's attendance at the hospital on one day; groups that day's appointments (rule 6).

The visit ID is deterministic: `"{patientId}_{YYYY-MM-DD}"`. Appointments carry it, so they group without a visit document. Visit documents (status, arrival) will be written by trusted code once check-in exists; patients never write them.

| Field       | Type   | Notes                              |
| ----------- | ------ | ---------------------------------- |
| `patientId` | string |                                    |
| `date`      | string | `YYYY-MM-DD`                       |
| `status`    | string | `planned` · `active` · `completed` |

## appointments/{appointmentId} _(implemented)_

A reservation. **Booking never creates a queue entry** (rule 9). Auto-generated IDs.

| Field                              | Type           | Written by | Notes                                                        |
| ---------------------------------- | -------------- | ---------- | ------------------------------------------------------------ |
| `patientId`                        | string         | patient    | Must equal the signed-in uid                                 |
| `visitId`                          | string         | patient    | `"{patientId}_{date}"`                                       |
| `serviceId`                        | string         | patient    | Must be an active service                                    |
| `doctorId`                         | string \| null | patient    | **null = Any Available Doctor** (rules 2–3)                  |
| `scheduledAt`                      | Timestamp      | patient    | Must be in the future                                        |
| `date`                             | string         | patient    | `YYYY-MM-DD` of `scheduledAt` (device-local day)             |
| `durationMinutes`                  | number         | patient    | Must equal the service's `durationMinutes`                   |
| `visitType`                        | string         | patient    | `in-clinic` · `online`; must be one of the service's `modes` |
| `status`                           | string         | see below  | Created as `booked`                                          |
| `createdAt`                        | Timestamp      | patient    | Server time                                                  |
| `updatedAt`                        | Timestamp      | patient    | Server time                                                  |
| `cancelledAt`                      | Timestamp?     | patient    | Set when the patient cancels                                 |
| `assignedDoctorId`                 | string?        | staff      | When "any" is resolved (later)                               |
| `checkedInAt`, `scheduledPriority` |                | system     | At check-in (later)                                          |

Statuses: `booked` · `checked-in` · `waiting` · `delayed` · `completed` · `cancelled`. Patients may only create `booked` and change `booked → cancelled`; every other transition is staff/system (rules 14–15). `delayed` means hospital-caused delay only; lateness is `scheduledPriority: false`, never a status (rule 12).

Queries: a patient's appointments by time, live (`where patientId == uid, orderBy scheduledAt`) → **(patientId, scheduledAt)**. Doctor schedule → **(doctorId, scheduledAt)** (staff, later).

**Availability.** The app offers the clinic's slot template (Sundays closed, nothing within the next hour), minus the patient's own open appointments and, for a specific doctor, any slot touching one of that doctor's locked blocks. Patients still can't read other patients' appointments.

**Booking is written as one batch:** the appointment, a patient lock and (for a specific doctor) one doctor lock per 15-minute block. Rules reject an appointment without its locks, a lock without a brand-new appointment by the same patient, and any lock that already exists. So double-booking fails atomically, even under concurrency. Cancelling must delete the same locks in the same batch.

## doctorSlots/{doctorId_blockStartMillis} and patientSlots/{patientId_startMillis} _(implemented)_

Slot locks. Create-only (never updated), deleted only when their appointment is cancelled in the same batch.

| Field                    | Type      | Notes                                                    |
| ------------------------ | --------- | -------------------------------------------------------- |
| `doctorId` / `patientId` | string    | Owner of the lock (part of the ID)                       |
| `startAt`                | Timestamp | Start of the 15-minute block (part of the ID, as millis) |
| `appointmentId`          | string    | The appointment holding it                               |

- `doctorSlots` is readable by any signed-in user: it shows busy times only, never who booked.
- `patientSlots` is readable only by its owner.
- Index **(doctorId, startAt)** for the availability preview.
- `scripts/backfill-slot-locks.mjs` adds locks for bookings made before locks existed.

## queues/{serviceId_date} _(implemented: created at first check-in)_

One queue per service per day (rule 17). Document ID `"{serviceId}_{YYYY-MM-DD}"`.

| Field                     | Type      | Written by     | Notes                                              |
| ------------------------- | --------- | -------------- | -------------------------------------------------- |
| `serviceId`, `date`       | string    | first check-in | Must match the ID                                  |
| `lastNumber`              | number    | each check-in  | Counter; +1 exactly, only with the entry taking it |
| `lastEntryId`             | string    | each check-in  | The entry that took `lastNumber`                   |
| `nowServing`              | number    | staff (later)  | Starts at 0; patients can't change it              |
| `status`                  | string    | staff (later)  | `open` · `paused` · `closed`                       |
| `estimatedServiceMinutes` | number    | first check-in | The service duration; used for the wait estimate   |
| `delay`                   | map?      | staff (later)  | Hospital-caused delay (rule 12)                    |
| `createdAt`, `updatedAt`  | Timestamp |                |                                                    |

## queueEntries/{appointmentId} _(implemented)_

A patient's place in a queue, **created at check-in only** (rule 9). The ID is the appointment ID, so an appointment can have one entry, ever.

| Field               | Type      | Notes                                                                                                                                                                                           |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queueId`           | string    | `"{serviceId}_{date}"` of the appointment                                                                                                                                                       |
| `appointmentId`     | string    | Same as the document ID                                                                                                                                                                         |
| `visitId`           | string    | From the appointment                                                                                                                                                                            |
| `patientId`         | string    |                                                                                                                                                                                                 |
| `queueNumber`       | number    | `queues.lastNumber` after this check-in; the patient can't choose it                                                                                                                            |
| `status`            | string    | `waiting` at check-in; then `called` · `held` · `in-service` · `completed` · `no-show` by staff or the assigned doctor (`on-hold` = busy in another service, `delayed` = clinic late: reserved) |
| `scheduledPriority` | bool      | Server time ≤ `scheduledAt` (rules 10–11)                                                                                                                                                       |
| `checkedInAt`       | Timestamp | Server time                                                                                                                                                                                     |

**Check-in is one transaction:**

1. The appointment moves from `booked` to `checked-in`. `checkedInAt` and `scheduledPriority` come from server time.
2. The queue counter goes up by one, or the queue is created with 1.
3. The entry is created with exactly that number and status `waiting`.

Rules check all three together and allow check-in only within 24 hours of the appointment; the app limits it to the same day. Late check-in keeps the patient's number but sets `scheduledPriority: false` and never marks lateness as a status (rule 12).

**Queue operations.** Staff (and admins) can operate their hospital's entries. A doctor can operate only entries assigned to them; "Any available doctor" entries stay with staff until doctor claiming exists. Every rule is enforced in `firestore.rules`:

| Action           | Transition             | Notes                                                                                                                                                                                                          |
| ---------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Call / Call Next | waiting → called       | Also moves the queue (`nowServing`, `currentEntryId`, `callVersion` +1). Call Next picks the next waiting entry in operational order. Concurrency-safe: two people tapping at once call two different patients |
| Call Again       | called → called        | `callCount` +1 and `lastCalled*` only. Same number, no new entry                                                                                                                                               |
| Hold             | called → held          | Not there when called. Their number is kept and others are called meanwhile                                                                                                                                    |
| Resume           | held → waiting         | Rejoins _waiting_ in their original operational place (by scheduled or check-in time, not queue-jumping ahead of anyone already called). Then they're called again explicitly                                  |
| Start Service    | called → in-service    |                                                                                                                                                                                                                |
| Undo Start       | in-service → called    | Only within **2 minutes** of starting, as a correction for a mis-tap                                                                                                                                           |
| Complete         | in-service → completed | The appointment becomes `completed` in the same transaction. No undo                                                                                                                                           |
| No Show          | called → no-show       | Only after being called. Terminal; the appointment becomes `no-show` ("Missed"). The entry leaves the active queue                                                                                             |

Anything else is refused, including waiting → no-show, held → in-service, any move out of completed or no-show, and changing `queueNumber`, `hospitalId`, `patientId` or `doctorId`. All actions run in transactions. If two people act on the same entry at once, the later write is refused and re-read once: a second Call Again then also counts, and a conflicting action fails with "already changed".

### queueEntries/{id}/events/{n}: audit history

One document per action, written in the same transaction as the change. Its ID `n` is the entry's new `eventCount`, so events can't be skipped, inserted or forged on their own.

| Field          | Notes                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| `action`       | call · call-again · hold · resume · start · undo-start · complete · no-show |
| `from`, `to`   | Statuses before and after (checked against the entry)                       |
| `at`           | Server time                                                                 |
| `by`, `byRole` | uid and their hospital role (`staff` · `doctor` · `admin`)                  |

Admins read a hospital's whole history with a collection-group query (`events` where `hospitalId`, ordered by `at`; index **(hospitalId, at desc)**). This answers who called the patient and how many times, who held, resumed, started, undid, completed or no-showed them, and when. Staff and the assigned doctor can read it; patients can't.

Patients read their own entries and the queue documents. People ahead are shown as `queueNumber − nowServing − 1` (approximate) until staff ordering exists.

## Admin configuration (hospital admins, in the app at `/admin`)

| Data              | Admin can                                                                      | Never                           |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| `hospitals/{id}`  | Edit name, short name, location, time zone                                     | Change the id or `active`       |
| `hospitalMembers` | Role staff ↔ admin, (de)activate, link/unlink a doctor login                   | Create (script), edit their own |
| `services`        | Create, edit, activate/deactivate (duration 5–45 min, valid modes)             | Delete                          |
| `doctors`         | Create, edit, activate/deactivate, login link (must match a doctor membership) | Delete                          |
| `doctorServices`  | Assign/unassign (active), both ends in the same hospital                       | Delete                          |
| `doctorSchedules` | Replace weekly windows (valid times, doctor in the hospital)                   | Write another hospital's        |
| `doctorAbsences`  | Add/remove any doctor's (future)                                               | Edit                            |

All writes are hospital-scoped: an admin of A can't touch B. Staff, doctors and patients can't write any of these.

## What staff can read

| Data                                    | Staff            | Notes                                                                                              |
| --------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `users/{uid}`                           | own profile only | Admins can read profiles (role management)                                                         |
| `appointments`                          | yes              | Staff screens query only today's (`date == today`) and show name, time, service, doctor and status |
| `queueEntries`, `queues`                | yes              | Today's queues only, via `queueId in [...]`                                                        |
| `services`, `doctors`, `doctorServices` | read only        | Writing them is admin-only                                                                         |
| `doctorSlots`                           | busy times       | No patient details                                                                                 |
| `patientSlots`                          | no               | Owner only                                                                                         |

Staff screens never show email, date of birth or other appointments. The only contact detail is the **callback number** `patientPhone`, copied from the patient's profile onto the appointment at booking and onto the queue entry at check-in (rules require it to equal the profile's `phone`, so nobody can plant a different number). It is readable exactly where the appointment/entry is: the patient, staff/admins of that hospital, and the assigned doctor; never other doctors or other hospitals. A later profile change doesn't update existing bookings. `scripts/backfill-patient-names.mjs` and `scripts/backfill-patient-phones.mjs` (open visits only) fill these on older documents.

## notifications/{id} _(implemented)_

One user's in-app inbox. With no Cloud Functions, the person whose action causes the event writes the notification **in the same write** (batch or transaction), and rules tie it to that event. IDs are deterministic and documents create-only, so the same event can never produce two notifications.

| Field                                                              | Type      | Notes                                                                                                                                   |
| ------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`                                                           | string    | Recipient; only they can read it                                                                                                        |
| `hospitalId`                                                       | string    |                                                                                                                                         |
| `type`                                                             | string    | `appointment-booked`, `appointment-affected`, `queue-called`, `queue-called-again`, `queue-held`, `queue-resumed`, `patient-checked-in` |
| `title`, `body`                                                    | string    | Patient-facing wording (≤120 / ≤300 chars)                                                                                              |
| `read`                                                             | bool      | Created `false`; the owner may only set it to `true`                                                                                    |
| `createdAt`                                                        | Timestamp | Server time                                                                                                                             |
| `relatedAppointmentId`, `relatedQueueEntryId`, `relatedHospitalId` | string?   | For tap-to-open                                                                                                                         |

| ID                                     | Written by                            | Rule check                                                                                       |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `{entryId}_{n}`                        | staff/doctor performing queue event n | Event n exists (same write), was by them, its action maps to `type`, recipient = entry's patient |
| `{appointmentId}_booked`               | the patient, with the booking         | Their own appointment                                                                            |
| `{entryId}_checkin`                    | the patient, with check-in            | Recipient = the assigned doctor's account                                                        |
| `{appointmentId}_affected_{absenceId}` | doctor/admin adding time off          | They can operate that booked appointment; recipient = its patient                                |

Queue notifications are sent for Call, Call Again, Hold and Resume only. No delete. Index: `userId ASC, createdAt DESC`.

### Phone alerts (Expo Go)

- **Works now (local notifications, `expo-notifications`):** reminders 24 h and 1 h before each booked appointment (identifiers `appt-{id}-{24h|1h}-{startMillis}`; re-synced whenever appointments change, so cancelled, checked-in, completed or moved appointments lose their old reminders; cleared on sign-out or when turned off), and a phone alert for each new queue notification that arrives **while the app is running** (foreground or recently backgrounded). Profile → Preferences: _Appointment reminders_, _Queue alerts_ (stored on the device).
- **Not in Expo Go:** remote push, i.e. an alert when the app is fully closed. Expo Go (SDK 53+) removed remote push on Android, and the module logs a warning that it is "not fully supported in Expo Go".
- **True push later needs:** a development/production build (EAS), FCM credentials (Android) and an APNs key (iOS), saving each device's Expo push token (e.g. `users/{uid}/devices/{token}`), and **trusted code to send**. On Spark that means either Cloud Functions on the Blaze plan (an `onCreate` trigger on `notifications/{id}` calling the Expo Push API) or a separate small server. The in-app model above stays the same; push only becomes another delivery channel.

## callLogs/{auto-id} _(implemented)_

"Call patient" (staff, admin, assigned doctor) opens the phone's dialer with `tel:`. It is a phone call, not a queue action: queue status never changes. After the dialer opens, the app records the attempt. It does **not** prove the call connected.

| Field                         | Notes                                  |
| ----------------------------- | -------------------------------------- |
| `hospitalId`, `appointmentId` | Must match the appointment             |
| `queueEntryId`, `queueNumber` | `null` before check-in                 |
| `patientId`, `patientName`    | `patientId` must match the appointment |
| `actorId`, `actorRole`        | The caller and their membership role   |
| `at`                          | Server time                            |

Create: only someone who can operate that appointment (its hospital's staff/admins, or its assigned doctor), as themselves, with their real role. Read: that hospital's admins (Admin → Audit, "Phone call"). Patients and staff can't read it. No update/delete. Index: `hospitalId ASC, at DESC`.

## Still needs trusted server code (Cloud Functions on Blaze, or staff tools)

- **Any Available Doctor assignment and capacity:** no doctor lock is taken, so the number of "any" bookings per slot isn't limited. Assignment is deferred to staff until doctor schedules exist.
- **Real schedules:** working hours, leave and per-doctor templates. Today every doctor uses the clinic template.
- **Enforcing call order:** the staff app calls in priority order, but rules can't verify it was the next one.
- **Other staff operations:** hospital delays, pausing a queue, doctor claiming of "Any available doctor" patients.
- **Abuse limits:** for example a patient booking many slots. Spark has no server-side rate limiting.
- **Overlap of the same patient's appointments at different start times:** only the exact start time is locked (rule 7). The app also checks overlaps it can see.
